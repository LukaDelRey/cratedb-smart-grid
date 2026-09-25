export function getHealth(station){

  let score = 100

  score -=
    (station.thermal?.oil_temp_c || 0) * 0.3

  score -=
    Math.max(
      0,
      ((station.electrical?.current_a || 0) - 500)
    ) * 0.05

  if(station.alarms?.overheating)
    score -= 15

  if(station.alarms?.overload)
    score -= 15

  return Math.max(
    0,
    Math.round(score)
  )
}

export function getRisk(station){

  let risk = 0

  risk +=
    (station.thermal?.oil_temp_c || 0) * 0.4

  risk +=
    (station.electrical?.current_a || 0) * 0.05

  if(station.alarms?.overload)
    risk += 20

  if(station.alarms?.overheating)
    risk += 20

  return Math.min(
    100,
    Math.round(risk)
  )
}