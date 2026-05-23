import httpx
import logging
import asyncio
import os
import time
from typing import List, Dict, Any, Tuple
from app.models.missions import MissionCard

logger = logging.getLogger(__name__)

ORG_MAPPING = {
    "amazon": ["aws"],
    "aws": ["aws"],
    "google": ["google", "googleapis", "googlecodelabs"],
    "microsoft": ["microsoft", "Azure-Samples", "MicrosoftDocs"],
    "meta": ["facebook", "facebookresearch", "facebookincubator"],
    "facebook": ["facebook", "facebookresearch", "facebookincubator"],
    "netflix": ["netflix"],
    "uber": ["uber", "uber-go", "uber-web"],
    "airbnb": ["airbnb"],
    "stripe": ["stripe", "stripe-archive"],
    "shopify": ["shopify", "Shopify"],
    "spotify": ["spotify"],
    "apple": ["apple"],
    "twitter": ["twitter", "twitterdev"],
    "x": ["twitter", "twitterdev"],
    "linkedin": ["linkedin"],
    "atlassian": ["atlassian", "atlassian-labs"],
    "mongodb": ["mongodb", "mongodb-labs"],
    "elastic": ["elastic"],
    "hashicorp": ["hashicorp"],
    "grafana": ["grafana"],
    "vercel": ["vercel"],
    "github": ["github", "github-community"],
    "docker": ["docker", "docker-library"],
    "kubernetes": ["kubernetes", "kubernetes-sigs"],
    "pytorch": ["pytorch"],
    "tensorflow": ["tensorflow"],
    "openai": ["openai"],
    "anthropic": ["anthropic"],
    "redis": ["redis", "RedisLabs"],
    "nginx": ["nginx"],
    "apache": ["apache"]
}

SEED_REPOS = [
    # Beginner-friendly
    ("vercel", "next.js"),
    ("facebook", "react"),
    ("tailwindlabs", "tailwindcss"),
    ("axios", "axios"),
    ("expressjs", "express"),
    ("lodash", "lodash"),
    # Intermediate
    ("microsoft", "vscode"),
    ("microsoft", "TypeScript"),
    ("aws", "aws-cdk"),
    ("mongodb", "mongo"),
    ("elastic", "elasticsearch"),
    # Advanced
    ("kubernetes", "kubernetes"),
    ("pytorch", "pytorch"),
    ("tensorflow", "tensorflow"),
    ("docker", "compose"),
    ("grafana", "grafana"),
]

_cache = {}

def get_cached(key):
    if key in _cache and time.time() - _cache[key]['ts'] < 1800: # 30 min cache
        return _cache[key]['data']
    return None

def set_cache(key, data):
    _cache[key] = {'data': data, 'ts': time.time()}

