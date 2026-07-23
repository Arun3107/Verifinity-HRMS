import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  Pencil,
  Send,
  WalletCards,
  X,
} from "lucide-react";
import {
  cancelLeaveRequest,
  createLeaveRequest,
  getHolidayCalendar,
  getLeaveTypes,
  getMyLeaveBalance,
  getMyLeaveRequests,
  updateLeaveRequest,
} from "../../services/leaveService";
import {
  formatLeaveDate,
  formatLeaveDays,
  getCurrentLeaveYear,
  getLocalDateKey,
  parseDateOnly,
} from "../../utils/leaveUtils";

const initialForm = {
  leave_type_id: "",
  start_date: "",
  end_date: "",
  is_half_day: false,
  half_day_date: "",
  reason: "",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d9e0ea",
  borderRadius: 12,
  fontSize: 14,
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: "#475569",
  marginBottom: 7,
  letterSpacing: "0.02em",
};

const tableHeaderStyle = {
  padding: "9px 10px",
  textAlign: "left",
  color: "#64748b",
  fontSize: 10,
  fontWeight: 850,
  lineHeight: 1.25,
  letterSpacing: "0.035em",
  textTransform: "uppercase",
  borderBottom: "1px solid #e2e8f0",
  borderRight: "1px solid #e2e8f0",
  overflowWrap: "anywhere",
};

