import React, { useState, useEffect } from 'react'
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Play } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getRawFiles, triggerBatchIngestion, uploadExcelFile, getEquipmentList } from '../api/client'
import LoadingState from '../components/LoadingState'

const CASE_2_TAGS = ['BL-5702', 'KO-3201', 'PM-4405B', 'PU-2101B', 'HE-3301']

export const IngestionPage: React.FC = () => {
  const { t } = useLanguage()
  const [rawFiles, setRawFiles] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>(CASE_2_TAGS)
  const [loading, setLoading] = useState(true)
  const [batchRunning, setBatchRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [equipmentTag, setEquipmentTag] = useState('BL-5702')
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
      const tags = eqList.map((e: any) => e.equipment_id).filter(Boolean)
      if (tags.length > 0) setAvailableTags(tags)
    } catch (err: any) {
      setError(err?.message || 'Failed to list raw Excel workbooks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFiles() }, [])

  const handleBatchIngest = async () => {
    setBatchRunning(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await triggerBatchIngestion()
      setSuccessMsg(res.message || 'Batch ingestion completed.')
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
    setUploading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await uploadExcelFile(selectedFile, equipmentTag, category)
      setSuccessMsg(`Ingested: ${res.filename} → ${res.equipment_id}`)
      setSelectedFile(null)
      await fetchFiles()
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4 font-sans text-slate-800">

      {/* Page Header */}
      <div className="border-b border-slate-200 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{t('navIngestion')}</h1>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            Upload, validate, and normalize plant Excel workbooks into database tables
          </p>
        </div>
        <button
          onClick={handleBatchIngest}
          disabled={batchRunning}
          className="flex items-center gap-1.5 border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 rounded-sm"
        >
          <Play size={12} className={batchRunning ? 'animate-spin' : ''} />
          {batchRunning ? 'Running batch...' : 'Run Batch Ingest'}
        </button>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="border border-emerald-200 bg-emerald-50 rounded-sm px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-sm px-4 py-2.5 flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle size={13} className="text-red-600 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Two-column: Upload + Pipeline Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Upload Form */}
        <div className="border border-slate-200 bg-white rounded-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Upload Workbook
            </span>
          </div>
          <form onSubmit={handleUploadSubmit} className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Equipment Tag
                </label>
                <select
                  value={equipmentTag}
                  onChange={e => setEquipmentTag(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
                >
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Data Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
                >
                  <option value="equipment">Equipment Condition</option>
                  <option value="production">Production Records</option>
                  <option value="downtime">Downtime Events</option>
                  <option value="incidents">Incident Database</option>
                </select>
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-sm p-5 text-center">
              <UploadCloud size={24} className="mx-auto text-slate-400 mb-2" />
              <div className="text-xs font-semibold text-slate-700">
                {selectedFile ? selectedFile.name : 'Select Excel workbook (.xlsx / .xls)'}
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={e => {
                  if (e.target.files?.[0]) setSelectedFile(e.target.files[0])
                }}
                className="mt-3 block w-full text-xs text-slate-500 file:mr-2 file:border file:border-slate-300 file:bg-white file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 file:rounded-sm hover:file:bg-slate-50"
              />
            </div>

            <div className="flex justify-end">
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

        {/* Pipeline Spec */}
        <div className="border border-slate-200 bg-white rounded-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Validation Pipeline
            </span>
          </div>
          <div className="p-4 space-y-3 text-xs">
            {[
              { phase: 'Phase 1', label: 'Format & Header Verification', cls: 'text-emerald-700',
                desc: 'Validates mandatory telemetry columns (vibration, harmonic_2x, coupling_offset, bearing_temperature) and timestamps.' },
              { phase: 'Phase 2', label: 'Anomaly & Boundary Cleaning', cls: 'text-amber-700',
                desc: 'Rejects corrupted or non-numeric cells without silently discarding valid historical observations.' },
              { phase: 'Phase 3', label: 'Relational Persistence', cls: 'text-slate-700',
                desc: 'Inserts normalized records into database with foreign-key integrity linking equipment master tags.' },
            ].map(p => (
              <div key={p.phase} className="border border-slate-200 bg-slate-50 rounded-sm p-3">
                <div className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-1 ${p.cls}`}>
                  {p.phase}: {p.label}
                </div>
                <p className="text-slate-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Raw Files Table */}
      <div className="border border-slate-200 bg-white rounded-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Discovered Raw Workbooks
          </span>
          <span className="font-mono text-[10px] text-slate-400">{rawFiles.length} files found</span>
        </div>

        {loading ? (
          <LoadingState message="Scanning data/raw directory..." />
        ) : rawFiles.length === 0 ? (
          <div className="px-6 py-8 text-center font-mono text-xs text-slate-400">
            No raw Excel workbooks found in data/raw/ directory
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Filename</th>
                <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Category</th>
                <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Relative Path</th>
                <th className="text-right px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Size</th>
                <th className="text-center px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rawFiles.map((file, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-emerald-600 flex-shrink-0" />
                    <span className="font-mono text-slate-800">{file.filename}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-500 uppercase text-[11px]">{file.category}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-400 text-[11px]">{file.relative_path}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                    {(file.size_bytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="border border-emerald-200 bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                      INDEXED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default IngestionPage
