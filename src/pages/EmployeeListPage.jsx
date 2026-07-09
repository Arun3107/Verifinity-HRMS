import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Users,
  UserCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";
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

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(
    (employee) => employee.is_active,
  ).length;
  const submittedEmployees = employees.filter(
    (employee) => employee.onboarding_status === "submitted",
  ).length;
  const approvedEmployees = employees.filter(
    (employee) => employee.onboarding_status === "approved",
  ).length;

  const statCards = [
    {
      label: "Total employees",
      value: totalEmployees,
      icon: Users,
      tone: "#2563eb",
      bg: "#eff6ff",
    },
    {
      label: "Active employees",
      value: activeEmployees,
      icon: UserCheck,
      tone: "#16a34a",
      bg: "#f0fdf4",
    },
    {
      label: "Submitted profiles",
      value: submittedEmployees,
      icon: Clock,
      tone: "#d97706",
      bg: "#fffbeb",
    },
    {
      label: "Approved profiles",
      value: approvedEmployees,
      icon: CheckCircle2,
      tone: "#0f766e",
      bg: "#ecfdf5",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 6px",
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Admin Portal
          </p>
          <h1
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 30,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            Employees
          </h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 15 }}>
            Manage employee records, onboarding status, and profile reviews.
          </p>
        </div>

        <button
          onClick={() => navigate("/employees/new")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "11px 16px",
            cursor: "pointer",
            fontWeight: 700,
            boxShadow: "0 10px 22px rgba(37, 99, 235, 0.22)",
          }}
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 18,
                boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#64748b",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {card.label}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#0f172a",
                      fontSize: 28,
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {card.value}
                  </p>
                </div>

                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: card.bg,
                    color: card.tone,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: "white",
          padding: 16,
          borderRadius: 18,
          border: "1px solid #e5e7eb",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)",
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
              minHeight: 44,
              padding: "0 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              color: "#94a3b8",
              background: "#f8fafc",
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
                background: "transparent",
                color: "#0f172a",
                fontSize: 14,
              }}
            />
          </div>

          <select
            value={onboardingFilter}
            onChange={(e) => setOnboardingFilter(e.target.value)}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "11px 12px",
              background: "white",
              color: "#111827",
              minHeight: 44,
              fontWeight: 600,
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
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f8fafc",
                textAlign: "left",
                color: "#64748b",
                fontSize: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <th style={{ padding: "14px 16px" }}>Name</th>
              <th style={{ padding: "14px 16px" }}>Email</th>
              <th style={{ padding: "14px 16px" }}>Designation</th>
              <th style={{ padding: "14px 16px" }}>Role</th>
              <th style={{ padding: "14px 16px" }}>Employment</th>
              <th style={{ padding: "14px 16px" }}>Onboarding</th>
              <th style={{ padding: "14px 16px" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: 24, color: "#64748b" }}>
                  Loading employees...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ padding: 28, color: "#64748b", textAlign: "center" }}
                >
                  No employees found for the selected filter.
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
                    color: "#334155",
                  }}
                >
                  <td
                    style={{
                      padding: "16px",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {employee.full_name}
                  </td>
                  <td style={{ padding: "16px", color: "#64748b" }}>
                    {employee.verifinity_email}
                  </td>
                  <td style={{ padding: "16px" }}>
                    {employee.designation || "-"}
                  </td>
                  <td style={{ padding: "16px", textTransform: "capitalize" }}>
                    {employee.role}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        background: employee.is_active ? "#dcfce7" : "#f1f5f9",
                        color: employee.is_active ? "#166534" : "#64748b",
                      }}
                    >
                      {employee.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={getOnboardingBadgeStyle(
                        employee.onboarding_status || "invited",
                      )}
                    >
                      {getOnboardingLabel(employee.onboarding_status)}
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
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
                        borderRadius: 10,
                        background: "white",
                        padding: "8px 11px",
                        cursor: "pointer",
                        color: "#111827",
                        fontWeight: 700,
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
