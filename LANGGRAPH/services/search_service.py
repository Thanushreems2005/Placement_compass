"""
Enhanced Search Service with Cache Freshness Metadata
======================================================
Improvements over the base version:
  - Cache entries now include freshness timestamp and TTL
  - Cache is invalidated when entries exceed TTL (default 7 days)
  - Async Tavily batching: all 10 section queries fired in parallel
  - Query deduplication: prevents identical queries being sent twice
  - Compressed context builder limited to 600 chars
  - Single Tavily API call per section per company per run
"""

import os
import json
import httpx
import asyncio
import logging
import time
from typing import List, Dict, Any, Optional, Set

logger = logging.getLogger(__name__)

# Cache TTL in seconds (7 days)
CACHE_TTL_SECONDS = 7 * 24 * 3600


class SearchService:
    """
    Service for fetching live corporate data via Tavily with persistent,
    TTL-aware caching and async batch support.
    """
    _global_cache: Dict[str, Dict[str, Any]] = {}   # key → {context, fetched_at}
    _live_fetches: Set[str] = set()
    _pending_fetches: Set[str] = set()              # dedup in-flight requests
    CACHE_FILE = "tavily_cache.json"

    def __init__(self, api_key: str = ""):
        self.api_key = api_key or os.getenv("TAVILY_API_KEY", "")
        self.base_url = "https://api.tavily.com/search"
        self._load_cache()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _load_cache(self):
        """Loads search results from the persistent JSON cache file."""
        if not SearchService._global_cache and os.path.exists(self.CACHE_FILE):
            try:
                with open(self.CACHE_FILE, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                # Migrate legacy flat-string entries to new dict format
                migrated = {}
                for k, v in raw.items():
                    if isinstance(v, str):
                        migrated[k] = {"context": v, "fetched_at": 0}
                    elif isinstance(v, dict):
                        migrated[k] = v
                SearchService._global_cache = migrated
                logger.info(f"Loaded {len(migrated)} entries from Tavily cache.")
            except Exception as e:
                logger.error(f"Failed to load Tavily cache: {e}")

    def _save_cache(self):
        """Saves search results to the persistent JSON cache file."""
        try:
            with open(self.CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(SearchService._global_cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save Tavily cache: {e}")

    def _is_cache_fresh(self, cache_key: str) -> bool:
        """Returns True if the cache entry exists and is within TTL."""
        entry = SearchService._global_cache.get(cache_key)
        if not entry:
            return False
        fetched_at = entry.get("fetched_at", 0)
        age = time.time() - fetched_at
        if age > CACHE_TTL_SECONDS:
            logger.info(f"  [TAVILY CACHE EXPIRED] {cache_key} (age: {age/3600:.1f}h)")
            del SearchService._global_cache[cache_key]
            self._save_cache()
            return False
        return True

    def _get_cached_context(self, cache_key: str) -> Optional[str]:
        entry = SearchService._global_cache.get(cache_key)
        return entry.get("context") if entry else None

    def _set_cache(self, cache_key: str, context: str):
        SearchService._global_cache[cache_key] = {
            "context": context,
            "fetched_at": time.time(),
        }
        SearchService._live_fetches.add(cache_key)
        self._save_cache()

    # ------------------------------------------------------------------
    # Context compression
    # ------------------------------------------------------------------

    def _compress_context(self, answer: str, results: List[Dict[str, Any]], company_name: str) -> str:
        """
        Compresses and cleans Tavily results to ≤600 chars.
        Deduplicates sentences, strips boilerplate, and
        filters out review-site / spam domain snippets.
        """
        import re

        # Domains we refuse to use as evidence sources
        BLOCKED_DOMAINS = {
            "glassdoor.com", "indeed.com", "ambitionbox.com",
            "comparably.com", "payscale.com", "salary.com",
            "reddit.com", "quora.com", "trustpilot.com",
            "yelp.com", "bbb.org", "ripoffreport.com",
        }

        boilerplates = [
            r"(?i)skip to (main )?content",
            r"(?i)sign in",
            r"(?i)terms of (service|use)",
            r"(?i)privacy policy",
            r"(?i)all rights reserved",
            r"(?i)cookie policy",
            r"(?i)copyright \d{4}",
            r"(?i)subscribe to",
            r"(?i)javascript is required",
        ]

        def clean_snippet(text: str) -> str:
            if not text:
                return ""
            for pattern in boilerplates:
                text = re.sub(pattern, "", text)
            text = re.sub(r"\s+", " ", text).strip()
            sentences = re.split(r"(?<=[.!?])\s+", text)
            seen = set()
            unique = []
            for s in sentences:
                s_clean = s.lower().strip()
                if len(s_clean) < 15:
                    continue
                if s_clean not in seen:
                    seen.add(s_clean)
                    unique.append(s)
            compact = " ".join(unique[:2])
            if len(compact) > 300:
                compact = compact[:297] + "..."
            return compact

        snippets = []
        if answer:
            clean = clean_snippet(answer)
            if clean:
                snippets.append(f"Summary: {clean}")

        def score_url(url: str) -> int:
            url_low = url.lower()
            score = 0
            
            # Massive penalty for review sites and weak aggregators
            if any(bad in url_low for bad in BLOCKED_DOMAINS):
                score -= 1000
            if "glassdoor" in url_low or "indeed.com" in url_low or "yelp.com" in url_low:
                score -= 1000
            
            # SEC / Official / Professional
            if "sec.gov" in url_low:
                score += 800
            if "linkedin.com/company" in url_low:
                score += 600
            if "crunchbase.com/organization" in url_low:
                score += 500
            if "wikipedia.org" in url_low:
                score += 150
                
            # Bonus for having company name in domain
            stop_words = {
                "corporation", "corp", "inc", "co", "ltd", "plc", "holdings",
                "technology", "technologies", "llc", "limited", "the", "and"
            }
            comp_tokens = [
                t for t in re.split(r"\W+", company_name.lower())
                if t and t not in stop_words and len(t) > 2
            ]
            for t in comp_tokens:
                if f"{t}.com" in url_low or f"{t}.org" in url_low or f"{t}.io" in url_low or f"{t}.ai" in url_low:
                    score += 1000 # Highest priority: Official domain
                elif t in url_low:
                    score += 100
            
            # High quality business news
            if "bloomberg.com" in url_low or "reuters.com" in url_low or "forbes.com" in url_low:
                score += 300
                
            return score

        # Sort results by url relevance
        results.sort(key=lambda r: score_url(r.get("url", "")), reverse=True)

        for r in results[:2]:
            url = r.get("url", "")
            # Skip blacklisted domains
            if any(bad in url.lower() for bad in BLOCKED_DOMAINS):
                logger.debug(f"  [DOMAIN FILTER] Skipped result from: {url}")
                continue
            cleaned = clean_snippet(r.get("content", ""))
            if cleaned:
                snippets.append(f"- Source: {url}\n  Info: {cleaned}")

        compiled = "\n".join(snippets)
        if len(compiled) > 600:
            compiled = compiled[:597] + "..."
        return compiled

    # ------------------------------------------------------------------
    # Contamination detection
    # ------------------------------------------------------------------

    def _is_contaminated(self, company_name: str, cached_text: str) -> bool:
        """
        Strictly rejects contaminated cache hits.
        Invalidates contexts if:
        - company name mismatch
        - semantic mismatch detected
        - source lineage differs (e.g. mentions incorrect domains)
        """
        import re
        stop_words = {
            "corporation", "corp", "inc", "co", "ltd", "plc", "holdings",
            "technology", "technologies", "llc", "limited", "the", "and"
        }
        comp_tokens = [
            t for t in re.split(r"\W+", company_name.lower())
            if t and t not in stop_words
        ]
        if not comp_tokens:
            return False
            
        # 1. Company name mismatch check
        has_match = any(token in cached_text.lower() for token in comp_tokens)
        if not has_match:
            logger.warning(f"  [CACHE INVALIDATION] Company mismatch: '{company_name}' not found in cached text.")
            return True
            
        # 2. Semantic/Domain/Competitor mismatch check (e.g. Adobe context incorrectly assigned to other company)
        comp_clean = re.sub(r'[^a-zA-Z0-9]', '', company_name.split()[0]).lower()
        
        # If cached text mentions other big brand names but not this company's brand name at all, reject
        major_brands = ["adobe", "microsoft", "apple", "nvidia", "google", "amazon", "razorpay"]
        for brand in major_brands:
            if brand in cached_text.lower() and comp_clean != brand:
                if comp_clean not in cached_text.lower():
                    logger.warning(f"  [CACHE INVALIDATION] Semantic mismatch: found '{brand}' context in cache for target '{company_name}'.")
                    return True
                    
        return False

    # ------------------------------------------------------------------
    # Section query map
    # ------------------------------------------------------------------

    SECTION_QUERIES = {
        # Priority-ordered: highest-value sections get more specific queries
        "overview":               "{company} official headquarters address incorporation year employee headcount overview",
        "financials_stability":   "{company} annual revenue profit market capitalization stock ticker exchange listed investors",
        "leadership_contacts":    "{company} CEO name LinkedIn founder board members official website investor relations contact",
        "business_market":        "{company} core products services value proposition market share customers competitors TAM",
        "tech_innovation":        "{company} technology stack AI machine learning patents R&D innovation tech partners",
        "brand_digital":          "{company} official website LinkedIn company page Twitter handle glassdoor rating brand",
        "culture_people_work":    "{company} work culture diversity inclusion employee engagement layoffs hiring practices",
        "learning_growth":        "{company} training programs mentorship career development internal mobility opportunities",
        "work_logistics":         "{company} remote work hybrid office policy work hours safety standards benefits",
        "compensation_lifestyle":  "{company} salary compensation structure ESOP RSU health insurance leave policy perks",
    }

    # ------------------------------------------------------------------
    # Single section search
    # ------------------------------------------------------------------

    async def search_company_info(self, company_name: str, section: str) -> str:
        """
        Searches for section information with persistent TTL-aware caching.
        Returns empty string if no API key is set and cache misses.
        """
        import re
        import hashlib
        comp_clean = re.sub(r'[^a-zA-Z0-9]', '', company_name.split()[0]).lower()
        normalized_domain = f"{comp_clean}.com"
        schema_version = "v2.2"
        week_str = time.strftime("%Y-%U")
        ts_hash = hashlib.md5(week_str.encode()).hexdigest()[:8]
        
        cache_key = f"{company_name.lower()}_{normalized_domain}_{section.lower()}_{schema_version}_{ts_hash}"

        # 1. Check fresh cache
        if self._is_cache_fresh(cache_key):
            context = self._get_cached_context(cache_key)
            if context and not self._is_contaminated(company_name, context):
                logger.info(f"  [TAVILY CACHE HIT] {company_name} - {section}")
                return context
            elif context:
                logger.warning(f"  [TAVILY CACHE CONTAMINATION] {cache_key} — invalidating.")
                del SearchService._global_cache[cache_key]
                self._save_cache()

        # 2. Deduplication guard for in-flight parallel requests
        if cache_key in SearchService._pending_fetches:
            logger.info(f"  [TAVILY DEDUP] Skipping duplicate in-flight request: {cache_key}")
            return ""

        if not self.api_key:
            logger.warning("No TAVILY_API_KEY. Skipping live search.")
            return ""

        # 3. Live fetch
        query_template = self.SECTION_QUERIES.get(
            section.lower(),
            "{company} {section} corporate information"
        )
        query = query_template.replace("{company}", company_name).replace("{section}", section)
        logger.info(f"  [TAVILY SEARCH] {section}: {query[:80]}")

        SearchService._pending_fetches.add(cache_key)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.base_url,
                    json={
                        "api_key":        self.api_key,
                        "query":          query,
                        "search_depth":   "basic",
                        "max_results":    5,
                        "include_answer": True,
                    },
                    timeout=20.0,
                )
                response.raise_for_status()
                data = response.json()

            answer  = data.get("answer", "")
            results = data.get("results", [])
            context = self._compress_context(answer, results, company_name)

            if context.strip():
                self._set_cache(cache_key, context)
                logger.info(f"  [TAVILY CACHE SAVED] {company_name} - {section}")

            return context

        except Exception as e:
            logger.error(f"Tavily search failed for {company_name}/{section}: {e}")
            return ""
        finally:
            SearchService._pending_fetches.discard(cache_key)

    # ------------------------------------------------------------------
    # Async batch fetch (all 10 sections in parallel)
    # ------------------------------------------------------------------

    async def batch_prefetch(self, company_name: str,
                             sections: Optional[List[str]] = None) -> Dict[str, str]:
        """
        Fires all section searches in parallel.
        Sections are fetched in priority order but fired concurrently.
        Returns {section_name: context_text} for all sections.
        """
        # Priority-ordered section list
        PRIORITY_SECTIONS = [
            "overview", "financials_stability", "leadership_contacts",
            "business_market", "tech_innovation", "brand_digital",
            "culture_people_work", "learning_growth",
            "work_logistics", "compensation_lifestyle",
        ]
        if sections is None:
            sections = PRIORITY_SECTIONS

        tasks = {
            section: asyncio.create_task(
                self.search_company_info(company_name, section)
            )
            for section in sections
        }

        results = {}
        for section, task in tasks.items():
            try:
                results[section] = await task
            except Exception as e:
                logger.error(f"Batch prefetch failed for {section}: {e}")
                results[section] = ""

        hit_count = sum(1 for v in results.values() if v)
        logger.info(
            f"  [TAVILY BATCH] Prefetched {hit_count}/{len(sections)} "
            f"sections for {company_name}."
        )
        return results

    # ------------------------------------------------------------------
    # Cache statistics
    # ------------------------------------------------------------------

    def cache_stats(self) -> Dict[str, Any]:
        total = len(SearchService._global_cache)
        now = time.time()
        fresh = sum(
            1 for v in SearchService._global_cache.values()
            if isinstance(v, dict) and (now - v.get("fetched_at", 0)) < CACHE_TTL_SECONDS
        )
        return {
            "total_entries": total,
            "fresh_entries": fresh,
            "stale_entries": total - fresh,
            "live_fetches_this_session": len(SearchService._live_fetches),
        }
