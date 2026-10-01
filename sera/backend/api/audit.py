"""
Audit Trail API — Comprehensive traceability across ingestion, detection, RCA, review, work orders, and verification.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from database.connection import get_db
from models.db_models import AuditTrail

router = APIRouter()


@router.get("")
@router.get("/trail")
def list_audit_trail(
    action: Optional[str] = Query(None, description="Filter by action, e.g. INGESTION, DETECTION, REVIEW_ACCEPTED"),
    entity: Optional[str] = Query(None, description="Filter by entity type, e.g. Equipment, Recommendation"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID, e.g. BL-5702"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieve chronologically ordered audit trail records across all lifecycle stages."""
    query = db.query(AuditTrail).order_by(AuditTrail.timestamp.desc())

    if action:
        query = query.filter(AuditTrail.action == action.upper())
    if entity:
        query = query.filter(AuditTrail.entity == entity)
    if entity_id:
        query = query.filter(
            (AuditTrail.entity_id == entity_id.upper()) |
            (AuditTrail.details.like(f"%{entity_id.upper()}%"))
        )

    records = query.limit(limit).all()

    return [
        {
            "id": str(r.id),
            "action": r.action,
            "entity": r.entity,
            "entity_id": r.entity_id,
            "user_actor": r.user_actor,
            "timestamp": str(r.timestamp),
            "previous_state": r.previous_state,
            "new_state": r.new_state,
            "details": r.details,
        }
        for r in records
    ]
