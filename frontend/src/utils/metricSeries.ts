import type { MetricHistoryValue } from '../types/dashboard'

const SPARK_SEEDS = [28, 32, 42, 35, 48, 38, 52, 45, 58, 54, 66, 72]
const MIN_VISUAL_POINTS = 10

type PlotPoint = {
  x: number
  y: number
}

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

function triangleArea(left:PlotPoint, current:PlotPoint, right:PlotPoint):number{
  return Math.abs(
    (left.x - right.x) * (current.y - left.y) -
    (left.x - current.x) * (right.y - left.y)
  ) * 0.5
}

function largestTriangleThreeBuckets(points:PlotPoint[], threshold:number):PlotPoint[]{
  if(points.length <= threshold || threshold < 3){
    return points
  }

  const sampled:PlotPoint[] = [points[0]]
  const bucketSize = (points.length - 2) / (threshold - 2)
  let anchorIndex = 0

  for(let bucketIndex = 0; bucketIndex < threshold - 2; bucketIndex += 1){
    const rangeStart = Math.floor((bucketIndex + 1) * bucketSize) + 1
    const rangeEnd = Math.min(
      Math.floor((bucketIndex + 2) * bucketSize) + 1,
      points.length
    )
    const averageRange = points.slice(rangeStart, rangeEnd)
    const averagePoint = averageRange.length
      ? {
          x:averageRange.reduce((sum, point) => sum + point.x, 0) / averageRange.length,
          y:averageRange.reduce((sum, point) => sum + point.y, 0) / averageRange.length
        }
      : points[points.length - 1]

    const pointRangeStart = Math.floor(bucketIndex * bucketSize) + 1
    const pointRangeEnd = Math.min(
      Math.floor((bucketIndex + 1) * bucketSize) + 1,
      points.length - 1
    )
    const anchor = points[anchorIndex]
    let selectedIndex = pointRangeStart
    let selectedArea = -1

    for(let index = pointRangeStart; index < pointRangeEnd; index += 1){
      const area = triangleArea(anchor, points[index], averagePoint)

      if(area > selectedArea){
        selectedArea = area
        selectedIndex = index
      }
    }

    sampled.push(points[selectedIndex])
    anchorIndex = selectedIndex
  }

  sampled.push(points[points.length - 1])

  return sampled
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
  const plottedPoints = values.map((point, index) => {
    const value = metricPointValue(point)
    const timestamp = timestamps[index]
    const x = timelineStart !== null && Number.isFinite(timestamp)
      ? Math.max(0, Math.min(width, ((timestamp - timelineStart) / (timelineEnd - timelineStart)) * width))
      : values.length === 1
        ? width / 2
        : (index / (values.length - 1)) * width
    const y = height - ((value - min) / range) * (height - 6) - 3

    return { x, y }
  })
  const maxVisualPoints = Math.max(MIN_VISUAL_POINTS, Math.floor(width / 2))
  const simplifiedPoints = largestTriangleThreeBuckets(
    plottedPoints,
    maxVisualPoints
  )

  return simplifiedPoints
    .map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ')
}
