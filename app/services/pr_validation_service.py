import re
import httpx
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any, Optional
from fastapi import HTTPException
from app.services.redis_service import redis_service

logger = logging.getLogger(__name__)

HEADERS = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Placement-Compass"
}
pat = os.getenv("GITHUB_PAT") if "os" in globals() else __import__("os").getenv("GITHUB_PAT")
if pat:
    HEADERS["Authorization"] = f"token {pat}"

def get_github_session():
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    return session

def validate_pr_link(pr_url: str, expected_owner: str, expected_repo: str) -> dict:
    # Parse PR URL: https://github.com/{owner}/{repo}/pull/{number}
    import re
    pattern = r"github\.com/([^/]+)/([^/]+)/pull/(\d+)"
    match = re.search(pattern, pr_url)
    
    if not match:
        return {"valid": False, "error": "Invalid GitHub PR URL format"}
    
    owner, repo, pr_number = match.groups()
    
    # Verify it's on the correct repo
    if owner.lower() != expected_owner.lower() or repo.lower() != expected_repo.lower():
        return {
            "valid": False, 
            "error": f"PR must be from {expected_owner}/{expected_repo}, got {owner}/{repo}"
        }
    
    session = get_github_session()
    
    try:
        resp = session.get(
            f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}",
            headers=HEADERS,
            timeout=15  # increased from default
        )
        
        if resp.status_code == 404:
            return {"valid": False, "error": "PR not found on GitHub"}
        if resp.status_code != 200:
            return {"valid": False, "error": f"GitHub returned status {resp.status_code}"}
        
        pr_data = resp.json()
        return {
            "valid": True,
            "pr_number": int(pr_number),
            "pr_title": pr_data.get("title", ""),
            "pr_state": pr_data.get("state", ""),
            "pr_merged": pr_data.get("merged", False),
            "pr_url": pr_data.get("html_url", pr_url),
            "owner": owner,
            "repo": repo,
        }
    except requests.Timeout:
        # On timeout, do a basic URL format validation and accept it optimistically
        return {
            "valid": True,
            "pr_number": int(pr_number),
            "pr_title": "PR verification pending",
            "pr_state": "open",
            "pr_merged": False,
            "pr_url": pr_url,
            "owner": owner,
            "repo": repo,
            "warning": "Could not verify with GitHub API — accepted based on URL format"
        }
    except Exception as e:
        return {"valid": False, "error": f"Verification error: {str(e)}"}

class PRValidationService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=15.0)

    def parse_pr_url(self, pr_url: str) -> Optional[Dict[str, str]]:
        """Extract owner, repo, and pr_number from a GitHub PR URL."""
        # Expected format: https://github.com/owner/repo/pull/123
        pattern = r"github\.com/([^/]+)/([^/]+)/pull/(\d+)"
        match = re.search(pattern, pr_url)
        if match:
            return {
                "owner": match.group(1),
                "repo": match.group(2),
                "pr_number": match.group(3)
            }
        return None

    async def fetch_pr_metadata(self, owner: str, repo: str, pr_number: str) -> Dict[str, Any]:
        """Fetch PR details from GitHub API."""
        cache_key = f"pr_meta:{owner}:{repo}:{pr_number}"
        cached = await redis_service.get(cache_key)
        if cached:
            return cached

        url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
        try:
            response = await self.client.get(url, headers={"Accept": "application/vnd.github.v3+json"})
            if response.status_code == 200:
                data = response.json()
                await redis_service.set(cache_key, data, ttl=3600)  # cache for 1 hour
                return data
            logger.error(f"GitHub API returned {response.status_code} for PR {url}")
            return {}
        except Exception as e:
            logger.error(f"Error fetching PR metadata: {str(e)}")
            return {}

    async def fetch_pr_diff(self, owner: str, repo: str, pr_number: str) -> str:
        """Fetch PR diff from GitHub."""
        cache_key = f"pr_diff:{owner}:{repo}:{pr_number}"
        cached = await redis_service.get(cache_key)
        if cached:
            return cached

        url = f"https://github.com/{owner}/{repo}/pull/{pr_number}.diff"
        try:
            # We follow redirects for .diff files
            response = await self.client.get(url, follow_redirects=True)
            if response.status_code == 200:
                diff_text = response.text
                # Limit diff size to 10k characters to prevent token explosion
                if len(diff_text) > 10000:
                    diff_text = diff_text[:10000] + "\n...[DIFF TRUNCATED]"
                await redis_service.set(cache_key, diff_text, ttl=3600)
                return diff_text
            logger.error(f"Failed to fetch PR diff, status code: {response.status_code}")
            return ""
        except Exception as e:
            logger.error(f"Error fetching PR diff: {str(e)}")
            return ""

pr_validation_service = PRValidationService()
