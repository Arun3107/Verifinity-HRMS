export function parseDateOnly(value) {
  if (!value) return null;

  const datePart = String(value).slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) return new Date(value);

  return new Date(year, month - 1, day);
}

export function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getCurrentLeaveYear(date = new Date()) {
  return date.getMonth() < 3 ? date.getFullYear() - 1 : date.getFullYear();
}

export function getLeaveYearRange(leaveYear) {
  return {
    startDate: `${leaveYear}-04-01`,
    endDate: `${leaveYear + 1}-03-31`,
  };
}

export function formatLeaveYear(leaveYear) {
  return `${leaveYear}-${String(leaveYear + 1).slice(-2)}`;
}

export function formatLeaveDate(value) {
  const date = parseDateOnly(value);
  if (!date || Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatLeaveDays(value) {
  const number = Number(value || 0);
  return number === 1 ? "1 day" : `${number} days`;
}
