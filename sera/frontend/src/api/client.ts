// SERA API Client
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

export interface DashboardOverview {
  total_equipment: number
  status_summary: {
    normal: number
    warning: number
    alarm: number
    critical: number
    trip: number
  }
  active_problems: number
  downtime_hours_30d: number
  production_loss_30d: number
  financial_loss_30d: number
  recent_incidents_90d: number
  equipment: Equipment[]
}

export interface Equipment {
  equipment_id: string
  name: string
  type?: string
  location?: string
  unit?: string
  status: string
  latest_condition?: ConditionSummary
}

export interface ConditionSummary {
  vibration?: number
  bearing_temperature?: number
  coupling_offset?: number
  harmonic_2x?: number
  status?: string
  last_reading?: string
}

export interface EquipmentDetail extends Equipment {
  condition_summary: Record<string, number | string | null>
  thresholds: Record<string, Record<string, number>>
  total_readings: number
  total_downtime_hours: number
  total_production_loss: number
  total_financial_loss: number
  total_incidents: number
}

export interface TrendRecord {
  timestamp?: string
  week_number?: number
  vibration?: number
  harmonic_2x?: number
  coupling_offset?: number
  bearing_temperature?: number
  motor_temperature?: number
  status?: string
  vibration_change?: number
  vibration_trend?: string
  vibration_level?: string
  bearing_temperature_level?: string
  severity_score?: number
  consecutive_alarm_count?: number
  [key: string]: unknown
}

export interface TrendData {
  equipment_id: string
  trend: TrendRecord[]
  thresholds: Record<string, Record<string, number>>
}

export interface DetectedProblem {
  problem_type: string
  severity: string
  detected_at?: string
  evidence: string[]
  parameters: Record<string, number | null>
}

export interface RCACandidate {
  root_cause: string
  category: string
  score: number
  confidence: string
  explanation: string
  evidence: string[]
  historical_match_count: number
}

export interface RCAResult {
  primary_root_cause: string
  confidence_level: string
  explanation: string
  evidence: string[]
  all_candidates: RCACandidate[]
  historical_match_count: number
}

export interface Incident {
  id: string
  equipment_id: string
  incident_date: string
  incident_title?: string
  problem?: string
  root_cause?: string
  root_cause_category?: string
  downtime_hours?: number
  production_loss?: number
  financial_loss?: number
  corrective_action?: string
  preventive_action?: string
  severity?: string
  status?: string
}

export interface EvidenceItem {
  evidence_id: string
  parameter: string
  parameter_key: string
  observed_value: number
  previous_value: number
  change: number
  unit: string
  threshold: string
  severity: string
  source: string
  timestamp: string
  interpretation: string
}

export interface WhatChangedParam {
  parameter: string
  parameter_key: string
  unit: string
  baseline_value: number
  previous_value: number
  current_value: number
  absolute_change: number
  percentage_change: number
  delta_from_baseline: number
  trend: string
  status: string
}

export interface WhatChangedData {
  equipment_id: string
  current_period: string
  previous_period: string
  comparison: WhatChangedParam[]
  summary: string
}

export interface RuleTraceItem {
  rule_id: string
  equipment_id: string
  parameter: string
  observed_value: number
  condition: string
  threshold: number
  unit: string
  severity: string
  source_type: string
  source_reference: string
  rationale: string
  priority: number
}

export interface RuleTraceData {
  equipment_id: string
  status: string
  rules_triggered_count: number
  rules_triggered: RuleTraceItem[]
  reasons: string[]
  evaluated_at: string
}

export interface FollowUpRecord {
  id: string
  equipment_id: string
  recommendation_id?: string
  maintenance_date: string
  action_taken: string
  before_condition: Record<string, unknown>
  after_condition: Record<string, unknown>
  verification_result: string
  parameter_deltas?: Record<string, { before: number; after: number; reduction: number; pct_reduction: number }>
  engineer_notes?: string
  verified_by: string
  verified_at?: string
  created_at: string
}

export interface EquipmentAnalysis {
  equipment_id: string
  equipment_status: string
  detected_problems: DetectedProblem[]
  rca: RCAResult
  similar_incidents: Incident[]
  evidence_layer?: EvidenceItem[]
  what_changed?: WhatChangedData
  rule_trace?: RuleTraceData
  recommendation?: Recommendation
  total_conditions: number
}

