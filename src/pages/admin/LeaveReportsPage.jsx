import { useEffect, useMemo, useState } from "react";
import { getLeaveBalances } from "../../services/leaveService";

function getCurrentYear() {
  return new Date().getFullYear();
}

function formatDays(value) {
  const number = Number(value || 0);
  return number === 1 ? "1 day" : `${number} days`;
}

export default function LeaveReportsPage() {
  const [year, setYear] = useState(getCurrentYear());
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getLeaveBalances(Number(year))
      .then((data) => {
        setBalances(data);
      })
      .catch((err) => {
        setError(err.message || "Unable to load leave report.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [year]);

  const summary = useMemo(() => {
    return balances.reduce(
      (totals, balance) => ({
        credited: totals.credited + Number(balance.credited || 0),
        used: totals.used + Number(balance.used || 0),
        adjusted: totals.adjusted + Number(balance.adjusted || 0),
        available: totals.available + Number(balance.available_balance || 0),
      }),
      {
        credited: 0,
        used: 0,
        adjusted: 0,
        available: 0,
      },
    );
  }, [balances]);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Leave Reports</h1>
          <p>Review employee leave balances and usage by year.</p>
        </div>
        <label>
          Report Year
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </label>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Credited</span>
          <strong>{formatDays(summary.credited)}</strong>
        </div>
        <div className="stat-card">
          <span>Total Used</span>
          <strong>{formatDays(summary.used)}</strong>
        </div>
        <div className="stat-card">
          <span>Total Adjusted</span>
          <strong>{formatDays(summary.adjusted)}</strong>
        </div>
        <div className="stat-card">
          <span>Total Available</span>
          <strong>{formatDays(summary.available)}</strong>
        </div>
      </div>

      <section className="page-card">
        <div className="section-header">
          <div>
            <h2>Leave Balance Report</h2>
            <p>
              {balances.length} balance record{balances.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="muted-text">Loading leave report...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Opening</th>
                  <th>Credited</th>
                  <th>Used</th>
                  <th>Adjusted</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {balances.length === 0 ? (
                  <tr>
                    <td colSpan="8">No leave balance records found.</td>
                  </tr>
                ) : (
                  balances.map((balance) => (
                    <tr key={balance.id}>
                      <td>
                        <strong>
                          {balance.employee?.full_name || "Employee"}
                        </strong>
                        <p className="muted-text">
                          {balance.employee?.employee_code || "-"}
                        </p>
                      </td>
                      <td>{balance.employee?.department?.name || "-"}</td>
                      <td>{balance.leave_type?.name || "Leave"}</td>
                      <td>{balance.opening_balance || 0}</td>
                      <td>{balance.credited || 0}</td>
                      <td>{balance.used || 0}</td>
                      <td>{balance.adjusted || 0}</td>
                      <td>
                        <strong>{balance.available_balance || 0}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
