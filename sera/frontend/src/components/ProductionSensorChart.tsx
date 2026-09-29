import React from 'react'
import ReactECharts from 'echarts-for-react'
import { ProductionSensorRecord } from '../api/client'

interface ProductionSensorChartProps {
  data: ProductionSensorRecord[]
  height?: number
  equipmentId?: string
}

export const ProductionSensorChart: React.FC<ProductionSensorChartProps> = ({
  data,
  height = 300,
  equipmentId,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-sm border border-slate-200 bg-white text-xs text-slate-500 font-mono">
        No hourly sensor telemetry available
      </div>
    )
  }

  // Sample or slice data for readability if large (e.g. latest 168 hours = 7 days)
  const displayData = data.slice(-168)

  const timestamps = displayData.map((d) => {
    try {
      const dt = new Date(d.timestamp)
      return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')} ${dt.getHours().toString().padStart(2, '0')}:00`
    } catch {
      return d.timestamp.substring(11, 16)
    }
  })

  const feedRates = displayData.map((d) => d.feed ?? d.production_rate ?? 0)
  const vibrations = displayData.map((d) => d.vibration_sensor ?? 0)
  const temperatures = displayData.map((d) => d.temperature_sensor ?? 0)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: '#0F172A',
      borderColor: '#334155',
      textStyle: { color: '#F8FAFC', fontSize: 11 },
    },
    legend: {
      data: ['Feed Rate (T/H)', 'Vibration Sensor (mm/s)', 'Temperature (°C)'],
      bottom: 0,
      textStyle: { fontSize: 11, color: '#64748B' },
      icon: 'circle',
    },
    grid: {
      top: 30,
      left: 50,
      right: 50,
      bottom: 45,
    },
    xAxis: {
      type: 'category',
      data: timestamps,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      axisLabel: { color: '#64748B', fontSize: 10, interval: Math.floor(displayData.length / 7) },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Feed (T/H)',
        min: 0,
        max: 60,
        axisLine: { lineStyle: { color: '#2563EB' } },
        axisLabel: { color: '#64748B', fontSize: 10 },
        splitLine: { lineStyle: { color: '#F1F5F9' } },
      },
      {
        type: 'value',
        name: 'Vib (mm/s)',
        min: 0,
        max: 15,
        position: 'right',
        axisLine: { lineStyle: { color: '#DC2626' } },
        axisLabel: { color: '#DC2626', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Feed Rate (T/H)',
        type: 'line',
        yAxisIndex: 0,
        data: feedRates,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: '#2563EB' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(37, 99, 235, 0.25)' },
              { offset: 1, color: 'rgba(37, 99, 235, 0.01)' },
            ],
          },
        },
      },
      {
        name: 'Vibration Sensor (mm/s)',
        type: 'line',
        yAxisIndex: 1,
        data: vibrations,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.5, color: '#DC2626' },
      },
      {
        name: 'Temperature (°C)',
        type: 'line',
        yAxisIndex: 1,
        data: temperatures,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, color: '#F59E0B', type: 'dashed' },
      },
    ],
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700">
            Hourly PI DCS Telemetry {equipmentId ? `(${equipmentId} Sensor Correlation)` : ''}
          </span>
          <p className="text-[11px] text-slate-500">
            Source: <span className="font-semibold text-slate-700">{equipmentId ? `Production Data — ${equipmentId}` : 'PI Sensor Database'}</span> ({data.length} Hourly Readings in Database)
          </p>
        </div>
        <span className="rounded-sm bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
          168 Hours Window
        </span>
      </div>
      <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />
    </div>
  )
}
export default ProductionSensorChart
