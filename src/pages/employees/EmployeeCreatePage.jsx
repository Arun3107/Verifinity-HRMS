import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import {
  createEmployeeProfile,
  getDepartments,
  getManagerOptions,
} from "../../services/employeeService";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 14,
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 7,
};

export default function EmployeeCreatePage() {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    departmentId: "",
    designation: "",
    managerId: "",
    dateOfJoining: "",
    employmentStatus: "active",
    role: "employee",
  });

  useEffect(() => {
    async function loadOptions() {
      try {
        const [departmentData, managerData] = await Promise.all([
          getDepartments(),
          getManagerOptions(),
        ]);

        setDepartments(departmentData);
        setManagers(managerData);
      } catch (error) {
        console.error(error);
        setErrorText(error.message);
      }
    }

    loadOptions();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorText("");
    setSaving(true);

    try {
      await createEmployeeProfile(form);
      navigate("/employees");
    } catch (error) {
      console.error(error);
      setErrorText(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/employees")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: 0,
          background: "transparent",
          color: "#2563eb",
          cursor: "pointer",
          marginBottom: 18,
          fontWeight: 700,
        }}
      >
        <ArrowLeft size={16} />
        Back to Employees
      </button>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: "#111827" }}>Create Employee</h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Enter the basic employee details. HR can manually share the portal
          link after creating the employee.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          maxWidth: 1100,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        {errorText && (
          <div
            style={{
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: 12,
              marginBottom: 18,
            }}
          >
            {errorText}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input
              style={inputStyle}
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              placeholder="Employee full name"
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Verifinity Email *</label>
            <input
              type="email"
              style={inputStyle}
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="name@verifinity.com"
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Department</label>
            <select
              style={inputStyle}
              value={form.departmentId}
              onChange={(event) =>
                updateField("departmentId", event.target.value)
              }
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Designation</label>
            <input
              style={inputStyle}
              value={form.designation}
              onChange={(event) =>
                updateField("designation", event.target.value)
              }
              placeholder="Designation"
            />
          </div>

          <div>
            <label style={labelStyle}>Reporting Manager</label>
            <select
              style={inputStyle}
              value={form.managerId}
              onChange={(event) => updateField("managerId", event.target.value)}
            >
              <option value="">Select manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name} -{" "}
                  {manager.designation || manager.verifinity_email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Date of Joining</label>
            <input
              type="date"
              style={inputStyle}
              value={form.dateOfJoining}
              onChange={(event) =>
                updateField("dateOfJoining", event.target.value)
              }
            />
          </div>

          <div>
            <label style={labelStyle}>Employment Status</label>
            <select
              style={inputStyle}
              value={form.employmentStatus}
              onChange={(event) =>
                updateField("employmentStatus", event.target.value)
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="probation">Probation</option>
              <option value="notice_period">Notice Period</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Role</label>
            <select
              style={inputStyle}
              value={form.role}
              onChange={(event) => updateField("role", event.target.value)}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="payroll">Payroll</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 26,
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/employees")}
            style={{
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              borderRadius: 10,
              padding: "10px 18px",
              cursor: "pointer",
              fontWeight: 700,
              minWidth: 104,
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: 0,
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 10,
              padding: "10px 14px",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 700,
              opacity: saving ? 0.7 : 1,
              minWidth: 164,
              justifyContent: "center",
            }}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Create Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
