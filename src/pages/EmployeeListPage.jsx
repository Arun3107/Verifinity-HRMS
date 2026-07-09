import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Eye } from "lucide-react";
import { getEmployees } from "../services/employeeService";

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [onboardingFilter, setOnboardingFilter] = useState("all");

  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await getEmployees();
        setEmployees(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadEmployees();
  }, []);

  function getOnboardingLabel(status) {
    if (status === "submitted") return "Submitted";
    if (status === "approved") return "Approved";
    if (status === "rejected") return "Rejected";
    return "Invited";
  }

  function getOnboardingBadgeStyle(status) {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 12,
      fontWeight: 700,
    };

    if (status === "submitted") {
      return { ...base, background: "#dbeafe", color: "#1d4ed8" };
    }

    if (status === "approved") {
      return { ...base, background: "#dcfce7", color: "#166534" };
    }

    if (status === "rejected") {
      return { ...base, background: "#fee2e2", color: "#991b1b" };
    }

    return { ...base, background: "#fef3c7", color: "#92400e" };
  }

  const filtered = employees.filter((employee) => {
    const matchesSearch = `${employee.full_name} ${employee.verifinity_email}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesOnboarding =
      onboardingFilter === "all" ||
      (employee.onboarding_status || "invited") === onboardingFilter;

    return matchesSearch && matchesOnboarding;
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Employees</h1>
          <p style={{ color: "#64748b" }}>
            Manage employee records and onboarding.
          </p>
        </div>

        <button
          onClick={() => navigate("/employees/new")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
            cursor: "pointer",
          }}
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      <div
        style={{
          background: "white",
          padding: 16,
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flex: 1,
            }}
          >
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              style={{
                border: "none",
                outline: "none",
                width: "100%",
              }}
            />
          </div>

          <select
            value={onboardingFilter}
            onChange={(e) => setOnboardingFilter(e.target.value)}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "9px 12px",
              background: "white",
              color: "#111827",
            }}
          >
            <option value="all">All onboarding</option>
            <option value="invited">Invited</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f8fafc",
                textAlign: "left",
              }}
            >
              <th style={{ padding: 14 }}>Name</th>
              <th>Email</th>
              <th>Designation</th>
              <th>Role</th>
              <th>Employment</th>
              <th>Onboarding</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: 20 }}>
                  Loading...
                </td>
              </tr>
            ) : (
              filtered.map((employee) => (
                <tr
                  key={employee.id}
                  onClick={() => navigate(`/employees/${employee.id}`)}
                  style={{
                    borderTop: "1px solid #f1f5f9",
                    cursor: "pointer",
                  }}
                >
                  <td style={{ padding: 14 }}>{employee.full_name}</td>
                  <td>{employee.verifinity_email}</td>
                  <td>{employee.designation || "-"}</td>
                  <td>{employee.role}</td>
                  <td>{employee.is_active ? "Active" : "Inactive"}</td>
                  <td>
                    <span
                      style={getOnboardingBadgeStyle(
                        employee.onboarding_status || "invited",
                      )}
                    >
                      {getOnboardingLabel(employee.onboarding_status)}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/employees/${employee.id}`);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        background: "white",
                        padding: "7px 10px",
                        cursor: "pointer",
                        color: "#111827",
                      }}
                    >
                      <Eye size={14} />
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
