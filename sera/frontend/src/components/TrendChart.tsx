import React from 'react'
import ReactECharts from 'echarts-for-react'
import type { TrendRecord } from '@/api/client'

export interface TrendChartProps {
  data: TrendRecord[]
  thresholds?: Record<string, Record<string, number>>
  parameter?: 'vibration' | 'harmonic_2x' | 'bearing_temperature' | 'coupling_offset' | string
  height?: number
  title?: string
  dateRange?: string
  unit?: string
  showWorkflowBanner?: boolean
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  thresholds,
  parameter = 'vibration',
  height = 290,
  title,
  dateRange,
  unit,
  showWorkflowBanner = true,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-sm border border-slate-200 bg-white p-6 text-center font-mono text-xs text-slate-500">
        <span>DATA NOT AVAILABLE</span>
        <span className="text-[11px] text-slate-400 mt-1">No time-series telemetry records found for this parameter</span>
      </div>
    )
  }

  // Parameter metadata
  const PARAM_METAS: Record<string, { label: string; unit: string; color: string }> = {
    vibration: { label: 'Overall Vibration', unit: 'mm/s', color: '#2563EB' },
    harmonic_2x: { label: '2X Rotational Harmonic', unit: 'mm/s', color: '#0284C7' },
    coupling_offset: { label: 'Coupling Radial Offset', unit: 'mm', color: '#0D9488' },
    bearing_temperature: { label: 'Bearing Metal Temperature', unit: '°C', color: '#D97706' },
    radial_vibration: { label: 'DE Radial Vibration', unit: 'micron', color: '#2563EB' },
    motor_temperature: { label: 'Motor Winding Temp', unit: '°C', color: '#EA580C' },
    tube_side_dp: { label: 'Tube-side Differential Pressure', unit: 'bar', color: '#2563EB' },
    seal_flush_flow: { label: 'Seal Flush Flow', unit: 'L/min', color: '#0284C7' },
  }

  const meta = PARAM_METAS[parameter] || {
    label: parameter.replace(/_/g, ' ').toUpperCase(),
    unit: unit || '',
    color: '#2563EB',
  }

  // Format dates / x-axis
  const xData = data.map((d, i) => {
    if (d.timestamp) {
      const dt = new Date(d.timestamp)
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      }
    }
    if (d.week_number) return `Wk ${d.week_number}`
    return `#${i + 1}`
  })

  // Format y-axis values
  const yData = data.map((d) => {
    const val = (d as any)[parameter] ?? (d.raw_data as any)?.[parameter]
    if (val !== undefined && val !== null && !isNaN(Number(val))) {
      return Number(Number(val).toFixed(3))
    }
    return null
  })

  // ONLY use thresholds if supported by project data (NO hardcoded invented fallbacks)
  const alarmThreshold = thresholds?.[parameter]?.alarm
  const tripThreshold = thresholds?.[parameter]?.trip
  const warningThreshold = thresholds?.[parameter]?.warning

  const markLines: any[] = []

  if (alarmThreshold !== undefined && alarmThreshold !== null) {
    markLines.push({
      yAxis: alarmThreshold,
      name: 'Alarm',
      lineStyle: { color: '#DC2626', type: 'dashed', width: 1.5 },
      label: {
        show: true,
        formatter: `Alarm: ${alarmThreshold} ${meta.unit}`,
        position: 'end',
        color: '#DC2626',
        fontSize: 10,
        fontFamily: 'monospace',
      },
    })
  }

  if (tripThreshold !== undefined && tripThreshold !== null) {
    markLines.push({
      yAxis: tripThreshold,
      name: 'Trip',
      lineStyle: { color: '#991B1B', type: 'dotted', width: 2 },
      label: {
        show: true,
        formatter: `Trip: ${tripThreshold} ${meta.unit}`,
        position: 'insideEndTop',
        color: '#991B1B',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'monospace',
      },
    })
  }

  // Detect abnormal excursion zones if any point reaches alarm/trip
  const abnormalStartIdx = yData.findIndex((v) => {
    if (v === null) return false
    if (tripThreshold !== undefined && v >= tripThreshold) return true
    if (alarmThreshold !== undefined && v >= alarmThreshold) return true
    return false
  })

  const markAreas: any[] = []
  if (abnormalStartIdx !== -1) {
    // Find where excursion continues
    let abnormalEndIdx = abnormalStartIdx
    for (let i = abnormalStartIdx; i < yData.length; i++) {
      const v = yData[i]
      if (v !== null && alarmThreshold !== undefined && v >= alarmThreshold * 0.9) {
        abnormalEndIdx = i
      }
    }
    markAreas.push([
      {
        xAxis: xData[abnormalStartIdx],
        itemStyle: {
          color: 'rgba(239, 68, 68, 0.08)',
          borderWidth: 1,
          borderColor: 'rgba(239, 68, 68, 0.3)',
          borderType: 'dashed',
        },
        label: {
          show: true,
          position: 'insideTop',
          formatter: 'ABNORMALITY / INVESTIGATION ZONE',
          color: '#DC2626',
          fontSize: 9,
          fontWeight: 'bold',
          fontFamily: 'monospace',
        },
      },
      {
        xAxis: xData[Math.min(abnormalEndIdx + 1, xData.length - 1)],
      },
    ])
  }

  const option = {
    backgroundColor: '#FFFFFF',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      textStyle: { color: '#0F172A', fontSize: 11, fontFamily: 'monospace' },
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        const item = params[0]
        const rawPoint = data[item.dataIndex]
        let statusBadge = 'NOMINAL'
        if (tripThreshold && item.value >= tripThreshold) statusBadge = 'TRIP'
        else if (alarmThreshold && item.value >= alarmThreshold) statusBadge = 'ALARM'

        return `
          <div style="font-family: monospace; font-size: 11px; padding: 2px;">
            <div style="font-weight: bold; color: #334155; margin-bottom: 4px;">
              Date: ${rawPoint?.timestamp ? rawPoint.timestamp.slice(0, 10) : item.name}
            </div>
            <div style="display: flex; justify-content: space-between; gap: 12px;">
              <span style="color: #64748B;">${meta.label}:</span>
              <span style="font-weight: bold; color: #0F172A;">${item.value} ${meta.unit}</span>
            </div>
            ${alarmThreshold ? `<div style="color: #94A3B8; font-size: 10px;">Alarm Limit: ${alarmThreshold} ${meta.unit}</div>` : ''}
            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #F1F5F9; font-weight: bold; color: ${statusBadge !== 'NOMINAL' ? '#DC2626' : '#059669'};">
              Status: ${statusBadge}
            </div>
          </div>
        `
      },
    },
    grid: {
      top: 36,
      right: alarmThreshold || tripThreshold ? 110 : 25,
      bottom: 30,
      left: 45,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xData,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      axisTick: { alignWithLabel: true, lineStyle: { color: '#CBD5E1' } },
      axisLabel: {
        color: '#64748B',
        fontSize: 10,
        fontFamily: 'monospace',
        interval: Math.max(0, Math.floor(xData.length / 8)),
      },
      splitLine: {
        show: true,
        lineStyle: { color: '#F1F5F9', type: 'solid' },
      },
    },
    yAxis: {
      type: 'value',
      name: meta.unit ? `(${meta.unit})` : '',
      nameTextStyle: { color: '#64748B', fontSize: 10, fontFamily: 'monospace' },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748B', fontSize: 10, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'solid' } },
      scale: true,
    },
    series: [
      {
        name: meta.label,
        type: 'line',
        data: yData,
        smooth: false, // Technical discrete step/points, not decorative bezier
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 4,
        itemStyle: {
          color: meta.color,
        },
        lineStyle: {
          color: meta.color,
          width: 2,
        },
        markLine: markLines.length > 0 ? { data: markLines, silent: true } : undefined,
        markArea: markAreas.length > 0 ? { data: markAreas, silent: true } : undefined,
      },
    ],
  }

  return (
    <div className="space-y-3 font-sans">
      {/* Visual Workflow Communicator Banner */}
      {showWorkflowBanner && (
        <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-mono font-semibold text-slate-500">
          <span className="text-slate-400 uppercase">Detection Progression:</span>
          <div className="flex items-center gap-1.5">
            <span className="rounded-sm bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-emerald-700">
              NORMAL
            </span>
            <span className="text-slate-400">→</span>
            <span className="rounded-sm bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-blue-700">
              DEVIATION
            </span>
            <span className="text-slate-400">→</span>
            <span className="rounded-sm bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-amber-700">
              ABNORMALITY
            </span>
            <span className="text-slate-400">→</span>
            <span className="rounded-sm bg-red-50 border border-red-200 px-1.5 py-0.5 text-red-700 font-bold">
              INVESTIGATION
            </span>
          </div>
        </div>
      )}

      {/* Chart Title & Date Range */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono font-bold text-slate-800">
          {title || `${meta.label} Trend`}
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          {dateRange || `${xData[0]} — ${xData[xData.length - 1]} (${data.length} weekly records)`}
        </span>
      </div>

      {/* Line Chart */}
      <div className="rounded-sm border border-slate-200 bg-white p-2">
        <ReactECharts option={option} style={{ height: `${height}px`, width: '100%' }} notMerge />
      </div>
    </div>
  )
}

export default TrendChart
