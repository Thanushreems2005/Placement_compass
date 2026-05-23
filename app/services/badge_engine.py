from typing import List, Dict, Any

class BadgeEngine:
    def __init__(self):
        # Definitions of badges based on XP or PRs
        self.badge_definitions = {
            "First PR": {"condition": lambda stats: stats.get("missions_completed", 0) >= 1, "icon": "Star"},
            "Open Source Contributor": {"condition": lambda stats: stats.get("missions_completed", 0) >= 3, "icon": "GitMerge"},
            "Company Ready": {"condition": lambda stats: stats.get("total_xp", 0) >= 1000, "icon": "Target"},
            "Elite Developer": {"condition": lambda stats: stats.get("total_xp", 0) >= 5000, "icon": "Crown"},
        }

    def evaluate_badges(self, stats: Dict[str, Any]) -> List[Dict[str, str]]:
        """Evaluate which badges a student has earned."""
        earned_badges = []
        for badge_name, badge_def in self.badge_definitions.items():
            if badge_def["condition"](stats):
                earned_badges.append({
                    "name": badge_name,
                    "icon": badge_def["icon"]
                })
        return earned_badges

    def auto_tag_skills(self, verified_prs: List[Dict[str, Any]]) -> List[str]:
        """Aggregate and tier skills from all verified PRs."""
        skill_counts = {}
        for pr in verified_prs:
            for skill in pr.get("skills", []):
                skill_counts[skill] = skill_counts.get(skill, 0) + 1
        
        tagged_skills = []
        for skill, count in skill_counts.items():
            if count >= 3:
                tagged_skills.append(f"{skill} (Advanced)")
            elif count >= 1:
                tagged_skills.append(f"{skill} (Intermediate)")
        return tagged_skills

badge_engine = BadgeEngine()
