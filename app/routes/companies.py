from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from app.dependencies.auth import get_current_active_user, get_admin_user
from app.services.redis_service import redis_service

router = APIRouter(prefix="/companies", tags=["companies"])

@router.post("/", response_model=CompanyResponse)
def create_company(company_in: CompanyCreate, db: Session = Depends(get_db), admin: dict = Depends(get_admin_user)):
    db_company = Company(**company_in.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@router.get("/", response_model=List[CompanyResponse])
def get_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Company).filter(Company.is_active == True).offset(skip).limit(limit).all()

@router.get("/search/{name}")
async def search_company_by_name(name: str, response: Response, db: Session = Depends(get_db)):
    import os
    import json
    import logging
    from app.services.workflow_service import WorkflowService

    logger = logging.getLogger(__name__)

    # 0. Check Redis cache first
    cache_key = f"company_intel:{name.lower()}"
    try:
        cached_payload = await redis_service.get(cache_key)
        if cached_payload:
            logger.info(f"Redis cache HIT for company intel: {name}")
            response.headers["X-Cache"] = "HIT"
            return cached_payload
    except Exception as e:
        logger.warning(f"Failed to fetch from Redis: {e}")

    response.headers["X-Cache"] = "MISS"

    # 1. Search in FastAPI SQLite DB
    company = None
    try:
        company = db.query(Company).filter(Company.name.ilike(f"%{name}%")).first()
    except Exception as e:
        logger.warning(f"Failed to query local database for {name}: {e}")

    # 2. Search in LangGraph Golden Records (validated_memory.json)
    intelligence_data = None
    memory_path = "validated_memory.json"
    if os.path.exists(memory_path):
        try:
            with open(memory_path, "r", encoding="utf-8") as f:
                memory = json.load(f)
            if name in memory:
                intelligence_data = memory[name]
            else:
                for k, v in memory.items():
                    if name.lower() in k.lower():
                        intelligence_data = v
                        break
        except Exception as e:
            logger.warning(f"Failed to load validated_memory.json: {e}")

    # 3. Decide if we need a live pipeline run
    FAILED_FIELD_THRESHOLD = 20
    needs_dynamic_fetch = not intelligence_data
    if intelligence_data and not needs_dynamic_fetch:
        failed_count = intelligence_data.get("provenance_counts", {}).get("failed", 0)
        if failed_count == 0:
            params = intelligence_data.get("consolidated_parameters", {})
            for v in params.values():
                if isinstance(v, dict) and v.get("provider") == "failed":
                    failed_count += 1
        if failed_count > FAILED_FIELD_THRESHOLD:
            needs_dynamic_fetch = True

    if needs_dynamic_fetch:
        logger.info(f"Triggering dynamic intelligence pipeline for: {name}")
        try:
            service = WorkflowService()
            result = await service.execute_research(name)
            if result and getattr(result, 'data', None) is not None:
                intelligence_data = {
                    "consolidated_parameters": result.data,
                    "_record_updated_at": "Just now",
                    "_source": "live_pipeline",
                    "quality": {
                        "completeness_score": getattr(result.quality, "completeness_score", 100),
                        "quality_score": getattr(result.quality, "quality_score", 100),
                    },
                }
            else:
                logger.error(f"Pipeline returned no data for {name}: {getattr(result, 'error', 'unknown')}")
        except Exception as pipeline_err:
            logger.error(f"Dynamic pipeline failed for {name}: {pipeline_err}")
            if not intelligence_data:
                raise HTTPException(
                    status_code=503,
                    detail="Intelligence pipeline temporarily unavailable. Please try again later.",
                )

    if not company and not intelligence_data:
        raise HTTPException(status_code=404, detail="Company intelligence not found")

    # ── 4. Flatten all 163 parameters into a single top-level dict ────────────
    flat_params: dict = {}
    provenance_map: dict = {}
    section_map: dict = {}  # field_name -> section name (for frontend tab rendering)

    SECTIONS_ORDER = [
        "overview",
        "business_market",
        "culture_people_work",
        "learning_growth",
        "compensation_lifestyle",
        "work_logistics",
        "financials_stability",
        "tech_innovation",
        "leadership_contacts",
        "brand_digital",
    ]

    if intelligence_data:
        consolidated = intelligence_data.get("consolidated_parameters", {})
        raw_provenance = intelligence_data.get("provenance_map", {})

        for section in SECTIONS_ORDER:
            section_fields = consolidated.get(section, {})
            if not isinstance(section_fields, dict):
                continue
            for field_name, field_value in section_fields.items():
                flat_params[field_name] = field_value
                section_map[field_name] = section

                # Attach per-field provenance metadata
                prov_key = f"{section}.{field_name}"
                prov_entry = raw_provenance.get(prov_key) or raw_provenance.get(field_name)
                if isinstance(prov_entry, dict):
                    provenance_map[field_name] = {
                        "provenance": prov_entry.get("provenance", "UNVERIFIED"),
                        "confidence": prov_entry.get("confidence", 0.0),
                        "provider": prov_entry.get("provider", "unknown"),
                        "source_url": prov_entry.get("source_url"),
                        "timestamp": prov_entry.get("timestamp"),
                    }
                else:
                    provenance_map[field_name] = {
                        "provenance": "CACHE_VERIFIED",
                        "confidence": 0.95,
                        "provider": "cache",
                        "source_url": None,
                        "timestamp": intelligence_data.get("_record_updated_at"),
                    }

    populated = sum(1 for v in flat_params.values() if v is not None)

    # ── 5. Return structured response ─────────────────────────────────────────
    final_payload = {
        # Minimal identity block (from SQLite or intelligence params)
        "basic_info": {
            "id": company.id if company else None,
            "name": company.name if company else flat_params.get("name"),
            "short_name": company.short_name if company else flat_params.get("short_name"),
            "logo_url": company.logo_url if company else flat_params.get("logo_url"),
            "website_url": company.website_url if company else flat_params.get("website_url"),
            "category": company.category if company else flat_params.get("category"),
        },

        # ALL 163 intelligence parameters — flat dict, frontend-ready
        "parameters": flat_params,

        # Per-field provenance (VERIFIED / INFERRED / CACHE_VERIFIED / FAILED / NULL)
        "provenance": provenance_map,

        # Section grouping (frontend can use this to render tabs/sections)
        "section_map": section_map,

        # Quality & completeness telemetry
        "quality": {
            "completeness_score": (
                intelligence_data.get("completeness_score")
                or (intelligence_data.get("quality") or {}).get("completeness_score", 0)
                if intelligence_data else 0
            ),
            "quality_score": (
                intelligence_data.get("quality_score")
                or (intelligence_data.get("quality") or {}).get("quality_score", 0)
                if intelligence_data else 0
            ),
            "provenance_counts": intelligence_data.get("provenance_counts", {}) if intelligence_data else {},
            "total_fields": len(flat_params),
            "populated_fields": populated,
            "null_fields": len(flat_params) - populated,
        },

        # Request metadata
        "meta": {
            "company_name": name,
            "record_updated_at": intelligence_data.get("_record_updated_at") if intelligence_data else None,
            "source": intelligence_data.get("_source", "validated_memory") if intelligence_data else None,
        },
    }

    try:
        await redis_service.set(cache_key, final_payload)
    except Exception as e:
        logger.warning(f"Failed to cache in Redis: {e}")

    return final_payload


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(company_id: int, company_in: CompanyUpdate, db: Session = Depends(get_db), admin: dict = Depends(get_admin_user)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    update_data = company_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(company, k, v)

    db.commit()
    db.refresh(company)
    return company