export interface Recommendation {
  id: string
  equipment_id: string
  generated_at: string
  problem_summary?: string
  root_cause_explanation?: string
  corrective_action?: string
  preventive_action?: string
  evidence?: Record<string, unknown>
  confidence_level?: string
  review_status: string
  engineer_notes?: string
  reviewed_at?: string
  reviewed_by?: string
  final_action?: string
}

export interface ParameterThreshold {
  label: string
  column_raw: string
  db_field: string
  unit: string
  alarm: number
  trip: number
  direction: 'high' | 'low'
  source: string
}

export interface EquipmentThresholds {
  equipment_id: string
  equipment_name: string
  equipment_type: string
  ar_number: string
  failure_date: string
  dominant_failure_mode: string
  parameters: Record<string, ParameterThreshold>
  performance_kpis: {
    downtime_hours: number
    availability_pct: number
    alarm_weeks: number
    trip_weeks: number
    production_loss_ton: number
    estimated_loss_kusd: number
  }
  source: string
}

export interface EvidenceSummaryItem {
  type: 'FACT' | 'OBSERVATION' | 'HYPOTHESIS' | 'RECOMMENDATION'
  category: string
  text: string
  source: string
  week?: number
}

export interface EquipmentConditionSummary {
  equipment_id: string
  equipment_name: string
  equipment_type: string
  ar_number: string
  failure_date: string
  dominant_failure_mode: string
  current_status: string
  evidence: EvidenceSummaryItem[]
  kpis: {
    downtime_hours: number
    availability_pct: number
    alarm_weeks: number
    trip_weeks: number
    production_loss_ton: number
    estimated_loss_kusd: number
  }
  total_weeks_analyzed: number
  data_source: string
  condition_changes?: {
    first_alarm_week?: number
    first_trip_week?: number
    current_status: string
    changes: Array<{ week: number; from_status: string; to_status: string; date?: string }>
  }
}

export interface EquipmentRca {
  equipment_id: string
  ar_number?: string
  failure_date?: string
  dominant_failure_mode?: string
  rca_records: Array<{
    id: string
    equipment_id: string
    rca_timestamp: string
    primary_root_cause: string
    confidence_level: string
    possible_root_causes: string[]
    evidence: Record<string, unknown>
    similar_incidents: unknown[]
  }>
  recommendations: Recommendation[]
  follow_ups: Array<{
    id: string
    maintenance_date: string
    action_taken: string
    before_condition: Record<string, unknown>
    after_condition: Record<string, unknown>
    verification_result: string
    parameter_deltas?: Record<string, unknown>
    engineer_notes?: string
  }>
  source: string
}

// ──────────────────────────────────────────
// API Functions
// ──────────────────────────────────────────

export const getDashboardOverview = (): Promise<DashboardOverview> =>
  api.get('/dashboard/overview').then(r => r.data)

export const listEquipment = (): Promise<Equipment[]> =>
  api.get('/equipment').then(r => r.data)

export const getEquipmentDetail = (id: string): Promise<EquipmentDetail> =>
  api.get(`/equipment/${id}`).then(r => r.data)

export interface ProductionSensorRecord {
  timestamp: string
  production_rate: number
  pressure: number
  feed: number
  run_status: string
  efficiency: number
  vibration_sensor: number
  temperature_sensor: number
  motor_amp: number
  plant_rate: number
}

export const getEquipmentTrend = (id: string, limit = 52): Promise<TrendData> =>
  api.get(`/equipment/${id}/trend`, { params: { limit } }).then(r => r.data)

export const getEquipmentProduction = (id: string, limit = 168): Promise<ProductionSensorRecord[]> =>
  api.get(`/equipment/${id}/production`, { params: { limit } }).then(r => r.data)

export const getEquipmentAnalysis = (id: string): Promise<EquipmentAnalysis> =>
  api.get(`/equipment/${id}/analysis`).then(r => r.data)

export const getEquipmentWhatChanged = (id: string): Promise<WhatChangedData> =>
  api.get(`/equipment/${id}/what-changed`).then(r => r.data)

export const getEquipmentEvidenceLayer = (id: string): Promise<EvidenceItem[]> =>
  api.get(`/equipment/${id}/evidence`).then(r => r.data)

