const CANADIAN_HOLIDAYS_2026 = [
  '2026-01-01', '2026-02-16', '2026-04-03', '2026-05-18',
  '2026-07-01', '2026-08-03', '2026-09-07', '2026-10-12',
  '2026-11-11', '2026-12-25', '2026-12-26',
]

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function isHoliday(date: Date): boolean {
  const iso = date.toISOString().slice(0, 10)
  return CANADIAN_HOLIDAYS_2026.includes(iso)
}

export function addBusinessDays(startDate: Date, days: number): Date {
  let count = 0
  const d = new Date(startDate)
  while (count < days) {
    d.setDate(d.getDate() + 1)
    if (!isWeekend(d) && !isHoliday(d)) count++
  }
  return d
}

export function getDisputeWindowCloseDate(preNoticeDate: Date, businessDays = 5): Date {
  return addBusinessDays(preNoticeDate, businessDays)
}

export function isDisputeWindowOpen(disputeWindowClosesAt: string): boolean {
  return new Date(disputeWindowClosesAt) > new Date()
}
