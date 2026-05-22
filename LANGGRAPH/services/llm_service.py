import asyncio
import logging
import os
import time
from enum import Enum
from typing import Any, Dict, List, Optional, Type, TypeVar, Union
from pydantic import BaseModel, Field

from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from tenacity import retry, stop_after_attempt, wait_exponential

# Optional providers — imported lazily so missing installs don't crash startup
try:
    from langchain_together import ChatTogether
    _TOGETHER_AVAILABLE = True
except ImportError:
    _TOGETHER_AVAILABLE = False

try:
    from langchain_anthropic import ChatAnthropic
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    _ANTHROPIC_AVAILABLE = False

from langsmith import traceable
from LANGGRAPH.utils.normalization import harmonize_with_schema, repair_json_structure

logger = logging.getLogger(__name__)


T = TypeVar("T", bound=BaseModel)

class LLMProvider(str, Enum):
    GROQ      = "groq"
    OPENROUTER = "openrouter"
    GEMINI    = "gemini"
    CEREBRAS  = "cerebras"
    TOGETHER  = "together"   # Tier-1 primary (Together AI)
    CLAUDE    = "claude"     # Tier-2 recovery (Anthropic)

class ModelName(str, Enum):
    LLAMA_3_1_8B    = "llama-3.3-70b-versatile"   # Groq primary
    LLAMA_70B       = "llama-3.3-70b-versatile"
    MISTRAL_7B      = "cognitivecomputations/dolphin-mistral-24b-venice-edition:free"
    GEMMA_2_9B      = "openrouter/free"
    GEMINI_FLASH    = "gemini-flash-latest"
    PERPLEXITY      = "perplexity/llama-3.1-sonar-small-128k-online"
    CEREBRAS_LARGE  = "llama3.1-8b"               # Cerebras free-tier stable
    DEEPSEEK_R1     = "deepseek/deepseek-v4-flash:free"
    TOGETHER_LLAMA  = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"  # Together free tier
    CLAUDE_HAIKU    = "claude-haiku-4-5"           # Anthropic recovery model

from LANGGRAPH.models.state import LLMCallMetadata

class LLMResponse(BaseModel):
    content: Any
    raw_response: Any
    metadata: LLMCallMetadata

def log_retry(retry_state):
    LLMService.total_retries += 1
    logger.warning(
        f"Retrying LLM call: attempt {retry_state.attempt_number} due to: {retry_state.outcome.exception()}"
    )

