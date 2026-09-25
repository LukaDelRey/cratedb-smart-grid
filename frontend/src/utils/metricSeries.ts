import type { MetricHistoryValue } from '../types/dashboard'

const SPARK_SEEDS = [28, 32, 42, 35, 48, 38, 52, 45, 58, 54, 66, 72]

export function createSparkSeries(offset = 0):number[]{
  return SPARK_SEEDS.map((value, index) =>
    Math.max(12, Math.min(92, value + ((index + offset) % 4) * 4 - offset))
  )
}

export function metricPointValue(point?:MetricHistoryValue):number{
  return typeof point === 'number'
    ? point
    : Number(point?.value) || 0
}

export function metricPointTimestamp(point?:MetricHistoryValue):number | null{
  if(!point || typeof point !== 'object' || !point.timestamp){
    return null
  }

  const parsed = typeof point.timestamp === 'number'
    ? point.timestamp
    : Date.parse(point.timestamp)

  return Number.isFinite(parsed) ? parsed : null
}

export function metricLinePoints(
  values:MetricHistoryValue[],
  width:number,
  height:number,
  historyWindowMs = 60 * 60 * 1000
):string{
  if(!values.length) return ''

  const plottedValues = values.map(metricPointValue)
  const timestamps = values.map(metricPointTimestamp)
  const validTimestamps = timestamps.filter((value):value is number => Number.isFinite(value))
  const min = Math.min(...plottedValues)
  const max = Math.max(...plottedValues)
  const range = Math.max(1, max - min)
  const latestTimestamp = validTimestamps.at(-1)
  const firstTimestamp = validTimestamps[0]
  const elapsedMs = Number.isFinite(firstTimestamp) && Number.isFinite(latestTimestamp)
    ? latestTimestamp - firstTimestamp
    : 0
  const timelineStart = Number.isFinite(firstTimestamp) && Number.isFinite(latestTimestamp)
    ? elapsedMs >= historyWindowMs
      ? latestTimestamp - historyWindowMs
      : firstTimestamp
    : null
  const timelineEnd = timelineStart === null
    ? null
    : elapsedMs >= historyWindowMs
      ? latestTimestamp
      : Math.max(firstTimestamp + 1, latestTimestamp)

  return values
    .map((point, index) => {
      const value = metricPointValue(point)
      const timestamp = timestamps[index]
      const x = timelineStart !== null && Number.isFinite(timestamp)
        ? Math.max(0, Math.min(width, ((timestamp - timelineStart) / (timelineEnd - timelineStart)) * width))
        : values.length === 1
          ? width / 2
          : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 6) - 3

      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
