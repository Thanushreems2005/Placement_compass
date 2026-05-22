import logging
import httpx
from typing import Dict, Any, List, Optional
from LANGGRAPH.services.search_service import SearchService
from LANGGRAPH.models.schema import CompanyIntelligenceSchema

logger = logging.getLogger(__name__)

class StagingParametersOrchestrator:
    """
    Orchestration layer that retrieves parameters from the staging_company table
    on the secondary database and connects them to the search query keywords.
    """
    
    SECONDARY_URL = "https://hkwessehtaonqaakzyvj.supabase.co/rest/v1/staging_company"
    SECONDARY_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8"

    def __init__(self):
        self.search_queries = SearchService.SECTION_QUERIES
        self._schema_mapping = self._build_schema_section_mapping()

    def _build_schema_section_mapping(self) -> Dict[str, str]:
        """
        Builds a map of flat field names to their respective schema section names.
        This maps each of the 163 fields to its parent container (overview, financials, etc.).
        """
        mapping = {}
        
        # Instantiate schema to inspect fields
        from LANGGRAPH.models.schema import (
            CompanyOverview, BusinessMarket, CulturePeopleWork, LearningGrowth,
            CompensationLifestyle, WorkLogistics, FinancialsStability,
            TechInnovation, LeadershipContacts, BrandDigital
        )
        
        sections = {
            "overview": CompanyOverview,
            "business_market": BusinessMarket,
            "culture_people_work": CulturePeopleWork,
            "learning_growth": LearningGrowth,
            "compensation_lifestyle": CompensationLifestyle,
            "work_logistics": WorkLogistics,
            "financials_stability": FinancialsStability,
            "tech_innovation": TechInnovation,
            "leadership_contacts": LeadershipContacts,
            "brand_digital": BrandDigital
        }
        
        for section_name, model_cls in sections.items():
            fields_source = getattr(model_cls, "model_fields", getattr(model_cls, "__fields__", {}))
            for field_name in fields_source.keys():
                mapping[field_name] = section_name
                
        # Handle field aliases or fallback manual overrides
        alias_overrides = {
            "rd_investment_percentage": "financials_stability",
            "clv": "financials_stability",
            "ltv": "financials_stability",
            "cac": "financials_stability",
            "nps": "brand_digital",
            "esops_incentives": "compensation_lifestyle",
        }
        mapping.update(alias_overrides)
        
        return mapping

    async def fetch_first_staging_row(self, company_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetches the matching row from the staging_company table in the secondary Supabase DB.
        """
        headers = {
            "apikey": self.SECONDARY_KEY,
            "Authorization": f"Bearer {self.SECONDARY_KEY}"
        }
        
        if company_name:
            import urllib.parse
            # Standard URL-encoding of parameters to handle spaces and symbols safely
            clean_name = company_name.split(",")[0].split()[0] # Search first word to maximize matching potential
            url = f"{self.SECONDARY_URL}?name=ilike.*{urllib.parse.quote(clean_name)}*&limit=1"
        else:
            url = f"{self.SECONDARY_URL}?select=*&limit=1"
            
        logger.info(f"Fetching staging record for target: '{company_name or 'Default First Row'}'...")
        async with httpx.AsyncClient() as client:
            try:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    if data:
                        logger.info(f"Successfully retrieved staging record for company: {data[0].get('name', 'Unknown')}")
                        return data[0]
                    else:
                        logger.warning(f"No staging record found matching target '{company_name}'.")
                        if company_name:
                            # Fallback to default first row
                            return await self.fetch_first_staging_row(None)
                        return {}
                else:
                    logger.error(f"Failed to fetch staging record: {res.status_code} - {res.text}")
                    return {}
            except Exception as e:
                logger.error(f"Error fetching staging record: {e}")
                return {}

    async def connect_staging_parameters_to_keywords(self) -> Dict[str, Dict[str, Any]]:
        """
        Considers the 1st row of staging_company as the parameter sources and
        connects them to the orchestration section query keywords.
        """
        staging_row = await self.fetch_first_staging_row()
        if not staging_row:
            logger.warning("No staging row found to map parameters.")
            return {}
            
        connected_parameters = {}
        
        # Iterate over all fields present in the staging record
        for field, value in staging_row.items():
            # Skip database operational fields
            if field in ("company_id", "updated_at", "created_at"):
                continue
                
            # Determine which section this parameter belongs to
            section = self._schema_mapping.get(field, "unknown")
            
            # Retrieve search query template for the section
            query_template = self.search_queries.get(section, "{company} general info")
            
            connected_parameters[field] = {
                "staging_value": value,
                "section": section,
                "query_template": query_template,
                "has_valid_staging_value": value is not None and str(value).strip().lower() not in ("null", "none", "n/a", "")
            }
            
        return connected_parameters
