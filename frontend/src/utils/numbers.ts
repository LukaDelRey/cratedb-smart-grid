export function clamp(value:unknown, min = 0, max = 100):number{
  return Math.min(max, Math.max(min, Number(value) || 0))
}

export function average(values:number[], fallback = 0):number{
  const finiteValues = values.filter(Number.isFinite)

  if(!finiteValues.length){
    return fallback
  }

  return Math.round(
    finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length
  )
}

export function round(value:unknown, precision = 0):number{
  const factor = 10 ** precision

  return Math.round((Number(value) || 0) * factor) / factor
}

export function round1(value:unknown):number{
  return round(value, 1)
}

export function round2(value:unknown):number{
  return round(value, 2)
}
