import { supabase } from "./supabaseClient";
import { getLocalDateKey, parseDateOnly } from "../utils/leaveUtils";

function getMonthRange(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);

  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Select a valid report month.");
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    start,
    end,
    startDate: getLocalDateKey(start),
    endDate: getLocalDateKey(end),
  };
}

function isLopLeaveType(leaveType) {
  const code = (leaveType?.code || "").toLowerCase().replaceAll("-", "_");
  const name = (leaveType?.name || "").toLowerCase();

  return (
    ["lop", "loss_of_pay", "leave_without_pay", "unpaid_leave"].includes(
      code,
    ) ||
    name.includes("loss of pay") ||
    name === "lop" ||
    leaveType?.is_paid === false
  );
}

function calculateRequestDaysInMonth(request, monthStart, monthEnd, holidays) {
  const requestStart = parseDateOnly(request.start_date);
  const requestEnd = parseDateOnly(request.end_date);

  if (!requestStart || !requestEnd) return 0;

  if (requestStart >= monthStart && requestEnd <= monthEnd) {
    return Number(request.calculated_days || 0);
  }

  const rangeStart = requestStart > monthStart ? requestStart : monthStart;
  const rangeEnd = requestEnd < monthEnd ? requestEnd : monthEnd;

  if (rangeStart > rangeEnd) return 0;

  let days = 0;

  for (
    let date = new Date(rangeStart);
    date <= rangeEnd;
    date.setDate(date.getDate() + 1)
  ) {
    const dayOfWeek = date.getDay();
    const dateKey = getLocalDateKey(date);

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateKey)) {
      days += 1;
    }
  }

  if (request.is_half_day) {
    const halfDayDate = parseDateOnly(
      request.half_day_date || request.start_date,
    );
    const halfDayKey = halfDayDate ? getLocalDateKey(halfDayDate) : null;

    if (
      halfDayDate &&
      halfDayDate >= rangeStart &&
      halfDayDate <= rangeEnd &&
      halfDayDate.getDay() !== 0 &&
      halfDayDate.getDay() !== 6 &&
      !holidays.has(halfDayKey)
    ) {
      days = Math.max(days - 0.5, 0);
    }
  }

  return days;
}

function aggregateEmployeeDays(requests, departments, predicate = () => true) {
  const rows = new Map();

  for (const request of requests) {
    if (!predicate(request)) continue;

    const employee = request.employee;
    const days = Number(request.month_days || 0);

    if (!employee?.id || days <= 0) continue;

    const department = departments.get(employee.department_id);
    const current = rows.get(employee.id) || {
      employeeId: employee.id,
      employeeCode: employee.employee_code || "-",
      employeeName: employee.full_name || "Unknown employee",
      departmentId: employee.department_id || "",
      departmentName: department?.name || "Unassigned",
      days: 0,
    };

    current.days += days;
    rows.set(employee.id, current);
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      days: Math.round(row.days * 2) / 2,
    }))
    .sort(
      (first, second) =>
        first.departmentName.localeCompare(second.departmentName) ||
        first.employeeName.localeCompare(second.employeeName),
    );
}

export async function getMonthlyLeaveReports(monthKey) {
  const { start, end, startDate, endDate } = getMonthRange(monthKey);

  const [requestsResult, holidaysResult] = await Promise.all([
    supabase
      .from("leave_requests")
      .select(
        `
        id,
        start_date,
        end_date,
        calculated_days,
        is_half_day,
        half_day_date,
        employee:profiles!leave_requests_employee_id_fkey (
          id,
          employee_code,
          full_name,
          department_id
        ),
        leave_type:leave_types (
          id,
          code,
          name,
          is_paid,
          deducts_balance
        )
      `,
      )
      .eq("status", "approved")
      .lte("start_date", endDate)
      .gte("end_date", startDate),
    supabase
      .from("holiday_calendar")
      .select("holiday_date")
      .eq("is_active", true)
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate),
  ]);

  if (requestsResult.error) throw requestsResult.error;
  if (holidaysResult.error) throw holidaysResult.error;

  const holidays = new Set(
    (holidaysResult.data || []).map((holiday) => holiday.holiday_date),
  );
  const requests = (requestsResult.data || []).map((request) => ({
    ...request,
    month_days: calculateRequestDaysInMonth(request, start, end, holidays),
  }));
  const departmentIds = [
    ...new Set(
      requests
        .map((request) => request.employee?.department_id)
        .filter(Boolean),
    ),
  ];
  const departments = new Map();

  if (departmentIds.length > 0) {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .in("id", departmentIds);

    if (error) throw error;

    for (const department of data || []) {
      departments.set(department.id, department);
    }
  }

  return {
    leaveTaken: aggregateEmployeeDays(requests, departments),
    lop: aggregateEmployeeDays(requests, departments, (request) =>
      isLopLeaveType(request.leave_type),
    ),
  };
}
