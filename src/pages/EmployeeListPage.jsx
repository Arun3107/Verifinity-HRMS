import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { getEmployees } from "../services/employeeService";

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

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

  const filtered = employees.filter((employee) =>
    `${employee.full_name} ${employee.verifinity_email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

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
            gap: 10,
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
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: 20 }}>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
