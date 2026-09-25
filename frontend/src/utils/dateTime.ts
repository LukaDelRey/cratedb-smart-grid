export function formatClockTime(
  timestamp?:string | number | Date | null,
  includeSeconds = true,
  locale?:string | string[]
):string{
  const parsed = timestamp ? new Date(timestamp) : new Date()

  if(Number.isNaN(parsed.getTime())){
    return includeSeconds ? '--:--:--' : '--:--'
  }

  return parsed.toLocaleTimeString(locale, {
    hour:'2-digit',
    minute:'2-digit',
    ...(includeSeconds ? { second:'2-digit' } : {})
  })
}
