import asyncio
import os
import sys
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from dotenv import load_dotenv

# Ensure project root is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
if project_root not in sys.path:
    sys.path.append(project_root)

load_dotenv()

from LANGGRAPH.services.llm_service import LLMService, LLMProvider, ModelName
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

MODELS_TO_TEST = [
    (LLMProvider.GROQ, ModelName.LLAMA_70B),
    (LLMProvider.GEMINI, ModelName.GEMINI_FLASH),
    (LLMProvider.CEREBRAS, ModelName.CEREBRAS_LARGE),
    (LLMProvider.OPENROUTER, ModelName.MISTRAL_7B)
]

class DummyExtraction(BaseModel):
    message: str
    status: str

async def test_models():
    print("==================================================")
    print("STARTING INDEPENDENT MODEL TESTS")
    print("==================================================")
    
    groq_api_key = os.getenv("GROQ_API_KEY")
    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
    
    if not groq_api_key or not openrouter_api_key:
        print("❌ Error: Missing API keys in .env")
        return
        
    llm_service = LLMService(groq_api_key=groq_api_key, openrouter_api_key=openrouter_api_key)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a test assistant. Extract the exact text 'Hello, World!' and set status to 'success'."),
        ("user", "Extract the test data.")
    ])
    
    for provider, model_name in MODELS_TO_TEST:
        print(f"\n--- Testing {model_name.value} ({provider.value}) ---")
        try:
            response = await llm_service.call_llm(
                provider=provider,
                model_name=model_name,
                prompt=prompt,
                output_schema=DummyExtraction,
                section_name="test_section"
            )
            print(f"✅ Status: SUCCESS")
            print(f"⏱️  Latency: {response.metadata.latency:.2f} seconds")
            if response.metadata.total_tokens:
                print(f"🪙  Tokens: {response.metadata.total_tokens}")
            print(f"📄 Output: {response.content}")
        except Exception as e:
            print(f"❌ Status: FAILED")
            print(f"⚠️  Error: {str(e)[:200]}")
            
    print("\n==================================================")
    print("TESTS COMPLETE")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_models())
