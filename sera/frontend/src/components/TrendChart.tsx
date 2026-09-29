import React from 'react'
import ReactECharts from 'echarts-for-react'
import { useLanguage } from '../context/LanguageContext'
import type { TrendRecord } from '@/api/client'

export interface TrendChartProps {
  data: TrendRecord[]
  thresholds?: Record<string, Record<string, number>>
  parameter?: 'vibration' | 'harmonic_2x' | 'bearing_temperature' | 'coupling_offset'
  height?: number
  title?: string
  dateRange?: string
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  thresholds,
  parameter = 'vibration',
  height = 260,
  title,
  dateRange = 'Historical Observations (28 Jan 2026 — 24 Jun 2026)',
}) => {
  const { t } = useLanguage()

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-sm border border-slate-200 bg-white text-xs text-slate-500 font-mono">
        {t('emptyTitle')}: {t('emptyDesc')}
      </div>
    )
  }

  const PARAM_CONFIG: Record<
    string,
    { label: string; unit: string; color: string; warn: number; alarm: number; trip: number }
  > = {
    vibration: {
      label: t('paramVibration'),
      unit: 'mm/s',
      color: '#2563EB',
      warn: 7.1,
      alarm: 8.5,
      trip: 11.0,
    },
    harmonic_2x: {
      label: t('paramHarmonic2X'),
      unit: 'mm/s',
      color: '#0284C7',
      warn: 3.0,
      alarm: 5.0,
      trip: 8.0,
    },
    coupling_offset: {
      label: t('paramCouplingOffset'),
      unit: 'mm',
      color: '#059669',
      warn: 0.05,
      alarm: 0.10,
      trip: 0.15,
    },
    bearing_temperature: {
      label: t('paramBearingTemp'),
      unit: '°C',
      color: '#D97706',
      warn: 75.0,
      alarm: 85.0,
      trip: 93.0,
    },
  }

  const cfg = PARAM_CONFIG[parameter] || PARAM_CONFIG.vibration
  const xData = data.map((d, i) =>
    d.week_number ? `W${d.week_number}` : d.timestamp ? d.timestamp.slice(5, 10) : `#${i + 1}`
  )
  const yData = data.map((d) => {
    const val = d[parameter]
    return val !== undefined && val !== null ? Number(val) : null
  })

  const warningVal = thresholds?.[parameter]?.warning ?? cfg.warn
  const alarmVal = thresholds?.[parameter]?.alarm ?? cfg.alarm
  const tripVal = thresholds?.[parameter]?.trip ?? cfg.trip

  const markLines: any[] = []
  if (warningVal !== undefined) {
    markLines.push({
      yAxis: warningVal,
      name: 'Warn',
      lineStyle: { color: '#D97706', type: 'dashed', width: 1.2 },
      label: {
        formatter: `Warn: ${warningVal} ${cfg.unit}`,
        position: 'end',
        color: '#D97706',
        fontSize: 10,
        fontFamily: 'monospace',
      },
    })
  }
  if (alarmVal !== undefined) {
    markLines.push({
      yAxis: alarmVal,
      name: 'Alarm',
      lineStyle: { color: '#DC2626', type: 'dashed', width: 1.5 },
      label: {
        formatter: `Alarm: ${alarmVal} ${cfg.unit}`,
        position: 'end',
        color: '#DC2626',
        fontSize: 10,
        fontFamily: 'monospace',
      },
    })
  }
  if (tripVal !== undefined) {
    markLines.push({
      yAxis: tripVal,
      name: 'Trip',
      lineStyle: { color: '#B91C1C', type: 'solid', width: 2 },
      label: {
        formatter: `TRIP: ${tripVal} ${cfg.unit}`,
        position: 'end',
        color: '#B91C1C',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'monospace',
      },
    })
  }

  const option = {
    backgroundColor: 'transparent',
    title: title
      ? {
          text: title,
          subtext: dateRange,
          textStyle: { color: '#0F172A', fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' },
          subtextStyle: { color: '#64748B', fontSize: 11, fontFamily: 'monospace' },
          left: 0,
          top: 0,
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border-radius: 4px; border: 1px solid #E2E8F0;',
      textStyle: { color: '#0F172A', fontSize: 12 },
      formatter: (params: any) => {
        const p = params[0]
        const idx = p.dataIndex
        const record = data[idx]
        let res = `<div style="font-family: monospace; padding: 2px;">`
        res += `<div style="color: #64748B; font-size: 11px; margin-bottom: 4px;">Week ${record.week_number || idx + 1} (${record.timestamp || ''})</div>`
        res += `<div style="font-weight: bold; color: ${cfg.color}; font-size: 13px;">${cfg.label}: ${p.value !== null ? p.value : 'N/A'} ${cfg.unit}</div>`
        if (record.status) {
          res += `<div style="margin-top: 4px; font-size: 10px; color: #475569;">Status: <span style="font-weight:bold;">${record.status}</span></div>`
        }
        res += `</div>`
        return res
      },
    },
    grid: {
      left: 10,
      right: 75,
      top: title ? 55 : 20,
      bottom: 25,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      axisLabel: { color: '#64748B', fontSize: 11, fontFamily: 'monospace' },
      axisTick: { alignWithLabel: true, lineStyle: { color: '#CBD5E1' } },
    },
    yAxis: {
      type: 'value',
      name: `${cfg.unit}`,
      nameTextStyle: { color: '#64748B', fontSize: 11, fontFamily: 'monospace', align: 'right' },
      axisLine: { show: false },
      axisLabel: { color: '#64748B', fontSize: 11, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: 'rgba(226, 232, 240, 0.9)', type: 'dashed' } },
    },
    series: [
      {
        name: cfg.label,
        type: 'line',
        data: yData,
        smooth: 0.2,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: cfg.color },
        lineStyle: { color: cfg.color, width: 2.2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${cfg.color}25` },
              { offset: 1, color: `${cfg.color}00` },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          data: markLines,
        },
      },
    ],
  }

  return (
    <div className="w-full">
      <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
    </div>
  )
}

export default TrendChart
