-- SERA Database Schema
-- System for Equipment Reliability Assessment

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Equipment master table
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200),
    equipment_type VARCHAR(100),
    location VARCHAR(200),
    unit VARCHAR(50),
    status VARCHAR(50) DEFAULT 'NORMAL', -- NORMAL, WARNING, ALARM, CRITICAL, TRIP
    commissioned_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment condition records (vibration, temperature, etc.)
CREATE TABLE IF NOT EXISTS equipment_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id),
    timestamp TIMESTAMPTZ NOT NULL,
    week_number INTEGER,
    vibration FLOAT,
    harmonic_2x FLOAT,
    coupling_offset FLOAT,
    bearing_temperature FLOAT,
    motor_temperature FLOAT,
    overall_vibration FLOAT,
    axial_vibration FLOAT,
    radial_vibration FLOAT,
    status VARCHAR(50), -- NORMAL, WARNING, ALARM, TRIP
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production records
CREATE TABLE IF NOT EXISTS production_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id),
    timestamp TIMESTAMPTZ NOT NULL,
    production_rate FLOAT,
    pressure FLOAT,
    feed FLOAT,
    flow_rate FLOAT,
    efficiency FLOAT,
    run_status VARCHAR(50), -- RUNNING, STOPPED, MAINTENANCE
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Downtime records
CREATE TABLE IF NOT EXISTS downtime_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_hours FLOAT,
    downtime_type VARCHAR(100), -- PLANNED, UNPLANNED, BREAKDOWN
    cause VARCHAR(500),
    production_loss FLOAT,
    financial_loss FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident / historical failure database
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id),
    incident_date DATE NOT NULL,
    incident_title VARCHAR(300),
    problem VARCHAR(500),
    root_cause VARCHAR(1000),
    root_cause_category VARCHAR(100), -- MECHANICAL, ELECTRICAL, PROCESS, HUMAN
    downtime_hours FLOAT,
    production_loss FLOAT,
    financial_loss FLOAT,
    corrective_action TEXT,
    preventive_action TEXT,
    severity VARCHAR(50), -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(50) DEFAULT 'CLOSED', -- OPEN, IN_PROGRESS, CLOSED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detected problems (output of detection engine)
CREATE TABLE IF NOT EXISTS detected_problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    problem_type VARCHAR(200),
    severity VARCHAR(50), -- LOW, MEDIUM, HIGH, CRITICAL
    evidence JSONB,
    parameters JSONB,
    status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, ACKNOWLEDGED, RESOLVED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RCA results
CREATE TABLE IF NOT EXISTS rca_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem_id UUID REFERENCES detected_problems(id),
    equipment_id VARCHAR(50) NOT NULL,
    rca_timestamp TIMESTAMPTZ DEFAULT NOW(),
    possible_root_causes JSONB,
    primary_root_cause VARCHAR(500),
    confidence_level VARCHAR(50), -- LOW, MEDIUM, HIGH
    evidence JSONB,
    similar_incidents JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem_id UUID REFERENCES detected_problems(id),
    rca_id UUID REFERENCES rca_results(id),
    equipment_id VARCHAR(50) NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    problem_summary TEXT,
    root_cause_explanation TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    evidence JSONB,
    confidence_level VARCHAR(50),
    review_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, ACCEPTED, MODIFIED, REJECTED
    engineer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by VARCHAR(200),
    final_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rules table (deterministic rule engine and traceability)
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id VARCHAR(100) UNIQUE NOT NULL,
    equipment_id VARCHAR(50),
    equipment_class VARCHAR(100),
    parameter VARCHAR(100) NOT NULL,
    condition VARCHAR(10) NOT NULL,
    threshold FLOAT NOT NULL,
    unit VARCHAR(30),
    severity VARCHAR(50) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_reference VARCHAR(300) NOT NULL,
    rationale TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-up and verification table
CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id),
    recommendation_id UUID REFERENCES recommendations(id),
    maintenance_date TIMESTAMPTZ NOT NULL,
    action_taken TEXT NOT NULL,
    before_condition JSONB NOT NULL,
    after_condition JSONB NOT NULL,
    verification_result VARCHAR(100) NOT NULL,
    parameter_deltas JSONB,
    engineer_notes TEXT,
    verified_by VARCHAR(200) DEFAULT 'Lead Reliability Engineer',
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Order Recommendations table (Drafts - Not fake SAP)
CREATE TABLE IF NOT EXISTS work_order_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_reference VARCHAR(100) UNIQUE NOT NULL,
    recommendation_id UUID REFERENCES recommendations(id),
    equipment VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id),
    priority VARCHAR(50) NOT NULL,
    recommended_action TEXT NOT NULL,
    reason TEXT NOT NULL,
    required_inspection TEXT NOT NULL,
    requested_timing VARCHAR(100) NOT NULL,
    engineer_approval_status VARCHAR(50) DEFAULT 'DRAFT',
    operations JSONB,
    required_parts JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Trail table (Full Traceability)
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    user_actor VARCHAR(200) DEFAULT 'SYSTEM',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    previous_state JSONB,
    new_state JSONB,
    details JSONB
);

-- Ingestion log
CREATE TABLE IF NOT EXISTS ingestion_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(500),
    data_category VARCHAR(100), -- production, equipment, incidents, downtime
    rows_processed INTEGER,
    rows_failed INTEGER,
    status VARCHAR(50), -- SUCCESS, PARTIAL, FAILED
    error_details JSONB,
    ingested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_conditions_equipment_id ON equipment_conditions(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_conditions_timestamp ON equipment_conditions(timestamp);
CREATE INDEX IF NOT EXISTS idx_production_records_equipment_id ON production_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_production_records_timestamp ON production_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_downtime_records_equipment_id ON downtime_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_incidents_equipment_id ON incidents(equipment_id);
CREATE INDEX IF NOT EXISTS idx_incidents_problem ON incidents(problem);
CREATE INDEX IF NOT EXISTS idx_detected_problems_equipment_id ON detected_problems(equipment_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_equipment_id ON recommendations(equipment_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_equipment_id ON follow_ups(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment ON work_order_recommendations(equipment);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity, entity_id);