class LLMService:
    """
    Unified Service for interacting with multiple LLM providers.
    Implements aggressive circuit breakers to handle rate limits and quotas.
    """
    MAX_FAILURES = 10
    LOCKOUT_DURATION = 300 # 5 minutes
    
    _failure_counts = {}
    _lockouts = {}
    _permanent_failures = set()  # Providers that hit 402 (credit exhaustion) - permanently disabled
    total_retries = 0

    @classmethod
    def reset_breakers(cls):
        cls._failure_counts = {}
        cls._lockouts = {}
        cls._permanent_failures = set()
        cls.total_retries = 0
        logger.info("Circuit breakers and retries reset.")

    def __init__(self, groq_api_key: str, openrouter_api_key: str,
                 gemini_api_key: str = "", cerebras_api_key: str = "",
                 together_api_key: str = "", anthropic_api_key: str = ""):
        self.groq_api_key       = groq_api_key
        self.openrouter_api_key = openrouter_api_key
        self.gemini_api_key     = gemini_api_key     or os.getenv("GEMINI_API_KEY",    "")
        self.cerebras_api_key   = cerebras_api_key   or os.getenv("CEREBRAS_API_KEY",  "")
        self.together_api_key   = together_api_key   or os.getenv("TOGETHER_API_KEY",  "")
        self.anthropic_api_key  = anthropic_api_key  or os.getenv("ANTHROPIC_API_KEY", "")
        # Circuit Breaker: Tracking 429 errors per model
        self.failed_models = {}              # model_id -> consecutive_failures
        self.cooldowns     = {}              # model_id -> float epoch timestamp
        self._failed_fingerprints = set()   # Store failed execution fingerprints
        self._openrouter_index = 0
        self._together_index = 0
        # Log provider availability at startup
        self._log_provider_availability()

    def _log_provider_availability(self):
        """Log which providers are configured at startup."""
        providers = {
            "Groq":      bool(self.groq_api_key),
            "Gemini":    bool(self.gemini_api_key),
            "Cerebras":  bool(self.cerebras_api_key),
            "Together":  bool(self.together_api_key) and _TOGETHER_AVAILABLE,
            "Claude":    bool(self.anthropic_api_key) and _ANTHROPIC_AVAILABLE,
            "OpenRouter":bool(self.openrouter_api_key),
        }
        for name, avail in providers.items():
            status = "✅ CONFIGURED" if avail else "⚠️  UNAVAILABLE"
            logger.info(f"  [PROVIDER] {name}: {status}")

    def is_provider_configured(self, provider: LLMProvider) -> bool:
        """Returns True if the provider has a valid API key and package installed."""
        if provider == LLMProvider.GROQ:
            return bool(self.groq_api_key)
        if provider == LLMProvider.GEMINI:
            return bool(self.gemini_api_key)
        if provider == LLMProvider.CEREBRAS:
            return bool(self.cerebras_api_key)
        if provider == LLMProvider.TOGETHER:
            return bool(self.together_api_key) and _TOGETHER_AVAILABLE
        if provider == LLMProvider.CLAUDE:
            return bool(self.anthropic_api_key) and _ANTHROPIC_AVAILABLE
        if provider == LLMProvider.OPENROUTER:
            from LANGGRAPH.config.settings import settings
            return bool(self.openrouter_api_key) and getattr(settings, 'ENABLE_OPENROUTER', True)
        return False


    async def check_models_health(self, configured_models: List[tuple]) -> None:
        """
        Verifies provider connectivity and endpoint availability at startup.
        Logs status and marks missing models as failed to trigger degraded execution safely.
        """
        logger.info("--- [MODEL HEALTH CHECK START] ---")
        for provider, model_name in configured_models:
            model_id = f"{provider.value}:{model_name.value}"
            try:
                llm = self._get_model(provider, model_name, max_tokens=10)
                # A lightweight test prompt
                await llm.ainvoke("Respond with OK")
                logger.info(f"✅ HEALTHY: {model_id} is active and responding.")
            except Exception as e:
                logger.error(f"❌ UNAVAILABLE: {model_id} failed health check. Error: {str(e)[:100]}")
                # Mark as failed to immediately enable degraded execution/circuit breaker
                self.failed_models[model_id] = 5
        logger.info("--- [MODEL HEALTH CHECK COMPLETE] ---")

    def _get_model(self, provider: LLMProvider, model_name: ModelName,
                   temperature: float = 0.0, max_tokens: int = 800):
        if provider == LLMProvider.GROQ:
            return ChatGroq(
                groq_api_key=self.groq_api_key,
                model_name=model_name.value,
                temperature=temperature,
                max_tokens=max_tokens
            )
        elif provider == LLMProvider.GEMINI:
            return ChatGoogleGenerativeAI(
                google_api_key=self.gemini_api_key,
                model=model_name.value,
                temperature=temperature,
                max_output_tokens=max_tokens if max_tokens else 800,
                top_p=0.1,
                max_retries=0
                # Note: candidate_count is 1 by default, and some libraries don't expose it directly in the Chat interface without kwargs, 
                # but we will enforce strict decoding via temperature and top_p.
            )
        elif provider == LLMProvider.CEREBRAS:
            return ChatOpenAI(
                api_key=self.cerebras_api_key,
                base_url="https://api.cerebras.ai/v1",
                model=model_name.value,
                temperature=temperature,
                max_tokens=max_tokens,
                max_retries=0
            )
        elif provider == LLMProvider.TOGETHER:
            if not _TOGETHER_AVAILABLE:
                raise ValueError("langchain-together not installed.")
            if not self.together_api_key:
                raise ValueError("TOGETHER_API_KEY not configured.")
            selected_model = model_name.value
            if selected_model == "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free":
                idx = getattr(self, "_together_index", 0)
                rotation = [
                    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
                    "Qwen/Qwen2.5-7B-Instruct-Turbo",
                    "mistralai/Mistral-7B-Instruct-v0.2"
                ]
                selected_model = rotation[idx % len(rotation)]
                self._together_index = idx + 1 # Rotate to next model on subsequent call
                logger.info(f"  [TOGETHER ROTATION] Selected model: {selected_model} (Rotation Index: {idx})")
            return ChatTogether(
                together_api_key=self.together_api_key,
                model=selected_model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        elif provider == LLMProvider.CLAUDE:
            if not _ANTHROPIC_AVAILABLE:
                raise ValueError("langchain-anthropic not installed.")
            if not self.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY not configured.")
            return ChatAnthropic(
                anthropic_api_key=self.anthropic_api_key,
                model_name=model_name.value,
                temperature=temperature,
                max_tokens=max_tokens,
                max_retries=0,
            )
        elif provider == LLMProvider.OPENROUTER:
            selected_model = model_name.value
            if selected_model == "deepseek/deepseek-v4-flash:free":
                idx = getattr(self, "_openrouter_index", 0)
                rotation = [
                    "deepseek/deepseek-chat",
                    "qwen/qwen-2.5-7b-instruct",
                    "mistralai/mistral-small",
                    "google/gemma-2-9b-it"
                ]
                selected_model = rotation[idx % len(rotation)]
                self._openrouter_index = idx + 1 # Rotate to next model on subsequent call
                logger.info(f"  [OPENROUTER ROTATION] Selected model: {selected_model} (Rotation Index: {idx})")

            return ChatOpenAI(
                api_key=self.openrouter_api_key,
                base_url="https://openrouter.ai/api/v1",
                model=selected_model,
                temperature=temperature,
                max_tokens=max_tokens,
                max_retries=0,
                default_headers={
                    "HTTP-Referer": "https://placement-compass.ai",
                    "X-Title": "Placement Compass"
                }
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")


    def is_model_healthy(self, provider: LLMProvider, model_name: ModelName) -> bool:
        """Helper to determine if a model is currently healthy (no breaker tripped or active cooldown)."""
        if not self.is_provider_configured(provider):
            return False
        model_id = f"{provider.value}:{model_name.value}"
        # Check permanent failures (402 credit exhaustion) - never recover
        if model_id in LLMService._permanent_failures or provider.value in LLMService._permanent_failures:
            return False
        if self.failed_models.get(model_id, 0) >= 3:
            return False
        if time.time() < self.cooldowns.get(model_id, 0.0):
            return False
        # Unified global rate limiter check to prevent rate limit storms
        try:
            from LANGGRAPH.services.rate_limiter import rate_limiter
            if rate_limiter.is_permanently_failed(provider.value):
                return False
            if rate_limiter.is_exhausted(provider.value):
                return False
        except Exception:
            pass
        return True

    @traceable(run_type="llm")
    async def call_llm(
        self,
        provider: LLMProvider,
        model_name: ModelName,
        prompt: ChatPromptTemplate,
        output_schema: Optional[Type[T]] = None,
        section_name: Optional[str] = None,
        company_name: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 800
    ) -> LLMResponse:
        """
        Public wrapper for LLM calls with circuit breaker, active cooldowns, and independent redundant fallbacks.
        Now with retry fingerprinting bypass to avoid duplicate failed prompts.
        """
        import hashlib
        model_id = f"{provider.value}:{model_name.value}"
        
        # Calculate fingerprint
        prompt_str = str(prompt)
        prompt_hash = hashlib.md5(prompt_str.encode("utf-8")).hexdigest()
        fingerprint = f"{provider.value}:{model_name.value}:{section_name or ''}:{company_name or ''}:{prompt_hash}"
        
        # Enforce strict provider stratification:
        # PRIMARY: CEREBRAS -> SECONDARY: GROQ -> OPTIONAL: GEMINI, TOGETHER, OPENROUTER
        if provider == LLMProvider.CEREBRAS:
            fallback_chain = [
                (LLMProvider.GROQ, ModelName.LLAMA_70B),
                (LLMProvider.GEMINI, ModelName.GEMINI_FLASH),
                (LLMProvider.TOGETHER, ModelName.TOGETHER_LLAMA),
                (LLMProvider.OPENROUTER, ModelName.DEEPSEEK_R1)
            ]
        elif provider == LLMProvider.GROQ:
            fallback_chain = [
                (LLMProvider.CEREBRAS, ModelName.CEREBRAS_LARGE),
                (LLMProvider.GEMINI, ModelName.GEMINI_FLASH),
                (LLMProvider.TOGETHER, ModelName.TOGETHER_LLAMA),
                (LLMProvider.OPENROUTER, ModelName.DEEPSEEK_R1)
            ]
        else:
            # For Gemini, Together, OpenRouter
            fallback_chain = [
                (LLMProvider.CEREBRAS, ModelName.CEREBRAS_LARGE),
                (LLMProvider.GROQ, ModelName.LLAMA_70B)
            ]
            # Add remaining optional providers
            for p, m in [
                (LLMProvider.GEMINI, ModelName.GEMINI_FLASH), 
                (LLMProvider.TOGETHER, ModelName.TOGETHER_LLAMA), 
                (LLMProvider.OPENROUTER, ModelName.DEEPSEEK_R1)
            ]:
                if p != provider:
                    fallback_chain.append((p, m))

        provider_cost_score = {
            "openrouter": 1,
            "gemini": 1,
            "cerebras": 2,
            "groq": 3,
            "together": 4,
            "claude": 4
        }
        fallback_chain = sorted(
            enumerate(fallback_chain),
            key=lambda item: (
                not self.is_model_healthy(item[1][0], item[1][1]),
                provider_cost_score.get(item[1][0].value, 10),
                item[0]
            )
        )
        fallback_chain = [item[1] for item in fallback_chain]

        # 1. Check health and fingerprint of primary provider
        if fingerprint in self._failed_fingerprints:
            logger.warning(f"  [FINGERPRINT BYPASS] Skipping previously failed identical call for {model_id} - {section_name}")
        elif self.is_model_healthy(provider, model_name):
            try:
                # Call the internal method that has the retry decorator
                return await self._call_llm_internal(
                    provider, model_name, prompt, output_schema, section_name, company_name, temperature, max_tokens
                )
            except Exception as e:
                err_msg = str(e)
                logger.error(f"LLM Call Failed for {model_id}: {err_msg}")
                self._failed_fingerprints.add(fingerprint)
                if provider == LLMProvider.OPENROUTER:
                    self._openrouter_index = getattr(self, "_openrouter_index", 0) + 1
                elif provider == LLMProvider.TOGETHER:
                    self._together_index = getattr(self, "_together_index", 0) + 1
                
                # 402 = credit exhaustion — permanently disable this provider
                if "402" in err_msg or "credit_limit" in err_msg or "Credit limit exceeded" in err_msg:
                    LLMService._permanent_failures.add(model_id)
                    LLMService._permanent_failures.add(provider.value)
                    logger.error(f"CREDIT EXHAUSTED (402): {model_id} permanently disabled for this session. Skipping to fallback.")
                # If Quota limit hit (429), trigger temporary cooldown
                elif "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "rate limit" in err_msg.lower():
                    failures = self.failed_models.get(model_id, 0) + 1
                    self.failed_models[model_id] = failures
                    cooldown_time = 15 * (2 ** (failures - 1))  # Exponential backoff
                    self.cooldowns[model_id] = time.time() + cooldown_time
                    logger.warning(f"Quota Exhausted for {model_id}. Cooling down for {cooldown_time} seconds (Failures: {failures}).")
                
                # Check for schema validation error first to salvage
                if "SCHEMA_VALIDATION_ERROR" in err_msg and output_schema:
                    logger.warning(f"Salvaging malformed data for {model_id} via model_construct.")
                    return LLMResponse(
                        content=output_schema.model_construct(),
                        raw_response=err_msg,
                        metadata=LLMCallMetadata(
                            provider=provider.value,
                            model_name=model_name.value,
                            section=section_name,
                            company=company_name,
                            status="degraded",
                            latency=0.0
                        )
                    )
        else:
            logger.warning(f"CIRCUIT BREAKER / COOLDOWN ACTIVE for {model_id}. Bypassing immediately to fallback options.")

        # 2. Execute Redundancy Fallback Chain
        if self.openrouter_api_key or self.gemini_api_key or self.groq_api_key:
            for fallback_prov, fallback_model in fallback_chain:
                fallback_id = f"{fallback_prov.value}:{fallback_model.value}"
                fallback_fingerprint = f"{fallback_prov.value}:{fallback_model.value}:{section_name or ''}:{company_name or ''}:{prompt_hash}"
                
                if fallback_fingerprint in self._failed_fingerprints:
                    continue
                    
                if self.is_model_healthy(fallback_prov, fallback_model):
                    logger.warning(f"Redundancy Routing: Falling back from {model_id} to healthy {fallback_id}...")
                    try:
                        return await self._call_llm_internal(
                            fallback_prov, fallback_model, prompt, output_schema, section_name, company_name, temperature, max_tokens
                        )
                    except Exception as ex:
                        logger.error(f"Fallback to {fallback_id} also failed: {ex}")
                        self._failed_fingerprints.add(fallback_fingerprint)
                        if fallback_prov == LLMProvider.OPENROUTER:
                            self._openrouter_index = getattr(self, "_openrouter_index", 0) + 1
                        elif fallback_prov == LLMProvider.TOGETHER:
                            self._together_index = getattr(self, "_together_index", 0) + 1
                        err_msg_ex = str(ex)
                        if "402" in err_msg_ex or "credit_limit" in err_msg_ex or "Credit limit exceeded" in err_msg_ex:
                            LLMService._permanent_failures.add(fallback_id)
                            LLMService._permanent_failures.add(fallback_prov.value)
                            logger.error(f"CREDIT EXHAUSTED (402): {fallback_id} permanently disabled for this session.")
                        elif "429" in err_msg_ex or "RESOURCE_EXHAUSTED" in err_msg_ex or "rate limit" in err_msg_ex.lower():
                            fb_failures = self.failed_models.get(fallback_id, 0) + 1
                            self.failed_models[fallback_id] = fb_failures
                            fb_cooldown = 15 * (2 ** (fb_failures - 1))
                            self.cooldowns[fallback_id] = time.time() + fb_cooldown
                            logger.warning(f"Quota Exhausted for {fallback_id}. Cooling down for {fb_cooldown} seconds (Failures: {fb_failures}).")
                else:
                    logger.info(f"Redundancy Routing: Skipping fallback {fallback_id} (currently in cooldown/rate-limited).")

        # 3. Last resort failure response
        logger.error(f"All fallback options exhausted for {model_id}.")
        return LLMResponse(
            content={},
            raw_response="All providers and fallbacks exhausted",
            metadata=LLMCallMetadata(
                provider=provider.value,
                model_name=model_name.value,
                section=section_name,
                company=company_name,
                status="error",
                latency=0.0,
                degraded=True
            )
        )


    @retry(
        stop=stop_after_attempt(3), 
        wait=wait_exponential(multiplier=1, min=1, max=10), # Minimal wait for latency optimization
        # FIX: ONLY retry on fatal semantic/JSON failures (timeout or structural JSON error).
        # We explicitly DO NOT retry 429/RESOURCE_EXHAUSTED to prevent quota rate limit storms and fallback fast.
        retry=(lambda e: "timeout" in str(e).lower() or "STRUCTURAL_JSON_ERROR" in str(e)),
        before_sleep=log_retry,
        reraise=True
    )
    async def _call_llm_internal(
        self,
        provider: LLMProvider,
        model_name: ModelName,
        prompt: ChatPromptTemplate,
        output_schema: Optional[Type[T]] = None,
        section_name: Optional[str] = None,
        company_name: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 800
    ) -> LLMResponse:
        """
        Internal implementation with smart retry and immediate 429 detection.
        """
        model_id = f"{provider.value}:{model_name.value}"
        start_time = time.time()
        dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"

        try:
            # 1. Check Circuit Breaker before calling
            if self.failed_models.get(model_id, 0) >= 3:
                 raise ValueError(f"CIRCUIT_BROKEN: {model_id} is temporarily unavailable.")

            # 1. Detailed Schema Hints for Nested Structure
            if output_schema:
                schema_fields = list(output_schema.model_fields.keys())
                schema_instructions = (
                    f"\n[JSON REQUIREMENT]\n"
                    f"Return a JSON object containing only these keys: {schema_fields}\n"
                    f"Set any field to null if the value is unknown or not in the context. DO NOT invent values."
                )
                messages = prompt.format_prompt().to_messages()
                from langchain_core.messages import HumanMessage
                messages.append(HumanMessage(content=schema_instructions))
                model_input = messages
            else:
                model_input = prompt.format_prompt().to_messages()

            model = self._get_model(provider, model_name, temperature=temperature, max_tokens=max_tokens)
            response = await model.ainvoke(model_input)
            
            raw_content = response.content if hasattr(response, "content") else response
            raw_text = str(raw_content) if not isinstance(raw_content, list) else "".join([str(p.get("text", p)) for p in raw_content])
            
            if section_name == "enterprise_analysis":
                logger.info(f"  [DEBUG ANALYSIS] Raw LLM Text: {raw_text}")
            
            # 2. Repair and Normalize FIRST
            json_text = repair_json_structure(raw_text)
            parsed_data = None
            
            # Try native json loads first
            import json
            try:
                parsed_data = json.loads(json_text)
            except Exception:
                # Try JsonOutputParser as secondary fallback
                try:
                    parsed_data = JsonOutputParser().parse(json_text)
                except Exception:
                    # Attempt manual outer curly-braces extraction
                    try:
                        start_idx = json_text.find('{')
                        end_idx = json_text.rfind('}')
                        if start_idx != -1 and end_idx != -1:
                            parsed_data = json.loads(json_text[start_idx:end_idx+1])
                    except Exception:
                        pass
            
            if parsed_data is None:
                # Fatal JSON error triggers a real retry
                logger.error(f"Failed to parse JSON for {model_id}. Raw text: {raw_text[:200]}")
                raise ValueError(f"STRUCTURAL_JSON_ERROR for {model_id}")

            # 4. Harmonize and Validate with Retry Logic
            if output_schema:
                normalized_data = harmonize_with_schema(parsed_data, output_schema)
                try:
                    # STRICT VALIDATION: We validate here but return the DICT for consistency
                    _ = output_schema(**normalized_data)
                    content = normalized_data
                except Exception as schema_err:
                    # DO NOT RETRY type mismatches. Use harmonized data directly.
                    logger.warning(f"Schema mismatch for {model_id}, using harmonized data: {schema_err}")
                    content = normalized_data
            else:
                content = parsed_data

            # 4. Usage Metadata Tracking
            prompt_tokens = 0
            completion_tokens = 0
            total_tokens = 0
            
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                 usage = response.usage_metadata
                 prompt_tokens = usage.get("input_tokens", 0)
                 completion_tokens = usage.get("output_tokens", 0)
                 total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)
            elif hasattr(response, "response_metadata") and response.response_metadata:
                 usage = response.response_metadata.get("token_usage", {})
                 prompt_tokens = usage.get("prompt_tokens", usage.get("input_tokens", 0))
                 completion_tokens = usage.get("completion_tokens", usage.get("output_tokens", 0))
                 total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)

            execution_time = time.time() - start_time
            self.failed_models[model_id] = 0 # Reset circuit breaker on success
            
            if dev_mode:
                print(f"  [SUCCESS] {model_id} | Tokens: {total_tokens} (P:{prompt_tokens}/C:{completion_tokens}) | Time: {execution_time:.2f}s")

            return LLMResponse(
                content=content,
                raw_response=raw_text,
                metadata=LLMCallMetadata(
                    provider=provider.value,
                    model_name=model_name.value,
                    section=section_name,
                    company=company_name,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    latency=execution_time,
                    status="success"
                )
            )
        except Exception as e:
            err_msg = str(e)
            # 402 = permanent credit exhaustion — disable provider for entire session
            if "402" in err_msg or "credit_limit" in err_msg or "Credit limit exceeded" in err_msg:
                LLMService._permanent_failures.add(model_id)
                LLMService._permanent_failures.add(provider.value)
                logger.error(f"CREDIT EXHAUSTED (402): {model_id} permanently disabled. Add credits to re-enable.")
            # 429 = temporary rate limit — cooldown and retry via fallback
            elif "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "rate limit" in err_msg.lower():
                self.failed_models[model_id] = 5
                self.cooldowns[model_id] = time.time() + 90  # 90s cooldown
                logger.error(f"QUOTA EXHAUSTED: Marking {model_id} as unavailable and cooling down for 90 seconds.")
            raise 




    async def parallel_call(self, tasks: List[asyncio.Task]) -> List[LLMResponse]:
        """Executes multiple LLM calls in parallel."""
        return await asyncio.gather(*tasks)

    def create_prompt(self, system_message: str, user_message: str) -> ChatPromptTemplate:
        """Helper to create prompt templates with escaped braces for JSON safety."""
        return ChatPromptTemplate.from_messages([
            ("system", system_message.replace("{", "{{").replace("}", "}}")),
            ("user", user_message.replace("{", "{{").replace("}", "}}"))
        ])
