import logging
from typing import Any, Dict
from datetime import datetime

from LANGGRAPH.graph.state import GraphState
from LANGGRAPH.models.state import AuditLog, WorkflowStatus
from LANGGRAPH.services.supabase_service import SupabaseClient

logger = logging.getLogger(__name__)


from LANGGRAPH.config.settings import settings

async def persist_node(state: GraphState) -> Dict[str, Any]:
    """
    LangGraph node for Phase 6: Persistence.
    Saves the final Golden Record and its full audit trail to Supabase.
    """
    company_name = state.get('company_name')
    
    final_status = state.get("workflow_status") or WorkflowStatus.COMPLETED

    # Task 3: Disable persistence in DEV_MODE if configured
    if settings and settings.DEV_MODE and not settings.PERSIST_IN_DEV:
        logger.info(f"DEV_MODE: Skipping persistence for {company_name}")
        return {
            "workflow_status": final_status,
            "audit_logs": [
                AuditLog(
                    node_name="phase6_persist",
                    action="persistence",
                    details="Persistence skipped in DEV_MODE.",
                    status="success"
                )
            ]
        }
    if not company_name:
        return {
            "audit_logs": [
                AuditLog(
                    node_name="phase6_persist",
                    action="persistence",
                    details="Cannot persist: company_name missing in state.",
                    status="error"
                )
            ]
        }

    # 1. Initialize Supabase Service
    db = None
    db_init_error = None
    try:
        db = SupabaseClient()
    except Exception as e:
        db_init_error = str(e)
        logger.warning(f"Supabase connection failed: {db_init_error}. Will continue with local fallback if applicable.")

    # 2. Persist Golden Record (Mapped to 163 columns across tables)
    logger.info(f"Persisting validated intelligence for {company_name}...")
    
    db_upsert_failed = False
    record = {}
    consolidated_parameters = state.get('consolidated_parameters', {})
    try:
        from LANGGRAPH.models.schema import CompanyIntelligenceSchema
        intelligence_obj = CompanyIntelligenceSchema(**consolidated_parameters)
    except Exception as ve:
        logger.warning(f"Validation of consolidated parameters failed before persistence: {ve}")

    if db:
        try:
            record = await db.upsert_company_intelligence(
                company_id=state.get('company_id'),
                company_name=company_name,
                intelligence_data=consolidated_parameters,
                metadata={
                    "completeness": state.get('completeness_score'),
                    "retry_count": state.get('retry_count'),
                    "final_status": "validated"
                },
                provenance_metadata=state.get('provenance_metadata', {}),
                analysis_data=state.get('analysis_data')
            )
        except Exception as se:
            db_upsert_failed = True
            logger.warning(f"Supabase upsert failed (continuing to local cache): {se}")
    else:
        db_upsert_failed = True

    # 2c. Save to local validated_memory.json if quality/completeness is high
    if state.get('quality_score', 0.0) >= 80.0:
        memory_file = "validated_memory.json"
        import json
        import os
        all_mem = {}
        if os.path.exists(memory_file):
            try:
                with open(memory_file, "r", encoding="utf-8") as f:
                    all_mem = json.load(f)
            except Exception:
                all_mem = {}
        
        all_mem[company_name] = {
            "consolidated_parameters": consolidated_parameters,
            "provenance": state.get('provenance', {}),
            "provenance_metadata": state.get('provenance_metadata', {}),
            "provenance_counts": state.get('provenance_counts', {}),
            "completeness_score": state.get('completeness_score', 0.0),
            "quality_score": state.get('quality_score', 0.0),
            "analysis_json": state.get('analysis_data'),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        try:
            with open(memory_file, "w", encoding="utf-8") as f:
                json.dump(all_mem, f, indent=4, ensure_ascii=False)
            logger.info(f"  [MEMORY SAVE] Successfully cached validated company record to local memory for {company_name}")
        except Exception as me:
            logger.warning(f"Failed to write to validated_memory.json: {me}")

    # 3. Save Workflow Artifacts (Audit Trail)
    if db:
        try:
            await db.save_workflow_artifacts(
                company_name=company_name,
                audit_logs=state.get('audit_logs', []),
                provenance=state.get('provenance_metadata', {}),
                validation_report=state.get('validation_results', [])
            )
        except Exception as ae:
            logger.warning(f"Failed to save audit artifacts to Supabase: {ae}")

    persisted_company_id = record.get("company_id") if isinstance(record, dict) else state.get("company_id")
    status_detail = "Successfully persisted record and audit trail to Supabase." if not db_upsert_failed and db else "Local cache persisted; Supabase persistence partial or unavailable."
    status_level = "success" if not db_upsert_failed and db else "warning"
    return {
        "company_id": persisted_company_id,
        "persistence_metadata": {
            "supabase_record_id": persisted_company_id,
            "persisted_at": datetime.utcnow().isoformat(),
            "status": "success" if not db_upsert_failed and db else "partial"
        },
        "workflow_status": final_status,
        "audit_logs": [
            AuditLog(
                node_name="phase6_persist",
                action="persistence",
                details=status_detail,
                status=status_level
            )
        ]
    }
