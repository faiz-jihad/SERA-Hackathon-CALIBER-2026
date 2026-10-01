import React, { useState, useEffect } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Play,
  Activity,
  Radio,
  RefreshCw,
  Database,
  ArrowRight,
  Info,
  Server,
  Zap,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import {
  getRawFiles,
  triggerBatchIngestion,
  uploadExcelFile,
  getEquipmentList,
  postLiveTelemetry,
  RawFile,
} from '../api/client'
import LoadingState from '../components/LoadingState'
import soundEffects from '../utils/soundEffects'

const CASE_2_TAGS = ['BL-5702', 'KO-3201', 'PM-4405B', 'PU-2101B', 'HE-3301']

// Known asset associations for official raw files to avoid confusion
const FILE_ASSET_MAPPING: Record<string, { tag: string; plant: string; role: string }> = {
  'Equipment Performance - RCA5 BL-5702.xlsx': {
    tag: 'BL-5702',
    plant: 'Orion Polypropylene (OPP)',
    role: 'Product Blower (Tripped on 17-Jun-2026)',
  },
  'Equipment Performance - PU-2101B.xlsx': {
    tag: 'PU-2101B',
    plant: 'Aromatic Plant (ARP)',
    role: 'Quench Water Pump (Normal Baseline)',
  },
  'Equipment Performance - KO-3201.xlsx': {
    tag: 'KO-3201',
    plant: 'ZCU Plant',
    role: 'Synthesis Gas Compressor (Normal Baseline)',
  },
  'Equipment Performance - PM-4405B.xlsx': {
    tag: 'PM-4405B',
    plant: 'NUP Plant',
    role: 'Slurry Transfer Pump (Normal Baseline)',
  },
  'Equipment Performance - HE-3301.xlsx': {
    tag: 'HE-3301',
    plant: 'ZCU Plant',
    role: 'Process Heat Exchanger (Normal Baseline)',
  },
  'Incident Database - Historical Plant Incidents.xlsx': {
    tag: 'PLANT-WIDE',
    plant: 'Fleet Registry',
    role: 'Official Incident & RCA Logbook',
  },
  'Downtime Records.xlsx': {
    tag: 'PLANT-WIDE',
    plant: 'Fleet Registry',
    role: 'Plant Unscheduled Outage Records',
  },
  'Production Records.xlsx': {
    tag: 'PLANT-WIDE',
    plant: 'Fleet Registry',
    role: 'Polypropylene Plant Throughput Logs',
  },
}

