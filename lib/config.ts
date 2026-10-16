import { DEFAULT_TZ } from "./time";

export function appTimezone(): string {
  const tz = process.env.APP_TIMEZONE || DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}