class GitHubService:
    def __init__(self):
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Placement-Compass-App"
        }
        pat = os.getenv("GITHUB_PAT", "")
        if pat:
            self.headers["Authorization"] = f"token {pat}"
            
        self.semaphore = asyncio.Semaphore(10)  # Lower concurrency for search

    async def _fetch_json(self, client: httpx.AsyncClient, url: str) -> Tuple[Any, bool]:
        async with self.semaphore:
            try:
                response = await client.get(url, headers=self.headers, timeout=10.0)
                if response.status_code in [403, 429]:
                    return None, True
                response.raise_for_status()
                return response.json(), False
            except Exception as e:
                logger.error(f"Error fetching {url}: {e}")
                return None, False

    def _get_difficulty_and_xp(self, item: Dict[str, Any], is_default: bool = False, label_override: str = None) -> Tuple[str, int]:
        labels = [l.get("name", "").lower() for l in item.get("labels", [])]
        
        # Difficulty from label
        difficulty = "Advanced"
        if label_override == "good+first+issue" or any("good first issue" in l for l in labels):
            difficulty = "Beginner"
        elif label_override == "help+wanted" or label_override == "bug" or any("help wanted" in l for l in labels) or any("bug" in l for l in labels):
            difficulty = "Intermediate"
            
        # XP mapping
        xp = 500
        if difficulty == "Beginner":
            xp = 100
        elif difficulty == "Intermediate":
            xp = 250
            
        return difficulty, xp

    async def fetch_default_missions(self) -> Tuple[List[MissionCard], bool]:
        cached = get_cached("default_missions")
        if cached:
            return cached, False

        issue_tasks = []
        rate_limited = False
        
        async with httpx.AsyncClient() as client:
            for owner, repo in SEED_REPOS:
                labels = ["good+first+issue", "help+wanted", "bug"]
                for label in labels:
                    url = f"https://api.github.com/repos/{owner}/{repo}/issues?state=open&per_page=5&labels={label}"
                    issue_tasks.append((owner, repo, label, self._fetch_json(client, url)))
                    
            results = await asyncio.gather(*[task[3] for task in issue_tasks])
            
        raw_issues = []
        for i, (data, r_limit) in enumerate(results):
            if r_limit:
                rate_limited = True
            if data and isinstance(data, list):
                owner, repo, label = issue_tasks[i][:3]
                for item in data:
                    item['_owner'] = owner
                    item['_repo'] = repo
                    item['_label_override'] = label
                raw_issues.extend(data)
                
        # Fallback dummy data if rate limited and no data fetched
        if not raw_issues and rate_limited:
            for i, (owner, repo) in enumerate(SEED_REPOS * 2): # Just to get ~30
                raw_issues.append({
                    "id": f"dummy-{i}",
                    "number": 1000 + i,
                    "title": f"Fix minor bug in {repo} component",
                    "labels": [{"name": ["good first issue", "help wanted", "bug"][i % 3]}],
                    "html_url": f"https://github.com/{owner}/{repo}/issues/{1000+i}",
                    "comments": i % 5,
                    "body": "This is a fallback issue because the GitHub API rate limit was exceeded.",
                    "created_at": "2026-05-23T00:00:00Z",
                    "_owner": owner,
                    "_repo": repo,
                    "_label_override": ["good+first+issue", "help+wanted", "bug"][i % 3]
                })
                
        seen_ids = set()
        missions = []
        
        for item in raw_issues:
            if "pull_request" in item:
                continue
            issue_id = str(item.get("id"))
            if issue_id in seen_ids:
                continue
            seen_ids.add(issue_id)
            
            owner = item.get("_owner", "unknown")
            repo = item.get("_repo", "unknown")
            repo_full = f"{owner}/{repo}"
            
            difficulty, xp = self._get_difficulty_and_xp(item, True, item.get("_label_override"))
            
            missions.append(MissionCard(
                id=issue_id,
                number=item.get("number", 0),
                title=item.get("title", "Untitled"),
                repo=repo_full,
                repo_name=repo_full,
                difficulty=difficulty,
                labels=[l.get("name", "") for l in item.get("labels", [])][:3],
                skills=["Open Source", "Git"],
                github_url=item.get("html_url", ""),
                html_url=item.get("html_url", ""),
                company=owner.capitalize(),
                xp=xp,
                comments=item.get("comments", 0),
                body=item.get("body", "")[:200] + "...",
                created_at=item.get("created_at", "")
            ))
            
        diff_order = {"Beginner": 1, "Intermediate": 2, "Advanced": 3}
        missions.sort(key=lambda x: (diff_order.get(x.difficulty, 4), -x.xp))
        
        if missions:
            set_cache("default_missions", missions)
            
        return missions, rate_limited

    async def fetch_company_issues(self, query: str) -> Tuple[List[MissionCard], bool]:
        query_key = query.lower().strip()
        
        cached = get_cached(f"company_{query_key}")
        if cached:
            return cached, False

        orgs = []
        for key, org_list in ORG_MAPPING.items():
            if key in query_key or query_key in key:
                orgs.extend(org_list)
                
        if not orgs:
            orgs = [query_key]
            
        orgs = list(set(orgs))
        rate_limited = False
        all_repos = []
        
        async with httpx.AsyncClient() as client:
            repo_tasks = []
            for org in orgs:
                # Limit to 1 page to prevent huge API usage
                url = f"https://api.github.com/orgs/{org}/repos?type=public&per_page=100&sort=stars&page=1"
                repo_tasks.append(self._fetch_json(client, url))
                    
            repo_results = await asyncio.gather(*repo_tasks)
            
            for data, r_limit in repo_results:
                if r_limit:
                    rate_limited = True
                if data and isinstance(data, list):
                    for repo in data:
                        if repo.get("stargazers_count", 0) > 50:
                            all_repos.append(repo.get("full_name"))
                            
            all_repos = list(set(all_repos))[:20] # Top 20 repos max

            issue_tasks = []
            for repo in all_repos:
                urls = [
                    f"https://api.github.com/repos/{repo}/issues?labels=good+first+issue&state=open&per_page=10",
                    f"https://api.github.com/repos/{repo}/issues?labels=help+wanted&state=open&per_page=10",
                    f"https://api.github.com/repos/{repo}/issues?labels=bug&state=open&per_page=10"
                ]
                for url in urls:
                    issue_tasks.append(self._fetch_json(client, url))
                    
            issue_results = await asyncio.gather(*issue_tasks)
            
            raw_issues = []
            for data, r_limit in issue_results:
                if r_limit:
                    rate_limited = True
                if data and isinstance(data, list):
                    raw_issues.extend(data)
                    
        if not raw_issues and rate_limited:
            raw_issues = [{
                "id": f"dummy-company-1",
                "number": 999,
                "title": f"Optimize API responses",
                "labels": [{"name": "bug"}],
                "html_url": f"https://github.com/{orgs[0]}/core/issues/999",
                "comments": 2,
                "body": "Fallback issue due to API limits.",
                "created_at": "2026-05-23T00:00:00Z",
                "repository_url": f"https://api.github.com/repos/{orgs[0]}/core"
            }]
                    
        seen_ids = set()
        missions = []
        
        for item in raw_issues:
            if "pull_request" in item:
                continue
            issue_id = str(item.get("id"))
            if issue_id in seen_ids:
                continue
            seen_ids.add(issue_id)
            
            repo_url = item.get("repository_url", "")
            repo_full = "/".join(repo_url.split("/")[-2:]) if repo_url else "Unknown"
            owner = repo_full.split("/")[0] if repo_full != "Unknown" else orgs[0]
            
            difficulty, xp = self._get_difficulty_and_xp(item)
            
            missions.append(MissionCard(
                id=issue_id,
                number=item.get("number", 0),
                title=item.get("title", "Untitled"),
                repo=repo_full,
                repo_name=repo_full,
                difficulty=difficulty,
                labels=[l.get("name", "") for l in item.get("labels", [])][:3],
                skills=["Open Source", "Git"],
                github_url=item.get("html_url", ""),
                html_url=item.get("html_url", ""),
                company=owner.capitalize(),
                xp=xp,
                comments=item.get("comments", 0),
                body=item.get("body", "")[:200] + "...",
                created_at=item.get("created_at", "")
            ))
            
        diff_order = {"Beginner": 1, "Intermediate": 2, "Advanced": 3}
        missions.sort(key=lambda x: (diff_order.get(x.difficulty, 4), -x.xp))
        
        if missions:
            set_cache(f"company_{query_key}", missions)
            
        return missions, rate_limited

github_service = GitHubService()
