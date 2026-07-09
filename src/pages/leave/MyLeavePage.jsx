import { useEffect, useMemo, useState } from "react";
import {
  cancelLeaveRequest,
  createLeaveRequest,
  getHolidayCalendar,
  getLeaveTypes,
  getMyLeaveBalance,
  getMyLeaveRequests,
  updateLeaveRequest,
} from "../../services/leaveService";

const initialForm = {
  leave_type_id: "",
  start_date: "",
  end_date: "",
  is_half_day: false,
  half_day_date: "",
  reason: "",
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDays(value) {
  const number = Number(value || 0);
  return number === 1 ? "1 day" : `${number} days`;
}

function getStatusLabel(status) {
  if (!status) return "-";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function calculateLeaveDays(
  startDate,
  endDate,
  isHalfDay,
  halfDayDate,
  holidays,
) {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (end < start) return 0;

  const holidaySet = new Set(holidays.map((holiday) => holiday.holiday_date));
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const isoDate = current.toISOString().slice(0, 10);
    if (!isWeekend(current) && !holidaySet.has(isoDate)) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  if (isHalfDay) {
    if (!halfDayDate) return Math.max(count - 0.5, 0);

    const halfDay = new Date(`${halfDayDate}T00:00:00`);
    const halfDayIso = halfDay.toISOString().slice(0, 10);
    const isValidHalfDay =
      halfDay >= start &&
      halfDay <= end &&
      !isWeekend(halfDay) &&
      !holidaySet.has(halfDayIso);

    if (isValidHalfDay) return Math.max(count - 0.5, 0);
  }

  return count;
}

export default function MyLeavePage() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingRequestId, setEditingRequestId] = useState("");
  const [actionId, setActionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadLeaveData() {
    setLoading(true);
    setError("");

    try {
      const [typesData, holidaysData, balancesData, requestsData] =
        await Promise.all([
          getLeaveTypes(),
          getHolidayCalendar(),
          getMyLeaveBalance(),
          getMyLeaveRequests(),
        ]);

      setLeaveTypes(typesData);
      setHolidays(holidaysData);
      setBalances(balancesData);
      setRequests(requestsData);
    } catch (err) {
      setError(err.message || "Unable to load leave details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadInitialLeaveData() {
      await loadLeaveData();
    }

    loadInitialLeaveData();
  }, []);

  const calculatedDays = useMemo(
    () =>
      calculateLeaveDays(
        form.start_date,
        form.end_date,
        form.is_half_day,
        form.half_day_date,
        holidays,
      ),
    [
      form.start_date,
      form.end_date,
      form.is_half_day,
      form.half_day_date,
      holidays,
    ],
  );

  const summary = useMemo(() => {
    const paidLeaveBalance = balances.find(
      (balance) => balance.leave_type?.code === "paid_leave",
    );

    return {
      available: Number(paidLeaveBalance?.available_balance || 0),
      pending: requests.filter((request) =>
        ["pending_manager", "pending_hr"].includes(request.status),
      ).length,
      approved: requests.filter((request) => request.status === "approved")
        .length,
    };
  }, [balances, requests]);

  const selectedLeaveType = useMemo(
    () => leaveTypes.find((type) => type.id === form.leave_type_id),
    [leaveTypes, form.leave_type_id],
  );

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleEditRequest(request) {
    if (request.status !== "pending_manager") {
      setError("Only pending leave requests can be edited.");
      return;
    }

    setEditingRequestId(request.id);
    setSuccess("");
    setError("");
    setForm({
      leave_type_id: request.leave_type_id || "",
      start_date: request.start_date || "",
      end_date: request.end_date || "",
      is_half_day: Boolean(request.is_half_day),
      half_day_date: request.half_day_date || "",
      reason: request.reason || "",
    });
  }

  function handleCancelEdit() {
    setEditingRequestId("");
    setForm(initialForm);
    setError("");
    setSuccess("");
  }

  async function handleCancelRequest(id) {
    setActionId(id);
    setError("");
    setSuccess("");

    try {
      await cancelLeaveRequest(id);
      setSuccess("Leave request cancelled successfully.");
      await loadLeaveData();
    } catch (err) {
      setError(err.message || "Unable to cancel leave request.");
    } finally {
      setActionId("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.leave_type_id ||
      !form.start_date ||
      !form.end_date ||
      !form.reason.trim()
    ) {
      setError("Please fill leave type, dates, and reason.");
      return;
    }

    if (calculatedDays <= 0) {
      setError("Selected dates do not include any working leave day.");
      return;
    }

    if (
      !editingRequestId &&
      selectedLeaveType?.code === "paid_leave" &&
      calculatedDays > summary.available
    ) {
      setError("You do not have enough Paid Leave balance for this request.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        is_half_day: form.is_half_day,
        half_day_date: form.is_half_day
          ? form.half_day_date || form.start_date
          : null,
        calculated_days: calculatedDays,
        reason: form.reason.trim(),
        updated_at: new Date().toISOString(),
      };

      if (editingRequestId) {
        await updateLeaveRequest(editingRequestId, payload);
        setSuccess("Leave request updated successfully.");
      } else {
        await createLeaveRequest(payload);
        setSuccess("Leave request submitted successfully.");
      }

      setEditingRequestId("");
      setForm(initialForm);
      await loadLeaveData();
    } catch (err) {
      setError(err.message || "Unable to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="page-card">Loading leave details...</div>;
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>My Leave</h1>
          <p>Apply for leave, check your balance, and track request status.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="stats-grid">
        <div className="stat-card">
          <span>Available Leave</span>
          <strong>{formatDays(summary.available)}</strong>
        </div>
        <div className="stat-card">
          <span>Pending Requests</span>
          <strong>{summary.pending}</strong>
        </div>
        <div className="stat-card">
          <span>Approved Requests</span>
          <strong>{summary.approved}</strong>
        </div>
      </div>

      <div className="content-grid two-column-grid">
        <section className="page-card">
          <h2>{editingRequestId ? "Edit Leave Request" : "Apply Leave"}</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Leave Type
              <select
                name="leave_type_id"
                value={form.leave_type_id}
                onChange={handleChange}
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Start Date
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
              />
            </label>

            <label>
              End Date
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                name="is_half_day"
                checked={form.is_half_day}
                onChange={handleChange}
              />
              Half-day leave
            </label>

            {form.is_half_day ? (
              <label>
                Half Day Date
                <input
                  type="date"
                  name="half_day_date"
                  value={form.half_day_date}
                  onChange={handleChange}
                />
              </label>
            ) : null}

            <label className="full-width">
              Reason
              <textarea
                name="reason"
                rows="4"
                value={form.reason}
                onChange={handleChange}
                placeholder="Add reason for leave"
              />
            </label>

            <div className="full-width muted-box">
              Leave days after excluding weekends and holidays:{" "}
              <strong>{calculatedDays}</strong>
            </div>

            <div className="form-actions full-width">
              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : editingRequestId
                    ? "Update Leave Request"
                    : "Submit Leave Request"}
              </button>
              {editingRequestId ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="page-card">
          <h2>Leave Balance</h2>
          <div className="simple-list">
            {balances.length === 0 ? (
              <p className="muted-text">
                No leave balance found for this year.
              </p>
            ) : (
              balances.map((balance) => (
                <div className="simple-list-item" key={balance.id}>
                  <div>
                    <strong>{balance.leave_type?.name || "Leave"}</strong>
                    <p>
                      Credited {balance.credited || 0} | Used{" "}
                      {balance.used || 0} | Adjusted {balance.adjusted || 0}
                    </p>
                  </div>
                  <strong>{balance.available_balance || 0}</strong>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="page-card">
        <h2>Leave History</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Days</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="7">No leave requests yet.</td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.leave_type?.name || "Leave"}</td>
                    <td>{formatDate(request.start_date)}</td>
                    <td>{formatDate(request.end_date)}</td>
                    <td>{request.calculated_days}</td>
                    <td>{getStatusLabel(request.status)}</td>
                    <td>{request.reason}</td>
                    <td>
                      {request.status === "pending_manager" ? (
                        <div className="button-row">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleEditRequest(request)}
                            disabled={Boolean(actionId)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={actionId === request.id}
                          >
                            {actionId === request.id
                              ? "Cancelling..."
                              : "Cancel"}
                          </button>
                        </div>
                      ) : (
                        <span className="muted-text">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
