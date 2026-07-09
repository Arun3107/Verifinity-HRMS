import { useEffect, useState } from "react";
import {
  approveLeaveRequest,
  getPendingLeaveApprovals,
  rejectLeaveRequest,
} from "../../services/leaveService";

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

export default function ManagerLeavePage() {
  const [requests, setRequests] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRequests() {
    setLoading(true);
    setError("");

    try {
      const data = await getPendingLeaveApprovals();
      setRequests(data);
    } catch (err) {
      setError(err.message || "Unable to load pending leave requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadInitialRequests() {
      await loadRequests();
    }

    loadInitialRequests();
  }, []);

  function handleCommentChange(id, value) {
    setComments((current) => ({
      ...current,
      [id]: value,
    }));
  }

  async function handleApprove(id) {
    setError("");
    setSuccess("");
    setActionId(id);

    try {
      await approveLeaveRequest(id, comments[id] || "");
      setSuccess("Leave request approved.");
      await loadRequests();
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
      setSuccess("Leave request rejected.");
      await loadRequests();
    } catch (err) {
      setError(err.message || "Unable to reject leave request.");
    } finally {
      setActionId("");
    }
  }

  if (loading) {
    return <div className="page-card">Loading pending leave requests...</div>;
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Manager Leave Approvals</h1>
          <p>Review pending leave requests from your direct reports.</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <section className="page-card">
        <div className="section-header">
          <div>
            <h2>Pending Requests</h2>
            <p>
              {requests.length} request{requests.length === 1 ? "" : "s"}{" "}
              awaiting action
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <p className="muted-text">No pending leave requests.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Comments</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>
                        {request.employee?.full_name || "Employee"}
                      </strong>
                      <p className="muted-text">
                        {request.employee?.employee_code || "-"} ·{" "}
                        {request.employee?.designation || "-"}
                      </p>
                    </td>
                    <td>{request.leave_type?.name || "Leave"}</td>
                    <td>
                      {formatDate(request.start_date)} to{" "}
                      {formatDate(request.end_date)}
                    </td>
                    <td>{formatDays(request.calculated_days)}</td>
                    <td>{request.reason}</td>
                    <td>
                      <textarea
                        rows="3"
                        value={comments[request.id] || ""}
                        onChange={(event) =>
                          handleCommentChange(request.id, event.target.value)
                        }
                        placeholder="Optional for approval, required for rejection"
                      />
                    </td>
                    <td>
                      <div className="button-stack">
                        <button
                          type="button"
                          className="primary-button"
                          disabled={actionId === request.id}
                          onClick={() => handleApprove(request.id)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          disabled={actionId === request.id}
                          onClick={() => handleReject(request.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
