export function calculatePace(km: number, minutes: number): string | null {
  if (!km || km <= 0 || !minutes || minutes <= 0) return null
  const paceDec = minutes / km // min por km
  if (!isFinite(paceDec) || paceDec <= 0 || paceDec > 120) return null
  const paceMin = Math.floor(paceDec)
  const paceSec = Math.round((paceDec - paceMin) * 60)
  const secStr = paceSec < 10 ? `0${paceSec}` : `${paceSec}`
  return `${paceMin}'${secStr}"/km`
}

export function calculateSpeed(km: number, minutes: number): string | null {
  if (!km || km <= 0 || !minutes || minutes <= 0) return null
  const hours = minutes / 60
  if (hours <= 0) return null
  const speed = km / hours
  if (!isFinite(speed) || speed <= 0 || speed > 150) return null
  return `${speed.toFixed(1)} km/h`
}

export function isCardioSessionDone(
  targetKm: number | null | undefined,
  targetMinutes: number | null | undefined,
  actualKm: number | null | undefined,
  actualMinutes: number | null | undefined,
  manualDone?: boolean,
): boolean {
  if (manualDone) return true

  const hasTargetKm = typeof targetKm === 'number' && targetKm > 0
  const hasTargetMin = typeof targetMinutes === 'number' && targetMinutes > 0

  if (!hasTargetKm && !hasTargetMin) {
    return Boolean(manualDone)
  }

  const kmReached = !hasTargetKm || (typeof actualKm === 'number' && actualKm >= targetKm)
  const minReached =
    !hasTargetMin || (typeof actualMinutes === 'number' && actualMinutes >= targetMinutes)

  return kmReached && minReached
}
