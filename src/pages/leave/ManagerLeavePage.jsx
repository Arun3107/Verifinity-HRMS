import { useEffect, useState } from "react";
import {
  CalendarPlus,
  Check,
  History,
  Inbox,
  MessageSquare,
  RotateCcw,
  Users,
  X,
} from "lucide-react";
import {
  approveLeaveRequest,
  createLeaveRequestForEmployee,
  getApprovedLeaveRequestsForManager,
  getLeaveTypes,
  getPendingLeaveApprovals,
  rejectLeaveRequest,
  revokeLeaveRequest,
} from "../../services/leaveService";
import { getEmployees } from "../../services/employeeService";
import {
  EmptyTableRow,
  FormGrid,
  LeaveAlert,
  LeaveButton,
  LeaveCheckbox,
  LeaveField,
  LeavePage,
  LeaveSection,
  LeaveTable,
  LoadingText,
} from "../../components/leave/LeaveManagementUI";
import {
  inputStyle,
  tableCellStyle,
} from "../../components/leave/leaveStyles";
import { formatLeaveDate, formatLeaveDays } from "../../utils/leaveUtils";
import { useAuth } from "../../hooks/useAuth";

const initialAdminLeaveForm = {
  employee_id: "",
  leave_type_id: "",
  start_date: "",
  end_date: "",
  is_half_day: false,
  reason: "",
};