export const IngestionPage: React.FC = () => {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'BATCH' | 'STREAM'>('BATCH')
  const [rawFiles, setRawFiles] = useState<RawFile[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>(CASE_2_TAGS)
  const [loading, setLoading] = useState(true)
  const [batchRunning, setBatchRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [equipmentTag, setEquipmentTag] = useState('BL-5702')
  const [category, setCategory] = useState<'equipment' | 'production' | 'downtime' | 'incidents'>('equipment')
  const [uploading, setUploading] = useState(false)

  // Live Stream Gateway state
  const [streamTag, setStreamTag] = useState('BL-5702')
  const [streamVib, setStreamVib] = useState('11.22')
  const [streamHarmonic, setStreamHarmonic] = useState('5.10')
  const [streamOffset, setStreamOffset] = useState('0.306')
  const [streamTemp, setStreamTemp] = useState('96.9')
  const [streamProd, setStreamProd] = useState('45.2')
  const [streamCurrent, setStreamCurrent] = useState('142.5')
  const [streaming, setStreaming] = useState(false)
  const [streamResponse, setStreamResponse] = useState<any>(null)

  const fetchFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, eqList] = await Promise.all([
        getRawFiles(),
        getEquipmentList().catch(() => []),
      ])
      setRawFiles(res.files || [])
      const tags = eqList.map((e: any) => e.equipment_id).filter(Boolean)
      if (tags.length > 0) setAvailableTags(tags)
    } catch (err: any) {
      setError(err?.message || 'Failed to list raw Excel workbooks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const handleBatchIngest = async () => {
    soundEffects.playClick()
    setBatchRunning(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await triggerBatchIngestion()
      soundEffects.playSuccess()
      setSuccessMsg(res.message || 'Official CALIBER Case 2 batch ingestion completed.')
      await fetchFiles()
    } catch (err: any) {
      setError(err?.message || 'Batch ingestion failed')
    } finally {
      setBatchRunning(false)
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    soundEffects.playClick()
    setUploading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const targetTag = category === 'equipment' ? equipmentTag : 'PLANT-WIDE'
      const res = await uploadExcelFile(selectedFile, targetTag, category)
      soundEffects.playSuccess()
      setSuccessMsg(`Workbook ingested successfully: ${res.filename} (${category.toUpperCase()})`)
      setSelectedFile(null)
      await fetchFiles()
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleLiveTelemetrySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    soundEffects.playClick()
    setStreaming(true)
    setError(null)
    setStreamResponse(null)
    try {
      const payload = {
        equipment_id: streamTag.toUpperCase(),
        timestamp: new Date().toISOString(),
        vibration: parseFloat(streamVib),
        harmonic_2x: parseFloat(streamHarmonic),
        coupling_offset: parseFloat(streamOffset),
        bearing_temperature: parseFloat(streamTemp),
        production_rate: parseFloat(streamProd),
        motor_current: parseFloat(streamCurrent),
      }
      const res = await postLiveTelemetry(payload)
      soundEffects.playSuccess()
      setStreamResponse(res)
      setSuccessMsg(`${t('telemetrySentSuccess')} [${streamTag}]`)
    } catch (err: any) {
      setError(err?.message || 'Telemetry transmission failed')
    } finally {
      setStreaming(false)
    }
  }

  const applyPreset = (preset: 'TRIP' | 'ALERT' | 'NORMAL') => {
    if (preset === 'TRIP') {
      soundEffects.playAlarm()
      setStreamTag('BL-5702')
      setStreamVib('11.22')
      setStreamHarmonic('5.10')
      setStreamOffset('0.306')
      setStreamTemp('96.9')
      setStreamProd('42.0')
      setStreamCurrent('154.2')
    } else if (preset === 'ALERT') {
      soundEffects.playWarning()
      setStreamTag('BL-5702')
      setStreamVib('7.85')
      setStreamHarmonic('3.40')
      setStreamOffset('0.145')
      setStreamTemp('83.5')
      setStreamProd('44.5')
      setStreamCurrent('146.0')
    } else {
      soundEffects.playClick()
      setStreamVib('2.15')
      setStreamHarmonic('0.75')
      setStreamOffset('0.035')
      setStreamTemp('64.2')
      setStreamProd('46.0')
      setStreamCurrent('138.0')
    }
  }

  const isSingleAssetCategory = category === 'equipment'

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Database size={18} className="text-primary" />
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {t('ingestionTitle')}
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            {t('ingestionSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-sm disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleBatchIngest}
            disabled={batchRunning}
            className="flex items-center gap-1.5 border border-slate-900 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 rounded-sm shadow-xs"
          >
            <Play size={12} className={batchRunning ? 'animate-spin' : ''} />
            {batchRunning ? 'Processing Batch...' : t('btnTriggerBatch')}
          </button>
        </div>
      </div>

      {/* Dataset Provenance Notice (Menghilangkan Rancu) */}
      <div className="border border-slate-200 bg-slate-50 rounded-sm p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Info size={16} className="text-primary mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-slate-900">{t('datasetOriginTitle')}: </span>
            <span className="text-slate-600">{t('datasetOriginDesc')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-sm font-semibold">
            5 Monitored Assets
          </span>
          <span className="font-mono text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-sm font-semibold">
            ISO 10816-3 Strict
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 flex gap-4">
        <button
          onClick={() => {
            soundEffects.playClick()
            setActiveTab('BATCH')
          }}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'BATCH'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet size={14} />
          <span>{t('tabBatchIngestion')}</span>
        </button>
        <button
          onClick={() => {
            soundEffects.playClick()
            setActiveTab('STREAM')
          }}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'STREAM'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Radio size={14} />
          <span>{t('tabLiveStream')}</span>
        </button>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="border border-emerald-200 bg-emerald-50 rounded-sm px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-sm px-4 py-2.5 flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: BATCH EXCEL INGESTION */}
      {activeTab === 'BATCH' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Upload Form */}
            <div className="lg:col-span-6 border border-slate-200 bg-white rounded-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  {t('btnUploadFile')}
                </span>
                <span className="font-mono text-[10px] text-slate-400">.xlsx / .xls</span>
              </div>
              <form onSubmit={handleUploadSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
                      {t('colCategory')}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
                    >
                      <option value="equipment">Equipment Condition (Single Tag)</option>
                      <option value="incidents">Incident Database (Plant Fleet)</option>
                      <option value="production">Production Records (OPP Plant)</option>
                      <option value="downtime">Downtime Events (Plant Outages)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
                      {t('selectEquipmentTag')}
                    </label>
                    {isSingleAssetCategory ? (
                      <select
                        value={equipmentTag}
                        onChange={(e) => setEquipmentTag(e.target.value)}
                        className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
                      >
                        {availableTags.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        value="Auto-detected from sheet columns"
                        className="w-full border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-mono text-slate-500 rounded-sm italic cursor-not-allowed"
                      />
                    )}
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-sm p-5 text-center">
                  <UploadCloud size={24} className="mx-auto text-slate-400 mb-2" />
                  <div className="text-xs font-semibold text-slate-700">
                    {selectedFile ? selectedFile.name : t('uploadBoxTitle')}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t('uploadBoxSubtitle')}
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedFile(e.target.files[0])
                    }}
                    className="mt-3 block w-full text-xs text-slate-500 file:mr-2 file:border file:border-slate-300 file:bg-white file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 file:rounded-sm hover:file:bg-slate-50 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Target schema: <code className="font-mono text-primary font-semibold">{category}</code>
                  </span>
                  <button
                    type="submit"
                    disabled={!selectedFile || uploading}
                    className="flex items-center gap-1.5 border border-slate-900 bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 rounded-sm"
                  >
                    {uploading ? 'Validating...' : 'Ingest Workbook'}
                  </button>
                </div>
              </form>
            </div>

            {/* Validation Pipeline Architecture Spec */}
            <div className="lg:col-span-6 border border-slate-200 bg-white rounded-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  {t('importSummaryTitle')}
                </span>
                <span className="font-mono text-[10px] text-emerald-700 font-bold">PIPELINE ACTIVE</span>
              </div>
              <div className="p-4 space-y-3 text-xs">
                {[
                  {
                    phase: 'Phase 1',
                    label: 'Format & Column Normalization',
                    cls: 'text-primary',
                    desc: 'Maps telemetry headers (vibration, harmonic_2x, coupling_offset, bearing_temperature) to standardized ISO units (mm/s, mm, °C).',
                  },
                  {
                    phase: 'Phase 2',
                    label: 'Deterministic Outlier & NaN Filtration',
                    cls: 'text-amber-700',
                    desc: 'Sanitizes corrupted cells without dropping adjacent valid rows; flags physically impossible measurements outside sensor spans.',
                  },
                  {
                    phase: 'Phase 3',
                    label: 'Relational Integrity & Foreign Key Mapping',
                    cls: 'text-emerald-700',
                    desc: 'Links condition records to the master equipment table; triggers automatic ISO 10816-3 status recalculation upon insertion.',
                  },
                ].map((p) => (
                  <div key={p.phase} className="border border-slate-200 bg-slate-50 rounded-sm p-3">
                    <div className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-1 ${p.cls}`}>
                      {p.phase}: {p.label}
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Discovered Raw Files Table with Explicit Asset Mapping */}
          <div className="border border-slate-200 bg-white rounded-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Official Case 2 Dataset Workbooks
              </span>
              <span className="font-mono text-[10px] text-slate-400">{rawFiles.length} workbooks cataloged</span>
            </div>

            {loading ? (
              <LoadingState message="Scanning data/raw directory..." />
            ) : rawFiles.length === 0 ? (
              <div className="px-6 py-8 text-center font-mono text-xs text-slate-400">
                No raw Excel workbooks found in data/raw/ directory
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="text-left px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {t('colFilename')}
                      </th>
                      <th className="text-left px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Equipment Tag
                      </th>
                      <th className="text-left px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Plant Facility & Description
                      </th>
                      <th className="text-left px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {t('colCategory')}
                      </th>
                      <th className="text-right px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Size
                      </th>
                      <th className="text-center px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {t('colIngestStatus')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawFiles.map((file, idx) => {
                      const mapping = FILE_ASSET_MAPPING[file.filename] || {
                        tag: file.filename.includes('BL-5702') ? 'BL-5702' : 'PLANT-WIDE',
                        plant: 'Case 2 Datasets',
                        role: 'Telemetry Workbook',
                      }
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet size={15} className="text-emerald-600 flex-shrink-0" />
                              <span className="font-mono font-medium text-slate-900">{file.filename}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded-sm font-bold text-[11px] ${
                                mapping.tag === 'BL-5702'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {mapping.tag}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            <span className="font-semibold text-slate-800">{mapping.plant}</span>
                            <span className="text-slate-400 ml-1.5 text-[11px]">— {mapping.role}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-500 uppercase text-[11px]">
                            {file.category}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                            {(file.size_bytes / 1024).toFixed(1)} KB
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="border border-emerald-200 bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                              DATABASE SYNCED
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE STREAMING TELEMETRY GATEWAY */}
      {activeTab === 'STREAM' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Live Gateway Transmitter */}
            <div className="lg:col-span-7 border border-slate-200 bg-white rounded-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={14} className="text-primary" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700">
                    Live Telemetry Ingestion Gateway (REST / OPC-UA Bridge)
                  </span>
                </div>
                <span className="font-mono text-[10px] text-primary font-bold">POST /api/ingestion/telemetry</span>
              </div>

              <form onSubmit={handleLiveTelemetrySubmit} className="p-4 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('liveStreamDesc')}
                </p>

                {/* Preset Quick Fill Buttons */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Simulation Presets:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset('TRIP')}
                      className="border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 px-2.5 py-1 text-xs font-mono font-semibold rounded-sm flex items-center gap-1"
                    >
                      <Zap size={12} />
                      BL-5702 Trip Condition (Misalignment)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('ALERT')}
                      className="border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 px-2.5 py-1 text-xs font-mono font-semibold rounded-sm flex items-center gap-1"
                    >
                      <Activity size={12} />
                      ISO Zone C Alert (Severe Anomaly)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('NORMAL')}
                      className="border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 text-xs font-mono font-semibold rounded-sm flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} />
                      Healthy Steady-State
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Asset Tag
                    </label>
                    <select
                      value={streamTag}
                      onChange={(e) => setStreamTag(e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
                    >
                      {availableTags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Overall Vibration (mm/s)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={streamVib}
                      onChange={(e) => setStreamVib(e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Harmonic 2X (mm/s)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={streamHarmonic}
                      onChange={(e) => setStreamHarmonic(e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Coupling Offset (mm)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={streamOffset}
                      onChange={(e) => setStreamOffset(e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Bearing Temp (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={streamTemp}
                      onChange={(e) => setStreamTemp(e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Production Rate (t/h)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={streamProd}
                      onChange={(e) => setStreamProd(e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={streaming}
                    className="flex items-center gap-1.5 border border-primary bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 rounded-sm shadow-xs"
                  >
                    <Radio size={14} className={streaming ? 'animate-pulse' : ''} />
                    <span>{streaming ? 'Transmitting...' : t('sendTelemetryBtn')}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live Gateway Telemetry Response Monitor */}
            <div className="lg:col-span-5 border border-slate-200 bg-white rounded-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Gateway Processing Result
                </span>
                <span className="font-mono text-[10px] text-slate-400">JSON Payload</span>
              </div>

              <div className="p-4 space-y-3">
                {streamResponse ? (
                  <div className="space-y-3">
                    <div className="p-3 border rounded-sm bg-slate-50 border-slate-200 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Status Response:</span>
                        <span className="font-mono font-bold text-emerald-700 uppercase">
                          {streamResponse.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Asset:</span>
                        <span className="font-mono font-bold text-primary">
                          {streamResponse.equipment_id}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Evaluated Condition:</span>
                        <span
                          className={`font-mono font-bold px-1.5 py-0.5 rounded-sm text-[10px] ${
                            streamResponse.condition_status === 'TRIP'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : streamResponse.condition_status === 'ALARM'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {streamResponse.condition_status || 'NORMAL'}
                        </span>
                      </div>
                    </div>

                    <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-sm overflow-x-auto leading-relaxed">
                      {JSON.stringify(streamResponse, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-sm p-8 text-center text-slate-400 font-mono text-xs">
                    No packet transmitted yet. Select parameters and click Transmit Telemetry Packet.
                  </div>
                )}

                <div className="rounded-sm bg-blue-50 border border-blue-200 p-3 text-[11px] text-blue-900">
                  <div className="font-bold mb-0.5">Real-World Integration Note:</div>
                  OPC-UA field servers and SCADA historians pipe into this endpoint via HTTP POST. Condition monitoring engines automatically update root cause evidence layers without manual intervention.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IngestionPage
