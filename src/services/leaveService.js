import { supabase } from "./supabaseClient";

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
  const { data, error } = await supabase
    .from("leave_requests")
    .update({
      status: "approved",
      manager_status: "approved",
      manager_comments: comments,
      manager_action_at: new Date().toISOString(),
      current_approval_level: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Reject Leave Request
 */
export async function rejectLeaveRequest(id, comments = "") {
  const { data, error } = await supabase
    .from("leave_requests")
    .update({
      status: "rejected",
      manager_status: "rejected",
      manager_comments: comments,
      manager_action_at: new Date().toISOString(),
      current_approval_level: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Leave Balances for HR/Admin
 */
export async function getLeaveBalances(year = new Date().getFullYear()) {
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
 * Leave Settings
 */

export async function getLeaveSettings() {
  const { data, error } = await supabase
    .from("leave_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

/**
 * Monthly Leave Credit
 */
export async function runMonthlyLeaveCredit() {
  const { data, error } = await supabase.rpc("run_monthly_leave_credit");

  if (error) throw error;

  return data;
}

/**
 * Recalculate Leave Balance
 */
export async function recalculateLeaveBalances(employeeId = null) {
  const { data, error } = await supabase.rpc("recalculate_leave_balances", {
    p_employee_id: employeeId,
  });

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
  const { data, error } = await supabase
    .from("holiday_calendar")
    .insert(payload)
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
export async function getMyLeaveBalance(year = new Date().getFullYear()) {
  const { data, error } = await supabase
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
    .eq("leave_year", year)
    .order("created_at");

  if (error) throw error;

  return data || [];
}

/**
 * My Leave Requests
 */
export async function getMyLeaveRequests() {
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      `
      *,
      leave_type:leave_types (
        id,
        code,
        name
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Create Leave Request
 */
export async function createLeaveRequest(payload) {
  const { data, error } = await supabase
    .from("leave_requests")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Update Pending Leave Request
 */
export async function updateLeaveRequest(id, updates) {
  const { data, error } = await supabase
    .from("leave_requests")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Cancel Leave Request
 */
export async function cancelLeaveRequest(id) {
  const { data, error } = await supabase
    .from("leave_requests")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Pending Leave Requests for Manager
 */
export async function getPendingLeaveApprovals() {
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      `
      *,
      employee:profiles!leave_requests_employee_id_fkey (
        id,
        full_name,
        employee_code,
        designation
      ),
      leave_type:leave_types (
        id,
        code,
        name
      )
    `,
    )
    .eq("status", "pending_manager")
    .order("created_at");

  if (error) throw error;

  return data || [];
}
