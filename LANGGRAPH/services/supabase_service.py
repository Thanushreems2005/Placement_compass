import os
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging

from supabase import create_client, Client
from LANGGRAPH.models.state import AuditLog, ProvenanceMetadata, ValidationResult

logger = logging.getLogger(__name__)


class SupabaseClient:
    """
    Centralized service for async interaction with Supabase.
    Supports upserting company intelligence and persisting workflow metadata.
    """

    def __init__(self):
        # Prioritize root .env keys
        self.url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
        self.service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY", "")
        self.anon_key = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
        self.write_enabled = bool(self.service_role_key)

        if not self.url:
            logger.error("SUPABASE_URL is missing! Cannot initialize Supabase client.")
            raise ValueError("Supabase URL missing from environment.")

        if self.service_role_key:
            self.key = self.service_role_key
        elif self.anon_key:
            self.key = self.anon_key
            self.write_enabled = False
            logger.warning(
                "No Supabase service role key configured. Using anon key fallback for reads only; writes may fail if RLS prevents them. "
                "Set SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY for write-enabled persistence."
            )
        else:
            logger.error("No Supabase API key configured. Please set VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.")
            raise ValueError("Supabase API key missing from environment.")

        self.client: Client = create_client(self.url, self.key)

    def _serialize_models(self, data: List[Any]) -> List[Dict[str, Any]]:
        """Converts Pydantic models in a list to serializable dicts."""
        return [item.dict() if hasattr(item, "dict") else item for item in data]

    def _get_allowed_columns(self) -> List[str]:
        return [
            'company_id', 'name', 'short_name', 'category', 'incorporation_year', 
            'nature_of_company', 'headquarters_address', 'office_count', 'employee_size', 
            'website_url', 'linkedin_url', 'twitter_handle', 'facebook_url', 'instagram_url', 
            'primary_contact_email', 'primary_phone_number', 'overview_text', 
            'vision_statement', 'mission_statement', 'legal_issues', 'carbon_footprint',
            'updated_at'
        ]

    def _insert_self_healing(self, table_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Robust, self-healing helper that inserts a payload into a table.
        Automatically filters out columns that do not exist in the schema cache.
        Includes a 3-pass retry backoff for transient connectivity or rate-limit issues.
        """
        import re
        import time
        current_payload = dict(payload)
        max_attempts = len(payload) + 1
        attempt = 0
        
        while attempt < max_attempts:
            for retry in range(3):
                try:
                    response = self.client.table(table_name).insert(current_payload).execute()
                    return response.data[0] if (response.data and len(response.data) > 0) else {}
                except Exception as e:
                    err_msg = str(e)
                    is_transient = any(kw in err_msg.lower() for kw in ("timeout", "connection", "502", "503", "504", "rate limit"))
                    if is_transient and retry < 2:
                        sleep_time = (retry + 1) * 2.0
                        logger.info(f"Transient error detected: '{err_msg}'. Retrying insert in {sleep_time}s...")
                        time.sleep(sleep_time)
                        continue
                        
                    if "PGRST204" in err_msg or "Could not find the" in err_msg:
                        match = re.search(r"Could not find the '([^']+)' column", err_msg)
                        if match:
                            missing_col = match.group(1)
                            logger.info(f"Dynamically filtering out unknown column '{missing_col}' from {table_name} insert payload.")
                            if missing_col in current_payload:
                                del current_payload[missing_col]
                                attempt += 1
                                break
                    logger.warning(f"Self-healing insert failed for {table_name}: {err_msg}")
                    raise
            else:
                attempt += 1

    def _upsert_self_healing(self, table_name: str, payload: Dict[str, Any], on_conflict: str) -> Dict[str, Any]:
        """
        Robust, self-healing helper that upserts a payload into a table.
        Automatically filters out columns that do not exist in the schema cache.
        Includes a 3-pass retry backoff for transient connectivity or rate-limit issues.
        """
        import re
        import time
        current_payload = dict(payload)
        max_attempts = len(payload) + 1
        attempt = 0
        
        while attempt < max_attempts:
            for retry in range(3):
                try:
                    response = self.client.table(table_name).upsert(current_payload, on_conflict=on_conflict).execute()
                    return response.data[0] if (response.data and len(response.data) > 0) else {}
                except Exception as e:
                    err_msg = str(e)
                    is_transient = any(kw in err_msg.lower() for kw in ("timeout", "connection", "502", "503", "504", "rate limit"))
                    if is_transient and retry < 2:
                        sleep_time = (retry + 1) * 2.0
                        logger.info(f"Transient error detected: '{err_msg}'. Retrying upsert in {sleep_time}s...")
                        time.sleep(sleep_time)
                        continue
                        
                    if "PGRST204" in err_msg or "Could not find the" in err_msg:
                        match = re.search(r"Could not find the '([^']+)' column", err_msg)
                        if match:
                            missing_col = match.group(1)
                            logger.info(f"Dynamically filtering out unknown column '{missing_col}' from {table_name} upsert payload.")
                            if missing_col in current_payload:
                                del current_payload[missing_col]
                                attempt += 1
                                break
                    logger.warning(f"Self-healing upsert failed for {table_name}: {err_msg}")
                    raise
            else:
                attempt += 1

    async def upsert_company_intelligence(
        self,
        company_id: Optional[str],
        company_name: str,
        intelligence_data: Dict[str, Any], # Hierarchical structured dictionary
        metadata: Dict[str, Any],
        provenance_metadata: Optional[Dict[str, Any]] = None,
        analysis_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Synchronizes all updates across primary and auxiliary tables:
        1. Primary 'companies' table (Overview)
        2. 'company_financials' table (FinancialsStability)
        3. 'company_culture' table (CulturePeopleWork)
        4. 'company_logistics' table (WorkLogistics)
        5. 'company_json' table (Spreads all 163 fields flat into full_json, with lineage in full_json.provenance)
        """
        # A. Upsert to primary 'companies' table first to acquire/confirm company_id
        overview_data = dict(intelligence_data.get("overview") or {})
        overview_payload = dict(overview_data)
        overview_payload["name"] = company_name
        if company_id:
            overview_payload["company_id"] = company_id
            
        allowed_columns = self._get_allowed_columns()
        filtered_overview = {k: v for k, v in overview_payload.items() if k in allowed_columns}
        
        try:
            # Check if company already exists by name
            comp_lookup = self.client.table("companies").select("company_id").eq("name", company_name).execute()
            existing_id = None
            if comp_lookup.data:
                existing_id = comp_lookup.data[0].get("company_id")

            if existing_id:
                # It exists! Update it using company_id constraint
                filtered_overview["company_id"] = existing_id
                primary_res = self._upsert_self_healing("companies", filtered_overview, on_conflict="company_id")
                comp_id = existing_id
            else:
                # It is new! Insert it
                primary_res = self._insert_self_healing("companies", filtered_overview)
                comp_id = primary_res.get("company_id")
                if not comp_id:
                    # Fallback lookup
                    comp_lookup2 = self.client.table("companies").select("company_id").eq("name", company_name).execute()
                    if comp_lookup2.data:
                        comp_id = comp_lookup2.data[0].get("company_id")
            
            if not comp_id:
                raise ValueError(f"Could not retrieve company_id for {company_name}")
                
            logger.info(f"Successfully upserted companies primary record. CompanyID: {comp_id}")
            
            # Auxiliary tables alias mapping helper
            def map_aliases(data_dict: Dict[str, Any]) -> Dict[str, Any]:
                mapped = dict(data_dict)
                aliases = {
                    "cac": "customer_acquisition_cost",
                    "clv": "customer_lifetime_value",
                    "ltv": "customer_lifetime_value",
                    "nps": "net_promoter_score",
                    "esg_ratings": "sustainability_csr",
                    "mission_clarity": "mission_statement",
                    "vision_statement": "vision_statement",
                }
                for schema_key, db_key in aliases.items():
                    if schema_key in mapped and mapped[schema_key] is not None:
                        mapped[db_key] = mapped[schema_key]
                return mapped

            # B. Upsert to auxiliary table 'company_financials'
            financials_data = dict(intelligence_data.get("financials_stability") or {})
            financials_payload = map_aliases(dict(financials_data))
            financials_payload["company_id"] = comp_id
            try:
                self._upsert_self_healing("company_financials", financials_payload, on_conflict="company_id")
                logger.info("Successfully synced company_financials table.")
            except Exception as fe:
                logger.warning(f"Failed auxiliary sync for company_financials: {fe}")
                
            # C. Upsert to auxiliary table 'company_culture'
            culture_data = dict(intelligence_data.get("culture_people_work") or {})
            culture_payload = map_aliases(dict(culture_data))
            culture_payload["company_id"] = comp_id
            try:
                self._upsert_self_healing("company_culture", culture_payload, on_conflict="company_id")
                logger.info("Successfully synced company_culture table.")
            except Exception as ce:
                logger.warning(f"Failed auxiliary sync for company_culture: {ce}")
                
            # D. Upsert to auxiliary table 'company_logistics'
            logistics_data = dict(intelligence_data.get("work_logistics") or {})
            logistics_payload = map_aliases(dict(logistics_data))
            logistics_payload["company_id"] = comp_id
            try:
                self._upsert_self_healing("company_logistics", logistics_payload, on_conflict="company_id")
                logger.info("Successfully synced company_logistics table.")
            except Exception as le:
                logger.warning(f"Failed auxiliary sync for company_logistics: {le}")
                
            # E. Upsert to 'company_json' table
            # Spread all 163 fields flat into full_json
            full_json = {}
            for sec_name, sec_fields in intelligence_data.items():
                if isinstance(sec_fields, dict):
                    full_json.update(sec_fields)
            
            # Map aliases inside full_json while retaining original schema keys
            full_json = map_aliases(full_json)
            
            # Save the complete detailed provenance metadata inside full_json["provenance"]
            full_json["provenance"] = provenance_metadata or {}
            
            if analysis_data:
                full_json["analysis_json"] = analysis_data
            
            short_json = dict(overview_data)
            
            company_json_payload = {
                "company_id": comp_id,
                "full_json": full_json,
                "short_json": short_json,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            try:
                self._upsert_self_healing("company_json", company_json_payload, on_conflict="company_id")
                logger.info("Successfully synced company_json table.")
            except Exception as je:
                logger.warning(f"Failed auxiliary sync for company_json: {je}")
                
            # Auxiliary sync for separate company_analysis table
            if analysis_data:
                # G. Retrieve previous analysis for historical delta tracking
                previous_analysis = None
                try:
                    prev_res = self.client.table("company_analysis").select("analysis_json").eq("company_id", comp_id).execute()
                    if prev_res.data:
                        previous_analysis = prev_res.data[0].get("analysis_json")
                except Exception as pe:
                    logger.warning(f"Could not fetch previous analysis for delta comparison: {pe}")

                company_analysis_payload = {
                    "company_id": comp_id,
                    "analysis_json": analysis_data,
                    "updated_at": datetime.utcnow().isoformat()
                }
                try:
                    self._upsert_self_healing("company_analysis", company_analysis_payload, on_conflict="company_id")
                    logger.info("Successfully synced company_analysis table.")
                except Exception as ae:
                    logger.warning(f"Failed auxiliary sync for company_analysis: {ae}")

                # H. Persist historical comparison, trends, stability changes, valuation movement, trajectory deltas
                try:
                    def calculate_analysis_deltas(curr: Dict[str, Any], prev: Optional[Dict[str, Any]]) -> Dict[str, Any]:
                        if not prev:
                            return {
                                "status": "initial_run",
                                "message": "First strategic intelligence run - no historical deltas available."
                            }
                            
                        deltas = {}
                        for score_field in ["enterprise_stability_score", "innovation_score", "digital_maturity_score"]:
                            curr_val = curr.get(score_field) or 0
                            prev_val = prev.get(score_field) or 0
                            try:
                                curr_val = int(curr_val)
                                prev_val = int(prev_val)
                                deltas[score_field] = {
                                    "previous": prev_val,
                                    "current": curr_val,
                                    "delta": curr_val - prev_val
                                }
                            except Exception:
                                pass
                                
                        qualitative_fields = {
                            "valuation_movement": ("financial_health_analysis", "valuation"),
                            "growth_movement": ("growth_signals", "yoy_growth_rate"),
                            "leadership_changes": ("executive_summary", "ceo_name")
                        }
                        
                        for delta_key, (analysis_field, check_keyword) in qualitative_fields.items():
                            curr_text = str(curr.get(analysis_field) or "")
                            prev_text = str(prev.get(analysis_field) or "")
                            if curr_text != prev_text and len(curr_text) > 20 and len(prev_text) > 20:
                                deltas[delta_key] = {
                                    "status": "changed",
                                    "previous_insight": prev_text[:120] + "...",
                                    "current_insight": curr_text[:120] + "..."
                                }
                            else:
                                deltas[delta_key] = {
                                    "status": "stable"
                                }
                                
                        return deltas

                    score_deltas = calculate_analysis_deltas(analysis_data, previous_analysis)
                    
                    # Track trajectory analysis
                    traj_str = "Trajectory is stable."
                    stability_delta = score_deltas.get("enterprise_stability_score", {}).get("delta", 0)
                    if stability_delta > 5:
                        traj_str = "Strong upward trajectory with improving enterprise stability."
                    elif stability_delta < -5:
                        traj_str = "Downward trajectory flagged due to increased operational or financial risks."
                        
                    historical_payload = {
                        "company_id": comp_id,
                        "analysis_json": analysis_data,
                        "previous_analysis_json": previous_analysis,
                        "confidence_score": analysis_data.get("metrics", {}).get("confidence_score", 0.0),
                        "consensus_agreement_score": analysis_data.get("metrics", {}).get("consensus_agreement_score", 0.0),
                        "score_deltas": score_deltas,
                        "trajectory_analysis": traj_str,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    self._insert_self_healing("historical_company_analysis", historical_payload)
                    logger.info("Successfully persisted historical trajectory to historical_company_analysis table.")
                except Exception as he:
                    logger.warning(f"Failed to sync historical trajectory (likely table missing, self-healing ignored): {he}")
            
            return primary_res
            
        except Exception as e:
            logger.error(f"Supabase Multi-Table Upsert failed for {company_name}: {str(e)}")
            raise


    async def save_workflow_artifacts(self, company_name: str, audit_logs: List[Any], provenance: Any, validation_report: List[Any]):
        """
        Saves the complete audit trail and metadata for a research run.
        """
        try:
            # Handle Pydantic models vs dicts
            serialized_logs = self._serialize_models(audit_logs or [])
            serialized_report = self._serialize_models(validation_report or [])
            serialized_provenance = provenance.dict() if hasattr(provenance, "dict") else provenance
            
            payload = {
                "company_name": company_name,
                "audit_logs": serialized_logs,
                "provenance": serialized_provenance,
                "validation_report": serialized_report,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Note: Ensure you have an 'audit_history' table in Supabase
            try:
                self._insert_self_healing("audit_history", payload)
                logger.info(f"Successfully saved workflow artifacts for {company_name}")
            except Exception as se:
                logger.warning(f"Audit persistence failed (likely table missing): {str(se)}")
            
        except Exception as e:
            logger.warning(f"Audit persistence failed: {str(e)}")

    def save_workflow_run(self, run_data: Dict[str, Any]):
        """
        Saves a full workflow run execution to the history table.
        """
        try:
            # Handle datetime serialization for history
            def json_serial(obj):
                if isinstance(obj, (datetime)):
                    return obj.isoformat()
                return str(obj)

            # Convert entire dict to JSON-safe format
            clean_run_data = json.loads(json.dumps(run_data, default=json_serial))
            
            # Dynamically lookup company_id from companies table using company_name
            company_id = clean_run_data.get("company_id")
            if not company_id:
                company_name = clean_run_data.get("company_name")
                if company_name:
                    try:
                        comp_res = self.client.table("companies").select("company_id").eq("name", company_name).execute()
                        if comp_res.data:
                            company_id = comp_res.data[0].get("company_id")
                    except Exception as ce:
                        logger.warning(f"Could not look up company_id for {company_name}: {ce}")
            
            # Map clean_run_data into the actual schema of the company_history table:
            # company_id (integer) and history_timeline (jsonb)
            payload = {}
            if company_id:
                payload["company_id"] = company_id
            payload["history_timeline"] = clean_run_data
            
            try:
                self._insert_self_healing("company_history", payload)
                logger.info(f"Persisted RunID: {run_data.get('run_id')} to history")
            except Exception as se:
                logger.warning(f"Could not save run to history table: {str(se)}")
        except Exception as e:
            logger.warning(f"Could not save run to history: {str(e)}")

    def get_all_workflow_runs(self) -> List[Dict[str, Any]]:
        """Retrieves history."""
        try:
            try:
                response = self.client.table("workflow_history").select("*").order("run_id", desc=True).execute()
                return response.data
            except Exception:
                response = self.client.table("company_history").select("*").execute()
                runs = []
                for row in (response.data or []):
                    timeline = row.get("history_timeline")
                    if isinstance(timeline, dict):
                        runs.append(timeline)
                return runs
        except Exception as e:
            logger.error(f"Failed to fetch history: {str(e)}")
            return []

    def get_hierarchical_memory(self, company_name: str) -> Dict[str, Any]:
        """
        Retrieves Hierarchical Enterprise Memory from Supabase (7 Tiers):
        1. Canonical validated schema (163 fields)
        2. Historical strategic summaries
        3. Source lineage metadata
        4. Previous reasoning snapshots
        5. Trend intelligence
        6. Provider confidence history
        7. Regeneration history
        """
        memory = {
            "canonical_record": {},
            "historical_summaries": [],
            "source_lineage": {},
            "reasoning_snapshots": [],
            "trend_intelligence": {},
            "provider_confidence_history": [],
            "regeneration_history": []
        }
        
        try:
            # Tier 1 & 3: Canonical validated schema & Source lineage
            comp_res = self.client.table("companies").select("*").eq("name", company_name).execute()
            if not comp_res.data:
                return memory
                
            companies_row = comp_res.data[0]
            comp_id = companies_row.get("company_id")
            
            # A. Seed canonical_record with primary table columns (overview and business_market)
            allowed_columns = self._get_allowed_columns()
            for col, val in companies_row.items():
                if val is not None and col not in ("company_id", "updated_at", "created_at"):
                    if col == "mission_statement":
                        memory["canonical_record"]["mission_clarity"] = val
                    elif col == "vision_statement":
                        memory["canonical_record"]["vision_statement"] = val
                    elif col in allowed_columns:
                        memory["canonical_record"][col] = val

            # B. Seed with company_financials
            try:
                fin_res = self.client.table("company_financials").select("*").eq("company_id", comp_id).execute()
                if fin_res.data:
                    fin_row = fin_res.data[0]
                    for col, val in fin_row.items():
                        if val is not None and col not in ("company_financials_id", "company_id", "updated_at", "created_at"):
                            if col == "customer_acquisition_cost":
                                memory["canonical_record"]["cac"] = val
                            elif col == "customer_lifetime_value":
                                memory["canonical_record"]["clv"] = val
                                memory["canonical_record"]["ltv"] = val
                            elif col == "net_promoter_score":
                                memory["canonical_record"]["nps"] = val
                            elif col == "sustainability_csr":
                                memory["canonical_record"]["esg_ratings"] = val
                            elif col in allowed_columns:
                                memory["canonical_record"][col] = val
            except Exception as fe:
                logger.warning(f"Hydration from company_financials failed: {fe}")

            # C. Seed with company_culture
            try:
                cul_res = self.client.table("company_culture").select("*").eq("company_id", comp_id).execute()
                if cul_res.data:
                    cul_row = cul_res.data[0]
                    for col, val in cul_row.items():
                        if val is not None and col not in ("company_culture_id", "company_id", "updated_at", "created_at"):
                            if col == "mission_clarity":
                                memory["canonical_record"]["mission_clarity"] = val
                            elif col in allowed_columns:
                                memory["canonical_record"][col] = val
            except Exception as ce:
                logger.warning(f"Hydration from company_culture failed: {ce}")

            # D. Seed with company_logistics
            try:
                log_res = self.client.table("company_logistics").select("*").eq("company_id", comp_id).execute()
                if log_res.data:
                    log_row = log_res.data[0]
                    for col, val in log_row.items():
                        if val is not None and col not in ("company_logistics_id", "company_id", "updated_at", "created_at"):
                            if col in allowed_columns:
                                memory["canonical_record"][col] = val
            except Exception as le:
                logger.warning(f"Hydration from company_logistics failed: {le}")

            # E. Overlay company_json to pull any remaining structured fields
            json_res = self.client.table("company_json").select("full_json").eq("company_id", comp_id).execute()
            if json_res.data:
                full_json = json_res.data[0].get("full_json") or {}
                for k, v in full_json.items():
                    if k != "provenance" and v is not None and str(v).strip().lower() not in ("null", "none", "n/a", ""):
                        memory["canonical_record"][k] = v
                if full_json.get("provenance"):
                    memory["source_lineage"] = full_json.get("provenance") or {}
                
            # E2. Seed previous full analysis json
            try:
                ana_res = self.client.table("company_analysis").select("analysis_json").eq("company_id", comp_id).execute()
                if ana_res.data:
                    memory["analysis_json"] = ana_res.data[0].get("analysis_json")
            except Exception as ae:
                logger.warning(f"Hydration from company_analysis failed: {ae}")
                
            # Tier 2, 5 & 6: Historical strategic summaries, Trend intelligence & Provider confidence history
            try:
                hist_res = self.client.table("historical_company_analysis").select("*").eq("company_id", comp_id).order("updated_at", desc=True).limit(5).execute()
                if hist_res.data:
                    for row in hist_res.data:
                        memory["historical_summaries"].append({
                            "summary": row.get("analysis_json", {}).get("executive_summary", "INSUFFICIENT_VALIDATED_DATA"),
                            "timestamp": row.get("updated_at")
                        })
                        memory["provider_confidence_history"].append({
                            "confidence": row.get("confidence_score", 0.0),
                            "agreement": row.get("consensus_agreement_score", 0.0),
                            "timestamp": row.get("updated_at")
                        })
                    
                    # Compute trend intelligence
                    latest_row = hist_res.data[0]
                    memory["trend_intelligence"] = {
                        "score_deltas": latest_row.get("score_deltas") or {},
                        "trajectory": latest_row.get("trajectory_analysis") or "Stable"
                    }
            except Exception as e:
                logger.warning(f"Failed to fetch Tier 2, 5, 6 memory: {e}")
                
            # Tier 4 & 7: Reasoning snapshots & Regeneration history
            try:
                snap_res = self.client.table("company_history").select("history_timeline").eq("company_id", comp_id).limit(5).execute()
                if snap_res.data:
                    for row in snap_res.data:
                        timeline = row.get("history_timeline") or {}
                        memory["reasoning_snapshots"].append({
                            "run_id": timeline.get("run_id"),
                            "status": timeline.get("status"),
                            "timestamp": timeline.get("timestamp")
                        })
                        prov = timeline.get("quality", {}).get("provenance", {})
                        if prov.get("regenerated_fields"):
                            memory["regeneration_history"].extend(prov.get("regenerated_fields"))
            except Exception as e:
                logger.warning(f"Failed to fetch Tier 4, 7 memory: {e}")
                
        except Exception as e:
            logger.warning(f"Hierarchical Memory Retrieval failed: {e}")
            
        return memory

    def get_company_intelligence(self, company_name: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves existing company intelligence from Supabase using the Hierarchical Memory Engine.
        """
        try:
            hierarchical_mem = self.get_hierarchical_memory(company_name)
            if hierarchical_mem and hierarchical_mem.get("canonical_record"):
                # Reconstruct full_json containing flat 163 fields and "provenance" plus the extra tiers for downstream use
                full_json = dict(hierarchical_mem["canonical_record"])
                full_json["provenance"] = hierarchical_mem["source_lineage"]
                full_json["analysis_json"] = hierarchical_mem.get("analysis_json")
                # Embed other tiers inside full_json so it's transparently passed downstream to FieldCache & GraphState
                full_json["_hierarchical_memory"] = hierarchical_mem
                return full_json
        except Exception as e:
            logger.warning(f"Failed to fetch Hierarchical Memory: {e}")
        return None
