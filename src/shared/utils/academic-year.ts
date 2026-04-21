// Angola academic year: September → July
// Before September (months 0–7) → year started previous September → YYYY-1/YYYY
// September onwards (months 8–11) → new year just started → YYYY/YYYY+1

export function getCurrentAcademicYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() < 8
    ? `${year - 1}/${year}`
    : `${year}/${year + 1}`
}

export function getAcademicYearOptions(): { value: string; label: string }[] {
  const current = getCurrentAcademicYear()
  const [startStr] = current.split('/')
  const start = parseInt(startStr, 10)
  return [
    { value: `${start - 1}/${start}`, label: `${start - 1}/${start} (ano anterior)` },
    { value: current, label: `${current} (ano letivo atual)` },
    { value: `${start + 1}/${start + 2}`, label: `${start + 1}/${start + 2} (próximo ano)` },
  ]
}

export function isValidAcademicYear(year: string): boolean {
  return /^\d{4}\/\d{4}$/.test(year)
}
