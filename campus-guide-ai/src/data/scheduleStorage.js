export const SCHEDULE_STORAGE_KEY = "campus-guide-ai.schedule.v1";

const DAYS = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);

export function readScheduleEntries() {
  try {
    const stored = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!stored) return [];
    const entries = JSON.parse(stored);
    if (!Array.isArray(entries)) return [];

    return entries.filter((entry) =>
      entry &&
      typeof entry.id === "string" &&
      typeof entry.subject === "string" &&
      DAYS.has(entry.day) &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(entry.startTime) &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(entry.endTime) &&
      entry.endTime > entry.startTime
    );
  } catch {
    return [];
  }
}

export function formatScheduleTime(time) {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