const tableCellStyle = {
  padding: "9px 10px",
  color: "#334155",
  fontSize: 12,
  lineHeight: 1.35,
  borderBottom: "1px solid #eef2f7",
  borderRight: "1px solid #eef2f7",
  verticalAlign: "top",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        background: "#ffffff",
        border: "1px solid #e6eaf0",
        borderRadius: 22,
        padding: 22,
        boxShadow: "0 18px 45px rgba(15, 23, 42, 0.055)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: "linear-gradient(135deg, #eff6ff, #ecfeff)",
            color: "#2563eb",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>
        <div>
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 18,
              fontWeight: 850,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h2>
          {description && (
            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, fullWidth, children }) {
  return (
    <div style={fullWidth ? { gridColumn: "1 / -1" } : undefined}>
      <label style={labelStyle}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, hint }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 14,
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          color,
          fontSize: 11,
          fontWeight: 850,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <Icon size={14} />
        {label}
      </div>
      <div style={{ marginTop: 7, fontSize: 20, fontWeight: 900 }}>{value}</div>
      {hint ? (
        <div
          style={{
            marginTop: 5,
            color: "#cbd5e1",
            fontSize: 10,
            lineHeight: 1.35,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function getStatusStyle(status) {
  if (status === "approved") {
    return { background: "#ecfdf5", color: "#166534", border: "#bbf7d0" };
  }

  if (["pending_manager", "pending_hr"].includes(status)) {
    return { background: "#fffbeb", color: "#92400e", border: "#fde68a" };
  }

  if (["rejected", "cancelled"].includes(status)) {
    return { background: "#fef2f2", color: "#991b1b", border: "#fecaca" };
  }

  return { background: "#f8fafc", color: "#475569", border: "#e2e8f0" };
}

function getStatusLabel(status) {
  if (!status) return "-";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isRequestInLeaveYear(request, leaveYear) {
  const startDate = parseDateOnly(request.start_date);
  return startDate && getCurrentLeaveYear(startDate) === leaveYear;
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
    const isoDate = getLocalDateKey(current);
    if (!isWeekend(current) && !holidaySet.has(isoDate)) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  if (isHalfDay) {
    if (!halfDayDate) return Math.max(count - 0.5, 0);

    const halfDay = new Date(`${halfDayDate}T00:00:00`);
    const halfDayIso = getLocalDateKey(halfDay);
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
    const currentLeaveYear = getCurrentLeaveYear();
    const currentYearRequests = requests.filter((request) =>
      isRequestInLeaveYear(request, currentLeaveYear),
    );
    const paidLeaveBalance = balances.find(
      (balance) => balance.leave_type?.code === "paid_leave",
    );

    return {
      available: Number(paidLeaveBalance?.available_balance || 0),
      opening: Number(paidLeaveBalance?.opening_balance || 0),
      credited: Number(paidLeaveBalance?.credited || 0),
      used: Number(paidLeaveBalance?.used || 0),
      adjusted: Number(paidLeaveBalance?.adjusted || 0),
      monthlyCredit: Number(paidLeaveBalance?.policy_monthly_credit || 0),
      eligibleMonths: Number(paidLeaveBalance?.eligible_months || 0),
      calculationIssue: paidLeaveBalance?.calculation_issue || "",
      pendingPaidDays: currentYearRequests
        .filter(
          (request) =>
            ["pending_manager", "pending_hr"].includes(request.status) &&
            request.leave_type?.deducts_balance,
        )
        .reduce(
          (total, request) => total + Number(request.calculated_days || 0),
          0,
        ),
      pending: currentYearRequests.filter((request) =>
        ["pending_manager", "pending_hr"].includes(request.status),
      ).length,
      approved: currentYearRequests.filter(
        (request) => request.status === "approved",
      ).length,
    };
  }, [balances, requests]);

  const selectedLeaveType = useMemo(
    () => leaveTypes.find((type) => type.id === form.leave_type_id),
    [leaveTypes, form.leave_type_id],
  );

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => {
      const next = {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "is_half_day") {
        next.half_day_date = checked ? current.start_date : "";
      }

      if (name === "start_date") {
        if (current.is_half_day) next.half_day_date = value;
        if (current.end_date && current.end_date < value) next.end_date = "";
      }

      return next;
    });
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
      half_day_date: request.is_half_day ? request.start_date || "" : "",
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
    if (!window.confirm("Cancel this pending leave request?")) return;

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

    const startDate = parseDateOnly(form.start_date);
    const endDate = parseDateOnly(form.end_date);
    const startLeaveYear = startDate ? getCurrentLeaveYear(startDate) : null;
    const endLeaveYear = endDate ? getCurrentLeaveYear(endDate) : null;

    if (startLeaveYear !== endLeaveYear) {
      setError(
        "Leave cannot span March 31. Submit separate requests for each leave year.",
      );
      return;
    }

    if (form.is_half_day) {
      const halfDayDate = form.half_day_date || form.start_date;
      const halfDay = parseDateOnly(halfDayDate);
      const halfDayIsOutsideRange =
        halfDayDate < form.start_date || halfDayDate > form.end_date;
      const halfDayIsHoliday = holidays.some(
        (holiday) => holiday.holiday_date === halfDayDate,
      );

      if (
        halfDayIsOutsideRange ||
        !halfDay ||
        isWeekend(halfDay) ||
        halfDayIsHoliday
      ) {
        setError("Half-day date must be a working day within the leave period.");
        return;
      }
    }

    const overlappingRequest = requests.find(
      (request) =>
        request.id !== editingRequestId &&
        ["pending_manager", "pending_hr", "approved"].includes(
          request.status,
        ) &&
        form.start_date <= request.end_date &&
        form.end_date >= request.start_date,
    );

    if (overlappingRequest) {
      setError(
        `The selected dates overlap with your ${getStatusLabel(overlappingRequest.status).toLowerCase()} ${overlappingRequest.leave_type?.name || "leave"} request.`,
      );
      return;
    }

    const reservedPaidDays = requests
      .filter(
        (request) =>
          request.id !== editingRequestId &&
          ["pending_manager", "pending_hr"].includes(request.status) &&
          request.leave_type?.deducts_balance &&
          isRequestInLeaveYear(request, startLeaveYear),
      )
      .reduce(
        (total, request) => total + Number(request.calculated_days || 0),
        0,
      );

    if (
      selectedLeaveType?.deducts_balance &&
      startLeaveYear === getCurrentLeaveYear() &&
      calculatedDays > Math.max(summary.available - reservedPaidDays, 0)
    ) {
      setError(
        "You do not have enough available leave after pending requests are reserved.",
      );
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
    return <div style={{ color: "#64748b" }}>Loading leave details...</div>;
  }

  const minimumEndDate = form.start_date || undefined;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1320,
        minWidth: 0,
        paddingBottom: 32,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 28,
          padding: 28,
          marginBottom: 22,
          background:
            "radial-gradient(circle at top left, rgba(37, 99, 235, 0.20), transparent 30%), linear-gradient(135deg, #0f172a 0%, #172554 48%, #0f172a 100%)",
          color: "#ffffff",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.20)",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -80,
            top: -80,
            width: 260,
            height: 260,
            borderRadius: 999,
            background: "rgba(14, 165, 233, 0.18)",
            filter: "blur(2px)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            gap: 22,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 74,
                height: 74,
                borderRadius: 24,
                background: "linear-gradient(135deg, #2563eb, #06b6d4)",
                display: "grid",
                placeItems: "center",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.24)",
                flexShrink: 0,
              }}
            >
              <CalendarDays size={30} />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 32,
                  lineHeight: 1.08,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  color: "#ffffff",
                }}
              >
                My Leave
              </h1>
              <p
                style={{
                  margin: "10px 0 0",
                  color: "#cbd5e1",
                  fontSize: 15,
                }}
              >
                Apply for leave, check your balance, and track request status.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 10,
              width: "min(100%, 448px)",
              flex: "1 1 400px",
            }}
          >
            <SummaryCard
              icon={WalletCards}
              label="Available"
              value={formatLeaveDays(summary.available)}
              color="#93c5fd"
              hint={
                summary.calculationIssue ||
                `${formatLeaveDays(summary.opening)} carried · ${formatLeaveDays(summary.credited)} accrued · ${formatLeaveDays(summary.used)} used · ${formatLeaveDays(summary.pendingPaidDays)} pending`
              }
            />
            <SummaryCard
              icon={Clock}
              label="Pending"
              value={summary.pending}
              color="#fde68a"
            />
            <SummaryCard
              icon={BadgeCheck}
              label="Approved"
              value={summary.approved}
              color="#86efac"
            />
          </div>
        </div>
      </div>

      {summary.calculationIssue ? (
        <div
          style={{
            margin: "-10px 0 18px",
            padding: "11px 14px",
            border: "1px solid #fde68a",
            borderRadius: 14,
            background: "#fffbeb",
            color: "#92400e",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Leave balance cannot be calculated: {summary.calculationIssue}
        </div>
      ) : null}

      {error && (
        <div
          style={{
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            borderRadius: 14,
            padding: 14,
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 700,
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#ecfdf5",
            color: "#166534",
            border: "1px solid #bbf7d0",
            borderRadius: 14,
            padding: 14,
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <div
        style={{
          width: "100%",
        }}
      >
        <SectionCard
          icon={CalendarDays}
          title={editingRequestId ? "Edit Leave Request" : "Apply Leave"}
          description="Choose your leave dates and provide a reason for the request."
        >
          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 18,
            }}
          >
            <Field label="Leave Type" required>
              <select
                name="leave_type_id"
                value={form.leave_type_id}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Start Date" required>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                  colorScheme: "light",
                }}
                onClick={(event) => event.currentTarget.showPicker?.()}
              />
            </Field>

            <Field label="End Date" required>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                min={minimumEndDate}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                  colorScheme: "light",
                }}
                onClick={(event) => event.currentTarget.showPicker?.()}
              />
            </Field>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 46,
                color: "#475569",
                fontSize: 13,
                fontWeight: 750,
                cursor: "pointer",
                alignSelf: "end",
              }}
            >
              <input
                type="checkbox"
                name="is_half_day"
                checked={form.is_half_day}
                onChange={handleChange}
                style={{ display: "none" }}
              />
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: form.is_half_day
                    ? "1px solid #2563eb"
                    : "1px solid #94a3b8",
                  background: form.is_half_day ? "#2563eb" : "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  boxSizing: "border-box",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.10)",
                  flexShrink: 0,
                }}
              >
                {form.is_half_day && (
                  <span
                    style={{
                      width: 8,
                      height: 4,
                      borderLeft: "2px solid #ffffff",
                      borderBottom: "2px solid #ffffff",
                      transform: "rotate(-45deg)",
                      marginTop: -2,
                    }}
                  />
                )}
              </span>
              Half-day leave on start date
            </label>

            <Field label="Reason" required fullWidth>
              <textarea
                name="reason"
                rows="4"
                value={form.reason}
                onChange={handleChange}
                placeholder="Add reason for leave"
                style={{
                  ...inputStyle,
                  minHeight: 96,
                  resize: "vertical",
                }}
              />
            </Field>

            <div
              style={{
                gridColumn: "1 / -1",
                background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                border: "1px solid #dbeafe",
                borderRadius: 16,
                padding: 14,
                color: "#475569",
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              Leave days after excluding weekends and holidays:{" "}
              <strong style={{ color: "#0f172a" }}>{calculatedDays}</strong>
            </div>

            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  border: "1px solid rgba(255,255,255,0.24)",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  borderRadius: 999,
                  padding: "12px 18px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontWeight: 850,
                  opacity: submitting ? 0.75 : 1,
                  boxShadow: "0 14px 30px rgba(37, 99, 235, 0.24)",
                }}
              >
                <Send size={16} />
                {submitting
                  ? "Saving..."
                  : editingRequestId
                    ? "Update Leave Request"
                    : "Submit Leave Request"}
              </button>
              {editingRequestId ? (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#334155",
                    borderRadius: 999,
                    padding: "11px 16px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontWeight: 800,
                  }}
                >
                  <X size={15} />
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </SectionCard>

      </div>

      <div style={{ marginTop: 18 }}>
        <SectionCard
          icon={History}
          title="Leave History"
          description="Review previous requests and manage requests awaiting approval."
        >
          <div
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
            }}
          >
            <table
              style={{
                width: "100%",
                maxWidth: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
                background: "#ffffff",
              }}
            >
              <colgroup>
                <col style={{ width: "15%" }} />
                <col style={{ width: "19%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  {[
                    "Type",
                    "Dates",
                    "Days",
                    "Status",
                    "Reason",
                    "Action",
                  ].map((heading) => (
                    <th key={heading} style={tableHeaderStyle}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        ...tableCellStyle,
                        padding: 24,
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      No leave requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => {
                    const statusStyle = getStatusStyle(request.status);

                    return (
                      <tr key={request.id}>
                        <td style={{ ...tableCellStyle, fontWeight: 750 }}>
                          {request.leave_type?.name || "Leave"}
                          {request.submitted_on_behalf && (
                            <div
                              style={{
                                marginTop: 5,
                                color: "#7c3aed",
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: "uppercase",
                              }}
                            >
                              Applied by admin
                            </div>
                          )}
                        </td>
                        <td style={tableCellStyle}>
                          {formatLeaveDate(request.start_date)}
                          <div
                            style={{
                              marginTop: 3,
                              color: "#64748b",
                              fontSize: 11,
                            }}
                          >
                            to {formatLeaveDate(request.end_date)}
                          </div>
                        </td>
                        <td style={{ ...tableCellStyle, fontWeight: 750 }}>
                          {request.calculated_days}
                        </td>
                        <td style={tableCellStyle}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "5px 9px",
                              borderRadius: 999,
                              background: statusStyle.background,
                              color: statusStyle.color,
                              border: `1px solid ${statusStyle.border}`,
                              fontSize: 11,
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getStatusLabel(request.status)}
                          </span>
                        </td>
                        <td
                          style={{
                            ...tableCellStyle,
                            maxWidth: 190,
                            lineHeight: 1.45,
                          }}
                        >
                          {request.reason}
                        </td>
                        <td style={tableCellStyle}>
                          {request.status === "pending_manager" ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleEditRequest(request)}
                                disabled={Boolean(actionId)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "7px 10px",
                                  borderRadius: 9,
                                  border: "1px solid #cbd5e1",
                                  background: "#ffffff",
                                  color: "#334155",
                                  fontSize: 12,
                                  fontWeight: 750,
                                  cursor: actionId ? "not-allowed" : "pointer",
                                }}
                              >
                                <Pencil size={13} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelRequest(request.id)}
                                disabled={actionId === request.id}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "7px 10px",
                                  borderRadius: 9,
                                  border: "1px solid #fecaca",
                                  background: "#fef2f2",
                                  color: "#b91c1c",
                                  fontSize: 12,
                                  fontWeight: 750,
                                  cursor:
                                    actionId === request.id
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                <X size={13} />
                                {actionId === request.id
                                  ? "Cancelling..."
                                  : "Cancel"}
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
