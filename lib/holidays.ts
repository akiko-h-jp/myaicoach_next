import { isHoliday } from "japanese-holidays";

export function isWeekendOrHoliday(date: Date): boolean {
  const day = date.getDay(); // 0=Sun,6=Sat
  if (day === 0 || day === 6) return true;
  return isHoliday(date) ?? false;
}