export default function ManagerLeavePage() {
  const { role } = useAuth();
  const [requests, setRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [adminLeaveForm, setAdminLeaveForm] = useState(initialAdminLeaveForm);
  const [adminOptionsLoading, setAdminOptionsLoading] = useState(true);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRequests(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");

    try {
      const [pendingData, approvedData] = await Promise.all([
        getPendingLeaveApprovals(),
        getApprovedLeaveRequestsForManager(),
      ]);
      setRequests(pendingData);
      setApprovedRequests(approvedData);
    } catch (err) {
      setError(err.message || "Unable to load pending leave requests.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    Promise.all([
      getPendingLeaveApprovals(),
      getApprovedLeaveRequestsForManager(),
    ])
      .then(([pendingData, approvedData]) => {
        if (active) {
          setRequests(pendingData);
          setApprovedRequests(approvedData);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Unable to load pending leave requests.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (role !== "admin") return undefined;

    let active = true;

    Promise.all([getEmployees(), getLeaveTypes()])
      .then(([employeeData, leaveTypeData]) => {
        if (!active) return;
        setEmployees(employeeData.filter((employee) => employee.is_active));
        setLeaveTypes(leaveTypeData);
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Unable to load employee leave options.");
        }
      })
      .finally(() => {
        if (active) setAdminOptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [role]);

  function handleAdminLeaveChange(event) {
    const { name, value, type, checked } = event.target;

    setAdminLeaveForm((current) => {
      const next = {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };

      if (
        name === "start_date" &&
        current.end_date &&
        current.end_date < value
      ) {
        next.end_date = "";
      }

      return next;
    });
  }

  async function handleAdminLeaveSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !adminLeaveForm.employee_id ||
      !adminLeaveForm.leave_type_id ||
      !adminLeaveForm.start_date ||
      !adminLeaveForm.end_date ||
      !adminLeaveForm.reason.trim()
    ) {
      setError("Select an employee, leave type, dates, and reason.");
      return;
    }

    if (adminLeaveForm.end_date < adminLeaveForm.start_date) {
      setError("End date cannot be before start date.");
      return;
    }

    setAdminSubmitting(true);

    try {
      await createLeaveRequestForEmployee({
        ...adminLeaveForm,
        reason: adminLeaveForm.reason.trim(),
      });
      setAdminLeaveForm(initialAdminLeaveForm);
      setSuccess(
        "Leave request submitted for the employee and sent for manager approval.",
      );
      await loadRequests(false);
    } catch (err) {
      setError(err.message || "Unable to submit leave for the employee.");
    } finally {
      setAdminSubmitting(false);
    }
  }

  function handleCommentChange(id, value) {
    setComments((current) => ({ ...current, [id]: value }));
  }

  function clearComment(id) {
    setComments((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function handleApprove(id) {
    setError("");
    setSuccess("");
    setActionId(id);

    try {
      await approveLeaveRequest(id, comments[id]?.trim() || "");
      setSuccess("Leave request approved successfully.");
      clearComment(id);
      await loadRequests(false);
    } catch (err) {
      setError(err.message || "Unable to approve leave request.");
    } finally {
      setActionId("");
    }
  }

  async function handleReject(id) {
    setError("");
    setSuccess("");

    if (!comments[id]?.trim()) {
      setError("Please add a rejection reason before rejecting the request.");
      return;
    }

    setActionId(id);

    try {
      await rejectLeaveRequest(id, comments[id].trim());
      setSuccess("Leave request rejected successfully.");
      clearComment(id);
      await loadRequests(false);
    } catch (err) {
      setError(err.message || "Unable to reject leave request.");
    } finally {
      setActionId("");
    }
  }

  async function handleRevoke(id) {
    setError("");
    setSuccess("");

    if (!comments[id]?.trim()) {
      setError("Please add a reason before revoking approved leave.");
      return;
    }

    if (!window.confirm("Revoke this approved leave and restore its balance?")) {
      return;
    }

    setActionId(id);

    try {
      await revokeLeaveRequest(id, comments[id].trim());
      setSuccess("Approved leave revoked and balance restored.");
      clearComment(id);
      await loadRequests(false);
    } catch (err) {
      setError(err.message || "Unable to revoke approved leave.");
    } finally {
      setActionId("");
    }
  }

  if (loading) {
    return <LoadingText>Loading pending leave requests...</LoadingText>;
  }

  return (
    <LeavePage
      icon={Users}
      title="Manager Leave Approvals"
      description="Review employee leave requests awaiting manager approval."
      headerContent={
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(140px, 1fr))",
            gap: 10,
          }}
        >
          {[
            ["PENDING REQUESTS", requests.length],
            ["APPROVED THIS FY", approvedRequests.length],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                minWidth: 140,
                padding: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 16,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ color: "#93c5fd", fontSize: 11, fontWeight: 850 }}>
                {label}
              </div>
              <div style={{ marginTop: 5, fontSize: 22, fontWeight: 900 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      }
    >
      {error && <LeaveAlert type="error">{error}</LeaveAlert>}
      {success && <LeaveAlert type="success">{success}</LeaveAlert>}

      {role === "admin" && (
        <LeaveSection
          icon={CalendarPlus}
          title="Apply Leave for Employee"
          description="Submit a leave request on behalf of an employee. The request follows the normal manager approval workflow."
        >
          <form onSubmit={handleAdminLeaveSubmit}>
            <FormGrid minWidth={210}>
              <LeaveField label="Employee" required>
                <select
                  name="employee_id"
                  value={adminLeaveForm.employee_id}
                  onChange={handleAdminLeaveChange}
                  disabled={adminOptionsLoading || adminSubmitting}
                  style={inputStyle}
                >
                  <option value="">
                    {adminOptionsLoading
                      ? "Loading employees..."
                      : "Select employee"}
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}
                      {employee.designation
                        ? ` — ${employee.designation}`
                        : ""}
                    </option>
                  ))}
                </select>
              </LeaveField>

              <LeaveField label="Leave Type" required>
                <select
                  name="leave_type_id"
                  value={adminLeaveForm.leave_type_id}
                  onChange={handleAdminLeaveChange}
                  disabled={adminOptionsLoading || adminSubmitting}
                  style={inputStyle}
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map((leaveType) => (
                    <option key={leaveType.id} value={leaveType.id}>
                      {leaveType.name}
                    </option>
                  ))}
                </select>
              </LeaveField>

              <LeaveField label="Start Date" required>
                <input
                  type="date"
                  name="start_date"
                  value={adminLeaveForm.start_date}
                  onChange={handleAdminLeaveChange}
                  disabled={adminSubmitting}
                  onClick={(event) => event.currentTarget.showPicker?.()}
                  style={{
                    ...inputStyle,
                    cursor: adminSubmitting ? "not-allowed" : "pointer",
                    colorScheme: "light",
                  }}
                />
              </LeaveField>

              <LeaveField label="End Date" required>
                <input
                  type="date"
                  name="end_date"
                  value={adminLeaveForm.end_date}
                  min={adminLeaveForm.start_date || undefined}
                  onChange={handleAdminLeaveChange}
                  disabled={adminSubmitting}
                  onClick={(event) => event.currentTarget.showPicker?.()}
                  style={{
                    ...inputStyle,
                    cursor: adminSubmitting ? "not-allowed" : "pointer",
                    colorScheme: "light",
                  }}
                />
              </LeaveField>

              <LeaveField label="Leave Duration">
                <LeaveCheckbox
                  name="is_half_day"
                  label="Half-day on start date"
                  checked={adminLeaveForm.is_half_day}
                  onChange={handleAdminLeaveChange}
                  disabled={adminSubmitting}
                />
              </LeaveField>

              <LeaveField label="Reason" required fullWidth>
                <textarea
                  name="reason"
                  rows="3"
                  value={adminLeaveForm.reason}
                  onChange={handleAdminLeaveChange}
                  disabled={adminSubmitting}
                  placeholder="Reason for applying on behalf of the employee"
                  style={{
                    ...inputStyle,
                    minHeight: 82,
                    resize: "vertical",
                  }}
                />
              </LeaveField>
            </FormGrid>

            <div style={{ marginTop: 16 }}>
              <LeaveButton
                type="submit"
                icon={CalendarPlus}
                disabled={adminSubmitting || adminOptionsLoading}
              >
                {adminSubmitting ? "Submitting..." : "Submit for Approval"}
              </LeaveButton>
            </div>
          </form>
        </LeaveSection>
      )}

      <div style={{ marginTop: role === "admin" ? 18 : 0 }}>
      <LeaveSection
        icon={Inbox}
        title="Pending Requests"
        description={`${requests.length} request${requests.length === 1 ? "" : "s"} awaiting your action.`}
      >
        <LeaveTable
          headers={[
            "Employee / Leave",
            "Dates / Days",
            "Reason",
            "Comments",
            "Action",
          ]}
          columnWidths={["22%", "18%", "21%", "27%", "12%"]}
        >
          {requests.length === 0 ? (
            <EmptyTableRow colSpan={5}>No pending leave requests.</EmptyTableRow>
          ) : (
            requests.map((request) => (
              <tr key={request.id}>
                <td style={tableCellStyle}>
                  <strong style={{ color: "#0f172a" }}>
                    {request.employee?.full_name || "Employee"}
                  </strong>
                  <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
                    {request.employee?.employee_code || "-"} ·{" "}
                    {request.employee?.designation || "-"}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#2563eb",
                      fontSize: 12,
                      fontWeight: 750,
                    }}
                  >
                    {request.leave_type?.name || "Leave"}
                  </div>
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
                  {formatLeaveDate(request.start_date)} to{" "}
                  {formatLeaveDate(request.end_date)}
                  <div style={{ marginTop: 5, color: "#64748b", fontSize: 12 }}>
                    {formatLeaveDays(request.calculated_days)}
                  </div>
                </td>
                <td style={tableCellStyle}>
                  {request.reason || "-"}
                </td>
                <td style={tableCellStyle}>
                  <div style={{ position: "relative" }}>
                    <MessageSquare
                      size={15}
                      color="#94a3b8"
                      style={{ position: "absolute", left: 11, top: 12 }}
                    />
                    <textarea
                      rows="2"
                      value={comments[request.id] || ""}
                      onChange={(event) =>
                        handleCommentChange(request.id, event.target.value)
                      }
                      placeholder="Optional for approval, required for rejection"
                      style={{
                        ...inputStyle,
                        paddingLeft: 34,
                        minHeight: 52,
                        paddingTop: 8,
                        paddingBottom: 8,
                        fontSize: 12,
                        resize: "vertical",
                      }}
                    />
                  </div>
                </td>
                <td style={tableCellStyle}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <LeaveButton
                      type="button"
                      icon={Check}
                      disabled={Boolean(actionId)}
                      onClick={() => handleApprove(request.id)}
                      style={{ borderRadius: 10, padding: "8px 11px" }}
                    >
                      {actionId === request.id ? "Saving..." : "Approve"}
                    </LeaveButton>
                    <LeaveButton
                      type="button"
                      variant="danger"
                      icon={X}
                      disabled={Boolean(actionId)}
                      onClick={() => handleReject(request.id)}
                      style={{ borderRadius: 10, padding: "8px 11px" }}
                    >
                      Reject
                    </LeaveButton>
                  </div>
                </td>
              </tr>
            ))
          )}
        </LeaveTable>
      </LeaveSection>
      </div>

      <div style={{ marginTop: 18 }}>
        <LeaveSection
          icon={History}
          title="Approved Leave"
          description="Revoke an approval only when a correction is required. The deducted balance will be restored."
        >
          <LeaveTable
            headers={[
              "Employee / Leave",
              "Dates / Days",
              "Reason",
              "Revocation Reason",
              "Action",
            ]}
            columnWidths={["22%", "18%", "22%", "27%", "11%"]}
          >
            {approvedRequests.length === 0 ? (
              <EmptyTableRow colSpan={5}>
                No approved leave requests in the current leave year.
              </EmptyTableRow>
            ) : (
              approvedRequests.map((request) => (
                <tr key={request.id}>
                  <td style={tableCellStyle}>
                    <strong style={{ color: "#0f172a" }}>
                      {request.employee?.full_name || "Employee"}
                    </strong>
                    <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
                      {request.employee?.employee_code || "-"} ·{" "}
                      {request.employee?.designation || "-"}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        color: "#2563eb",
                        fontSize: 12,
                        fontWeight: 750,
                      }}
                    >
                      {request.leave_type?.name || "Leave"}
                    </div>
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
                    {formatLeaveDate(request.start_date)} to{" "}
                    {formatLeaveDate(request.end_date)}
                    <div style={{ marginTop: 5, color: "#64748b", fontSize: 12 }}>
                      {formatLeaveDays(request.calculated_days)}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    {request.reason || "-"}
                  </td>
                  <td style={tableCellStyle}>
                    <textarea
                      rows="2"
                      value={comments[request.id] || ""}
                      onChange={(event) =>
                        handleCommentChange(request.id, event.target.value)
                      }
                      placeholder="Required reason"
                      style={{
                        ...inputStyle,
                        minHeight: 52,
                        padding: "8px 9px",
                        fontSize: 12,
                        resize: "vertical",
                      }}
                    />
                  </td>
                  <td style={tableCellStyle}>
                    <LeaveButton
                      type="button"
                      variant="danger"
                      icon={RotateCcw}
                      disabled={Boolean(actionId)}
                      onClick={() => handleRevoke(request.id)}
                      style={{ borderRadius: 10, padding: "8px 11px" }}
                    >
                      {actionId === request.id ? "Revoking..." : "Revoke"}
                    </LeaveButton>
                  </td>
                </tr>
              ))
            )}
          </LeaveTable>
        </LeaveSection>
      </div>
    </LeavePage>
  );
}
