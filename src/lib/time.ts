import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";

export const TZ = "America/Bogota";

/** Interpreta fecha+hora local de Colombia como Date UTC correcto. */
export function bogotaDateTime(date: string, time: string) {
  return fromZonedTime(`${date}T${time}:00`, TZ);
}

export function toBogota(date: Date) {
  return toZonedTime(date, TZ);
}

export function formatBogota(date: Date, pattern: string) {
  return formatInTimeZone(date, TZ, pattern, { locale: es });
}

export function bogotaDateInputValue(date: Date) {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

export function bogotaTimeInputValue(date: Date) {
  return formatInTimeZone(date, TZ, "HH:mm");
}

export function startOfBogotaDay(date = new Date()) {
  const day = formatInTimeZone(date, TZ, "yyyy-MM-dd");
  return fromZonedTime(`${day}T00:00:00`, TZ);
}

export function endOfBogotaDay(date = new Date()) {
  const day = formatInTimeZone(date, TZ, "yyyy-MM-dd");
  return fromZonedTime(`${day}T23:59:59.999`, TZ);
}
