"""
SERA SQLAlchemy Models
"""
from sqlalchemy import Column, String, Float, Integer, DateTime, Date, Text, JSON, ForeignKey, TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
import uuid
try:
    from database.connection import Base
except ImportError:
    try:
        from backend.database.connection import Base
    except ImportError:
        from sera.backend.database.connection import Base


class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type if available, otherwise CHAR(36).
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
        else:
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(str(value))
            return value


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(200))
    equipment_type = Column(String(100))
    location = Column(String(200))
    unit = Column(String(50))
    status = Column(String(50), default="NORMAL")
    commissioned_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EquipmentCondition(Base):
    __tablename__ = "equipment_conditions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(String(50), ForeignKey("equipment.equipment_id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    week_number = Column(Integer)
    vibration = Column(Float)
    harmonic_2x = Column(Float)
    coupling_offset = Column(Float)
    bearing_temperature = Column(Float)
    motor_temperature = Column(Float)
    overall_vibration = Column(Float)
    axial_vibration = Column(Float)
    radial_vibration = Column(Float)
    status = Column(String(50))
    raw_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProductionRecord(Base):
    __tablename__ = "production_records"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(String(50), ForeignKey("equipment.equipment_id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    production_rate = Column(Float)
    pressure = Column(Float)
    feed = Column(Float)
    flow_rate = Column(Float)
    efficiency = Column(Float)
    run_status = Column(String(50))
    raw_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DowntimeRecord(Base):
    __tablename__ = "downtime_records"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(String(50), ForeignKey("equipment.equipment_id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    duration_hours = Column(Float)
    downtime_type = Column(String(100))
    cause = Column(String(500))
    production_loss = Column(Float)
    financial_loss = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(String(50), ForeignKey("equipment.equipment_id"), nullable=False)
    incident_date = Column(Date, nullable=False)
    incident_title = Column(String(300))
    problem = Column(String(500))
    root_cause = Column(String(1000))
    root_cause_category = Column(String(100))
    downtime_hours = Column(Float)
    production_loss = Column(Float)
    financial_loss = Column(Float)
    corrective_action = Column(Text)
    preventive_action = Column(Text)
    severity = Column(String(50))
    status = Column(String(50), default="CLOSED")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DetectedProblem(Base):
    __tablename__ = "detected_problems"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(String(50), ForeignKey("equipment.equipment_id"), nullable=False)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    problem_type = Column(String(200))
    severity = Column(String(50))
    evidence = Column(JSON)
    parameters = Column(JSON)
    status = Column(String(50), default="OPEN")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RCAResult(Base):
    __tablename__ = "rca_results"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    problem_id = Column(GUID(), ForeignKey("detected_problems.id"))
    equipment_id = Column(String(50), nullable=False)
    rca_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    possible_root_causes = Column(JSON)
    primary_root_cause = Column(String(500))
    confidence_level = Column(String(50))
    evidence = Column(JSON)
    similar_incidents = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    problem_id = Column(GUID(), ForeignKey("detected_problems.id"))
    rca_id = Column(GUID(), ForeignKey("rca_results.id"))
    equipment_id = Column(String(50), nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    problem_summary = Column(Text)
    root_cause_explanation = Column(Text)
    corrective_action = Column(Text)
    preventive_action = Column(Text)
    evidence = Column(JSON)
    confidence_level = Column(String(50))
    review_status = Column(String(50), default="PENDING")
    engineer_notes = Column(Text)
    reviewed_at = Column(DateTime(timezone=True))
    reviewed_by = Column(String(200))
    final_action = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class IngestionLog(Base):
    __tablename__ = "ingestion_log"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    filename = Column(String(500))
    data_category = Column(String(100))
    rows_processed = Column(Integer)
    rows_failed = Column(Integer)
    status = Column(String(50))
    error_details = Column(JSON)
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())


class Rule(Base):
    __tablename__ = "rules"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    rule_id = Column(String(100), unique=True, nullable=False)
    equipment_id = Column(String(50), nullable=True)  # Specific equipment or null for class-wide
    equipment_class = Column(String(100), nullable=True)
    parameter = Column(String(100), nullable=False)
    condition = Column(String(10), nullable=False)  # >, >=, <, <=, ==
    threshold = Column(Float, nullable=False)
    unit = Column(String(30), nullable=True)
    severity = Column(String(50), nullable=False)  # WARNING, ALARM, CRITICAL, TRIP
    source_type = Column(String(50), nullable=False)  # PLANT_LIMIT, SUPPORTING_DATA, ENGINEERING_STANDARD, DATA_DRIVEN, PROJECT_ASSUMPTION
    source_reference = Column(String(300), nullable=False)
    rationale = Column(Text, nullable=False)
    active = Column(Integer, default=1)  # 1 = active, 0 = inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(String(50), ForeignKey("equipment.equipment_id"), nullable=False)
    recommendation_id = Column(GUID(), ForeignKey("recommendations.id"), nullable=True)
    maintenance_date = Column(DateTime(timezone=True), nullable=False)
    action_taken = Column(Text, nullable=False)
    before_condition = Column(JSON, nullable=False)  # Readings before maintenance
    after_condition = Column(JSON, nullable=False)   # Readings after maintenance
    verification_result = Column(String(100), nullable=False)  # e.g., VERIFIED_RECOVERED, PARTIAL, UNRESOLVED
    parameter_deltas = Column(JSON, nullable=True)   # Change in vibration, temp, offset
    engineer_notes = Column(Text, nullable=True)
    verified_by = Column(String(200), default="Lead Reliability Engineer")
    verified_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WorkOrderRecommendation(Base):
    __tablename__ = "work_order_recommendations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    work_order_reference = Column(String(100), unique=True, nullable=False)
    recommendation_id = Column(GUID(), ForeignKey("recommendations.id"), nullable=True)
    equipment = Column(String(50), ForeignKey("equipment.equipment_id"), nullable=False)
    priority = Column(String(50), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    recommended_action = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    required_inspection = Column(Text, nullable=False)
    requested_timing = Column(String(100), nullable=False)
    engineer_approval_status = Column(String(50), default="DRAFT")  # DRAFT, APPROVED, PENDING_REVIEW, REJECTED
    operations = Column(JSON, nullable=True)
    required_parts = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AuditTrail(Base):
    __tablename__ = "audit_trail"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    action = Column(String(100), nullable=False)  # INGESTION, DETECTION, RECOMMENDATION, REVIEW_ACCEPT, REVIEW_MODIFY, REVIEW_REJECT, WORK_ORDER_DRAFT, VERIFICATION
    entity = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False)
    user_actor = Column(String(200), default="SYSTEM")
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    details = Column(JSON, nullable=True)


def log_audit(
    db,
    action: str,
    entity: str,
    entity_id: str,
    user_actor: str = "SYSTEM",
    previous_state=None,
    new_state=None,
    details=None,
):
    """Utility helper to record traceable audit trail entries across the SERA system."""
    try:
        entry = AuditTrail(
            action=action,
            entity=entity,
            entity_id=str(entity_id),
            user_actor=user_actor,
            previous_state=previous_state,
            new_state=new_state,
            details=details,
        )
        db.add(entry)
        db.commit()
        return entry
    except Exception as e:
        print(f"[AUDIT] Warning: could not write audit log: {e}")
        return None