export const getEquipmentThresholds = (id: string): Promise<EquipmentThresholds> =>
  api.get(`/equipment/${id}/thresholds`).then(r => r.data)

export const getEquipmentConditionSummary = (id: string): Promise<EquipmentConditionSummary> =>
  api.get(`/equipment/${id}/summary`).then(r => r.data)

export const getEquipmentIncidents = (id: string, limit = 20): Promise<{ equipment_id: string; count: number; incidents: Incident[] }> =>
  api.get(`/equipment/${id}/incidents`, { params: { limit } }).then(r => r.data)

export const getEquipmentRca = (id: string): Promise<EquipmentRca> =>
  api.get(`/equipment/${id}/rca`).then(r => r.data)

export const getEquipmentOverview = (): Promise<{ equipment: EquipmentThresholds[] }> =>
  api.get('/equipment/overview').then(r => r.data)


export const listIncidents = (params?: {
  equipment_id?: string
  problem?: string
  limit?: number
}): Promise<Incident[]> =>
  api.get('/incidents', { params }).then(r => r.data)

export const getSimilarIncidents = (equipment_id: string, problem_types?: string): Promise<Incident[]> =>
  api.get('/incidents/similar', { params: { equipment_id, problem_types } }).then(r => r.data)

export const runDetection = (equipment_id: string) =>
  api.post('/analysis/detect', null, { params: { equipment_id } }).then(r => r.data)

export const runRCA = (equipment_id: string) =>
  api.post('/analysis/rca', null, { params: { equipment_id } }).then(r => r.data)

export const runInvestigationAgent = (equipment_id: string) =>
  api.post('/analysis/investigate', null, { params: { equipment_id } }).then(r => r.data)

export const generateRecommendation = (equipment_id: string) =>
  api.post('/recommendation', null, { params: { equipment_id } }).then(r => r.data)

export const listRecommendations = (equipment_id?: string): Promise<Recommendation[]> =>
  api.get('/recommendation', { params: { equipment_id } }).then(r => r.data)

export const reviewRecommendation = (
  id: string,
  body: {
    review_status: string
    engineer_notes?: string
    reviewed_by?: string
    final_action?: string
  }
): Promise<Recommendation> =>
  api.post(`/recommendation/${id}/review`, body).then(r => r.data)

export const createFollowUp = (body: {
  equipment_id: string
  recommendation_id?: string
  maintenance_date?: string
  action_taken: string
  before_condition?: Record<string, unknown>
  after_condition?: Record<string, unknown>
  verification_result?: string
  engineer_notes?: string
  verified_by?: string
}): Promise<FollowUpRecord> =>
  api.post('/follow-up', body).then(r => r.data)

export const listFollowUps = (equipment_id?: string): Promise<FollowUpRecord[]> =>
  api.get('/follow-up', { params: { equipment_id } }).then(r => r.data)

export const getEquipmentFollowUps = (equipment_id: string): Promise<FollowUpRecord[]> =>
  api.get(`/follow-up/${equipment_id}`).then(r => r.data)

export const uploadExcel = (
  file: File,
  equipment_id: string,
  category?: string
) => {
  const form = new FormData()
  form.append('file', file)
  form.append('equipment_id', equipment_id)
  if (category) form.append('category', category)
  return api.post('/ingestion/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export interface RawFile {
  filename: string
  relative_path: string
  category: string
  size_bytes: number
}

export const listRawFiles = (): Promise<{ files: RawFile[]; total: number }> =>
  api.get('/ingestion/raw-files').then(r => r.data)

export const triggerBatchIngestion = (): Promise<{ status: string; message: string; results?: any }> =>
  api.post('/ingestion/ingest-raw').then(r => r.data)

export const getRawFiles = listRawFiles
export const getEquipmentList = listEquipment
export const getIncidents = listIncidents
export const getRecommendations = listRecommendations
export const createRecommendation = generateRecommendation
export const getFollowUps = listFollowUps
export const uploadExcelFile = uploadExcel
export const investigateEquipment = runInvestigationAgent

export type EquipmentSummary = Equipment
export type IncidentRecord = Incident
export type RecommendationRecord = Recommendation
export type AnalysisResult = EquipmentAnalysis
export type FollowUpData = FollowUpRecord

export default api



