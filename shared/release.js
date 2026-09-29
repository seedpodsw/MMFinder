/** Early Access: 1 Oct 2026, 9:00 Asia/Bahrain (UTC+3) = 2:00 a.m. US Eastern. */
export const EARLY_ACCESS_AT = "2026-10-01T09:00:00+03:00";

export const EARLY_ACCESS_NOTE = {
  eastern: "2:00 a.m. Eastern Time, October 1",
  bahrain: "9:00 a.m. Bahrain, October 1",
  pacific: "11:00 p.m. Pacific, September 30",
  source: "https://monstersandmemories.com/updates/get-ready-for-early-access",
};

export function formatEastern(instant) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(instant);
}

export function releaseInstant() {
  return new Date(EARLY_ACCESS_AT);
}

export function partsUntil(now, release) {
  const ms = release.getTime() - now.getTime();
  if (ms <= 0) {
    return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const total = Math.floor(ms / 1000);
  return {
    done: false,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
