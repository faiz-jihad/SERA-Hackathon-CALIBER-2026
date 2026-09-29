import React, { useState, useEffect } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Database,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getRawFiles, triggerBatchIngestion, uploadExcelFile, getEquipmentList } from '../api/client'
import SectionHeader from '../components/SectionHeader'
import StatusBadge from '../components/StatusBadge'
import LoadingState from '../components/LoadingState'

export const IngestionPage: React.FC = () => {
  const { t } = useLanguage()
  const [rawFiles, setRawFiles] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [batchRunning, setBatchRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [equipmentTag, setEquipmentTag] = useState('')
  const [category, setCategory] = useState('equipment')
  const [uploading, setUploading] = useState(false)

  const fetchFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, eqList] = await Promise.all([
        getRawFiles(),
        getEquipmentList().catch(() => []),
      ])
      setRawFiles(res.files || [])
      const tags = eqList.map((e: any) => e.equipment_id)
      setAvailableTags(tags)
      if (tags.length > 0 && !equipmentTag) {
        setEquipmentTag(tags[0])
      }
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
    setBatchRunning(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await triggerBatchIngestion()
      setSuccessMsg(res.message || 'Batch ingestion completed successfully!')
      await fetchFiles()
    } catch (err: any) {
      setError(err?.message || 'Batch ingestion execution failed')
    } finally {
      setBatchRunning(false)
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    setUploading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await uploadExcelFile(selectedFile, equipmentTag, category)
      setSuccessMsg(`File ${res.filename} successfully ingested into ${res.equipment_id} telemetry tables!`)
      setSelectedFile(null)
      await fetchFiles()
    } catch (err: any) {
      setError(err?.message || 'Excel upload processing failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Database size={22} className="text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t('navIngestion')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('ingestionSubtitle')}
          </p>
        </div>

        <button
          onClick={handleBatchIngest}
          disabled={batchRunning}
          className="flex items-center gap-2 self-start sm:self-auto rounded-sm bg-primary hover:bg-blue-700 disabled:opacity-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-xs transition-all"
        >
          <Play size={14} className={batchRunning ? 'animate-spin' : ''} />
          <span>{batchRunning ? 'Ingesting...' : t('btnTriggerBatch')}</span>
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-sm border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 font-medium">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-sm border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-medium">
          <AlertTriangle size={16} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Upload Box + Batch Runner Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Upload Box */}
        <div className="lg:col-span-6 rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <SectionHeader
            number="01"
            title={t('btnUploadFile')}
            subtitle="Validate and ingest plant telemetry workbook"
          />

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {t('selectEquipmentTag')}
                </label>
                <select
                  value={equipmentTag}
                  onChange={(e) => setEquipmentTag(e.target.value)}
                  className="w-full rounded-sm border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                >
                  {(availableTags.length > 0 ? availableTags : ['BL-5702', 'PU-2101B', 'KO-3201', 'PM-4405B', 'HE-3301']).map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {t('colCategory')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-sm border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-primary focus:bg-white focus:outline-none"
                >
                  <option value="equipment">Equipment Condition</option>
                  <option value="production">Production Records</option>
                  <option value="downtime">Downtime Events</option>
                  <option value="incidents">Incident Database</option>
                </select>
              </div>
            </div>

            {/* File Drop Area */}
            <div className="rounded-sm border-2 border-dashed border-slate-200 hover:border-primary bg-slate-50/70 p-6 text-center transition-colors">
              <UploadCloud size={30} className="mx-auto text-primary mb-2" />
              <div className="text-xs font-semibold text-slate-900">
                {selectedFile ? selectedFile.name : t('uploadBoxTitle')}
              </div>
              <p className="text-xs text-slate-500 mt-1">{t('uploadBoxSubtitle')}</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0])
                  }
                }}
                className="mt-3 block w-full text-xs text-slate-500 file:mr-2 file:rounded-sm file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-blue-100"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="flex items-center gap-2 rounded-sm bg-primary hover:bg-blue-700 disabled:opacity-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-xs transition-all"
              >
                <span>{uploading ? 'Validating...' : 'Ingest Workbook'}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </form>
        </div>

        {/* Ingestion Architecture Info */}
        <div className="lg:col-span-6 rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <SectionHeader
            number="02"
            title="Validation Pipeline Specification"
            subtitle="Deterministic ETL & relational schema enforcement"
          />

          <div className="space-y-3 text-xs text-slate-700">
            <div className="rounded-sm bg-slate-50 border border-slate-200 p-3.5">
              <span className="font-bold text-emerald-700 uppercase text-[10px] block mb-1">
                Phase 1: Format & Header Verification
              </span>
              Validates mandatory telemetry columns (`vibration`, `harmonic_2x`, `coupling_offset`, `bearing_temperature`) and timestamps.
            </div>
            <div className="rounded-sm bg-slate-50 border border-slate-200 p-3.5">
              <span className="font-bold text-primary uppercase text-[10px] block mb-1">
                Phase 2: Anomaly & Boundary Cleaning
              </span>
              Rejects corrupted or non-numeric cells without silently discarding valid historical observations.
            </div>
            <div className="rounded-sm bg-slate-50 border border-slate-200 p-3.5">
              <span className="font-bold text-amber-700 uppercase text-[10px] block mb-1">
                Phase 3: Relational Persistence
              </span>
              Inserts normalized records into SQLite/PostgreSQL with foreign-key integrity linking equipment master tags.
            </div>
          </div>
        </div>
      </div>

      {/* Raw Files Discovered List */}
      <div className="rounded-sm border border-slate-200 bg-white px-5 pt-6 pb-4 shadow-xs sm:px-7.5 space-y-4">
        <SectionHeader
          number="03"
          title={t('importSummaryTitle')}
          subtitle="Discovered raw Excel workbooks in data/raw/ directory"
        />

        {loading ? (
          <LoadingState />
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-left border-b border-slate-200">
                  <th className="py-3.5 px-4 font-semibold uppercase text-slate-600 tracking-wider">{t('colFilename')}</th>
                  <th className="py-3.5 px-4 font-semibold uppercase text-slate-600 tracking-wider">{t('colCategory')}</th>
                  <th className="py-3.5 px-4 font-mono font-semibold uppercase text-slate-600 tracking-wider">Relative Path</th>
                  <th className="py-3.5 px-4 font-mono text-right font-semibold uppercase text-slate-600 tracking-wider">File Size</th>
                  <th className="py-3.5 px-4 text-center font-semibold uppercase text-slate-600 tracking-wider">{t('colIngestStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {rawFiles.map((file, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-blue-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-900 flex items-center gap-2.5">
                      <FileSpreadsheet size={16} className="text-primary shrink-0" />
                      <span>{file.filename}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 uppercase text-[11px] font-sans">
                      {file.category}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">{file.relative_path}</td>
                    <td className="py-3.5 px-4 text-right text-slate-900 font-bold">
                      {(file.size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status="VERIFIED" size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default IngestionPage
