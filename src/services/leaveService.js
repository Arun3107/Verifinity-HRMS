import { supabase } from "./supabaseClient";
import {
  getCurrentLeaveYear,
  getLeaveYearRange,
  parseDateOnly,
} from "../utils/leaveUtils";

async function getCurrentEmployeeProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user?.id) throw new Error("You must be signed in to manage leave.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.id) throw new Error("No employee profile is linked to this login.");

  return profile;
}

async function getCurrentEmployeeId() {
  const profile = await getCurrentEmployeeProfile();
  return profile.id;
}

function getPolicyAccrualContext(policy, joiningDate, year) {
  if (!policy || !joiningDate) return null;

  const joining = new Date(`${joiningDate}T00:00:00`);
  const today = new Date();
  const leaveYearStart = new Date(year, 3, 1);
  const leaveYearEnd = new Date(year + 1, 2, 31);
  const accrualStart = joining > leaveYearStart ? joining : leaveYearStart;
  const accrualEnd = today < leaveYearEnd ? today : leaveYearEnd;

  if (
    Number.isNaN(joining.getTime()) ||
    joining > today ||
    accrualStart > accrualEnd
  ) {
    return {
      credited: 0,
      eligibleMonths: 0,
      monthlyCredit: Number(policy.monthly_credit || 1.5),
      annualAllowance: Number(policy.paid_leave_per_year || 0),
    };
  }

  const annualAllowance = Number(policy.paid_leave_per_year || 0);
  const hasMonthlyCredit = ![null, undefined, ""].includes(
    policy.monthly_credit,
  );
  const configuredMonthlyCredit = Number(policy.monthly_credit);
  const monthlyCredit =
    hasMonthlyCredit && Number.isFinite(configuredMonthlyCredit)
      ? configuredMonthlyCredit
      : 1.5;
  const eligibleMonths = Math.max(
    (accrualEnd.getFullYear() - accrualStart.getFullYear()) * 12 +
      accrualEnd.getMonth() -
      accrualStart.getMonth() +
      1,
    0,
  );
  const credited =
    Math.round(Math.min(eligibleMonths * monthlyCredit, annualAllowance) * 2) /
    2;

  return {
    credited,
    eligibleMonths,
    monthlyCredit,
    annualAllowance,
  };
}

/**
 * Leave Types
 */
export async function getLeaveTypes() {
  const { data, error } = await supabase
    .from("leave_types")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  return data || [];
}

/**
 * Approve Leave Request
 */
export async function approveLeaveRequest(id, comments = "") {
  const { data, error } = await supabase.rpc("manager_leave_action", {
    p_request_id: id,
    p_action: "approve",
    p_comments: comments,
  });

  if (error) throw error;

  return data;
}

/**
 * Reject Leave Request
 */
export async function rejectLeaveRequest(id, comments = "") {
  if (!comments.trim()) {
    throw new Error("A rejection reason is required.");
  }

  const { data, error } = await supabase.rpc("manager_leave_action", {
    p_request_id: id,
    p_action: "reject",
    p_comments: comments,
  });

  if (error) throw error;

  return data;
}

export async function revokeLeaveRequest(id, comments = "") {
  if (!comments.trim()) {
    throw new Error("A revocation reason is required.");
  }

  const { data, error } = await supabase.rpc("manager_leave_action", {
    p_request_id: id,
    p_action: "revoke",
    p_comments: comments,
  });

  if (error) throw error;

  return data;
}

/**
 * Leave Balances for HR/Admin
 */
export async function getLeaveBalances(year = getCurrentLeaveYear()) {
  const { data, error } = await supabase
    .from("leave_balances")
    .select(
      `
      *,
      employee:profiles!leave_balances_employee_id_fkey (
        id,
        full_name,
        employee_code,
        designation,
        department:departments (
          id,
          name
        )
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
    .eq("leave_year", year)
    .order("created_at");

  if (error) throw error;

  return data || [];
}

/**
 * Recalculate Leave Balance
 */
export async function recalculateLeaveBalances(employeeId = null) {
  let { data, error } = await supabase.rpc("sync_leave_balances_from_policy", {
    p_employee_id: employeeId,
  });

  const isMissingPolicySyncRpc =
    error?.code === "PGRST202" ||
    error?.message?.includes("sync_leave_balances_from_policy");

  if (isMissingPolicySyncRpc) {
    ({ data, error } = await supabase.rpc("recalculate_leave_balances", {
      p_employee_id: employeeId,
    }));
  }

  if (error) throw error;

  return data;
}

/**
 * Manual Leave Adjustment
 */
export async function adjustLeaveBalance(payload) {
  const { data, error } = await supabase
    .from("leave_adjustments")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Employee Leave Calendar
 */
export async function getLeaveCalendar(startDate, endDate) {
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      `
      id,
      start_date,
      end_date,
      status,
      calculated_days,
      employee:profiles!leave_requests_employee_id_fkey (
        full_name
      ),
      leave_type:leave_types (
        name
      )
    `,
    )
    .gte("end_date", startDate)
    .lte("start_date", endDate)
    .neq("status", "cancelled")
    .order("start_date");

  if (error) throw error;

  return data || [];
}

/**
 * Create Holiday
 */
export async function createHoliday(payload) {
  const { data: existingHoliday, error: lookupError } = await supabase
    .from("holiday_calendar")
    .select("id")
    .eq("holiday_date", payload.holiday_date)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existingHoliday) {
    return updateHoliday(existingHoliday.id, {
      ...payload,
      is_active: true,
    });
  }

  const { data, error } = await supabase
    .from("holiday_calendar")
    .insert({ ...payload, is_active: true })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Update Holiday
 */
export async function updateHoliday(id, updates) {
  const { data, error } = await supabase
    .from("holiday_calendar")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Delete Holiday
 */
export async function deleteHoliday(id) {
  const { data, error } = await supabase
    .from("holiday_calendar")
    .update({ is_active: false })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Holiday Calendar
 */
export async function getHolidayCalendar() {
  const { data, error } = await supabase
    .from("holiday_calendar")
    .select("*")
    .eq("is_active", true)
    .order("holiday_date");

  if (error) throw error;

  return data || [];
}

/**
 * My Leave Balance
 */
export async function getEmployeeLeaveBalance(
  employeeId,
  year = getCurrentLeaveYear(),
) {
  await recalculateLeaveBalances(employeeId);

  const [
    balanceResult,
    profileResult,
    settingsResult,
    requestResult,
    paidLeaveTypeResult,
  ] = await Promise.all([
    supabase
      .from("leave_balances")
      .select(
        `
          *,
          leave_type:leave_types (
            id,
            code,
            name,
            is_paid,
            deducts_balance
          )
        `,
      )
      .eq("employee_id", employeeId)
      .order("created_at"),
    supabase
      .from("profiles")
      .select("date_of_joining")
      .eq("id", employeeId)
      .maybeSingle(),
    supabase.from("leave_settings").select("*").limit(1).maybeSingle(),
    supabase
      .from("leave_requests")
      .select("leave_type_id, status, start_date, calculated_days")
      .eq("employee_id", employeeId)
      .eq("status", "approved"),
    supabase
      .from("leave_types")
      .select("id, code, name, is_paid, deducts_balance")
      .eq("code", "paid_leave")
      .maybeSingle(),
  ]);

  if (balanceResult.error) throw balanceResult.error;
  if (profileResult.error) throw profileResult.error;
  if (settingsResult.error) throw settingsResult.error;
  if (requestResult.error) throw requestResult.error;
  if (paidLeaveTypeResult.error) throw paidLeaveTypeResult.error;

  const adjustmentResult = await supabase
    .from("leave_adjustments")
    .select("leave_type_id, adjustment_days, created_at")
    .eq("employee_id", employeeId);

  if (adjustmentResult.error) {
    console.warn(
      "Live leave calculation could not read adjustments:",
      adjustmentResult.error.message,
    );
  }

  const allBalances = balanceResult.data || [];
  const balances = allBalances.filter((balance) => balance.leave_year === year);
  const storedPaidLeaveTemplate = allBalances.find(
    (balance) => balance.leave_type?.code === "paid_leave",
  );
  const paidLeaveTemplate =
    storedPaidLeaveTemplate ||
    (paidLeaveTypeResult.data
      ? {
          leave_type_id: paidLeaveTypeResult.data.id,
          leave_type: paidLeaveTypeResult.data,
        }
      : null);
  const joiningDate = profileResult.data?.date_of_joining
    ? new Date(`${profileResult.data.date_of_joining}T00:00:00`)
    : null;
  if (!paidLeaveTemplate || !joiningDate) return balances;

  const carryForwardEnabled = Boolean(
    settingsResult.data?.carry_forward_enabled,
  );
  const carryForwardLimit = Number(
    settingsResult.data?.max_carry_forward ?? 12,
  );
  const firstLeaveYear = getCurrentLeaveYear(joiningDate);
  let openingBalance = 0;
  let calculatedBalance = null;

  for (
    let calculationYear = firstLeaveYear;
    calculationYear <= year;
    calculationYear += 1
  ) {
    const storedBalance = allBalances.find(
      (balance) =>
        balance.leave_year === calculationYear &&
        balance.leave_type?.code === "paid_leave",
    );
    const policyAccrual = getPolicyAccrualContext(
      settingsResult.data,
      profileResult.data?.date_of_joining,
      calculationYear,
    );
    const used = (requestResult.data || [])
      .filter(
        (request) =>
          request.leave_type_id === paidLeaveTemplate.leave_type_id &&
          getCurrentLeaveYear(parseDateOnly(request.start_date)) ===
            calculationYear,
      )
      .reduce(
        (total, request) => total + Number(request.calculated_days || 0),
        0,
      );
    const adjusted = adjustmentResult.error
      ? Number(storedBalance?.adjusted || 0)
      : (adjustmentResult.data || [])
          .filter(
            (adjustment) =>
              adjustment.leave_type_id === paidLeaveTemplate.leave_type_id &&
              getCurrentLeaveYear(new Date(adjustment.created_at)) ===
                calculationYear,
          )
          .reduce(
            (total, adjustment) =>
              total + Number(adjustment.adjustment_days || 0),
            0,
          );
    const credited = Number(policyAccrual?.credited || 0);
    const availableBalance = Math.max(
      openingBalance + credited + adjusted - used,
      0,
    );

    calculatedBalance = {
      ...(storedBalance || paidLeaveTemplate),
      id:
        storedBalance?.id ||
        `calculated-paid-leave-${employeeId}-${calculationYear}`,
      employee_id: employeeId,
      leave_type_id: paidLeaveTemplate.leave_type_id,
      leave_year: calculationYear,
      opening_balance: openingBalance,
      credited,
      used,
      adjusted,
      available_balance: availableBalance,
      calculation_source: "live_policy",
      calculation_issue: "",
      date_of_joining: profileResult.data.date_of_joining,
      policy_annual_allowance: Number(policyAccrual?.annualAllowance || 0),
      policy_monthly_credit: Number(policyAccrual?.monthlyCredit || 0),
      eligible_months: Number(policyAccrual?.eligibleMonths || 0),
      calculated_as_of: new Date().toISOString(),
    };

    openingBalance = carryForwardEnabled
      ? Math.min(availableBalance, carryForwardLimit)
      : 0;
  }

  if (!calculatedBalance) return balances;

  return [
    calculatedBalance,
    ...balances.filter((balance) => balance.leave_type?.code !== "paid_leave"),
  ];
}

export async function getMyLeaveBalance(year = getCurrentLeaveYear()) {
  const employeeId = await getCurrentEmployeeId();
  return getEmployeeLeaveBalance(employeeId, year);
}

/**
 * My Leave Requests
 */
export async function getMyLeaveRequests() {
  const employeeId = await getCurrentEmployeeId();
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      `
      *,
      leave_type:leave_types (
        id,
        code,
        name,
        deducts_balance
      )
    `,
    )
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getEmployeeLeaveRequests(
  employeeId,
  year = getCurrentLeaveYear(),
) {
  const { startDate, endDate } = getLeaveYearRange(year);
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      `
      *,
      leave_type:leave_types (
        id,
        code,
        name,
        deducts_balance
      )
    `,
    )
    .eq("employee_id", employeeId)
    .gte("end_date", startDate)
    .lte("start_date", endDate)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Create Leave Request
 */
export async function createLeaveRequest(payload) {
  const { data, error } = await supabase.rpc("submit_leave_request", {
    p_leave_type_id: payload.leave_type_id,
    p_start_date: payload.start_date,
    p_end_date: payload.end_date,
    p_is_half_day: payload.is_half_day,
    p_half_day_date: payload.half_day_date,
    p_reason: payload.reason,
  });

  if (error) throw error;

  return data;
}

export async function createLeaveRequestForEmployee(payload) {
  const { data, error } = await supabase.rpc(
    "submit_leave_request_for_employee",
    {
      p_employee_id: payload.employee_id,
      p_leave_type_id: payload.leave_type_id,
      p_start_date: payload.start_date,
      p_end_date: payload.end_date,
      p_is_half_day: payload.is_half_day,
      p_reason: payload.reason,
    },
  );

  if (error) throw error;

  return data;
}

/**
 * Update Pending Leave Request
 */
export async function updateLeaveRequest(id, updates) {
  const { data, error } = await supabase.rpc("update_own_leave_request", {
    p_request_id: id,
    p_leave_type_id: updates.leave_type_id,
    p_start_date: updates.start_date,
    p_end_date: updates.end_date,
    p_is_half_day: updates.is_half_day,
    p_half_day_date: updates.half_day_date,
    p_reason: updates.reason,
  });

  if (error) throw error;

  return data;
}

/**
 * Cancel Leave Request
 */
export async function cancelLeaveRequest(id) {
  const { data, error } = await supabase.rpc("cancel_own_leave_request", {
    p_request_id: id,
  });

  if (error) throw error;

  return data;
}

/**
 * Pending Leave Requests for Manager
 */
export async function getPendingLeaveApprovals() {
  const currentProfile = await getCurrentEmployeeProfile();
  let query = supabase
    .from("leave_requests")
    .select(
      `
      *,
      employee:profiles!leave_requests_employee_id_fkey!inner (
        id,
        full_name,
        employee_code,
        designation,
        manager_id
      ),
      leave_type:leave_types (
        id,
        code,
        name
      )
    `,
    )
    .in("status", ["pending_manager", "pending_hr"])
    .order("created_at");

  if (currentProfile.role === "manager") {
    query = query.eq("employee.manager_id", currentProfile.id);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

export async function getApprovedLeaveRequestsForManager(
  year = getCurrentLeaveYear(),
) {
  const currentProfile = await getCurrentEmployeeProfile();
  const { startDate, endDate } = getLeaveYearRange(year);
  let query = supabase
    .from("leave_requests")
    .select(
      `
      *,
      employee:profiles!leave_requests_employee_id_fkey!inner (
        id,
        full_name,
        employee_code,
        designation,
        manager_id
      ),
      leave_type:leave_types (
        id,
        code,
        name
      )
    `,
    )
    .eq("status", "approved")
    .gte("start_date", startDate)
    .lte("start_date", endDate)
    .order("manager_action_at", { ascending: false });

  if (currentProfile.role === "manager") {
    query = query.eq("employee.manager_id", currentProfile.id);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}
