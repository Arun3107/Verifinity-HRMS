import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, IdCard, Save, UserPlus } from "lucide-react";
import {
  createEmployeeProfile,
  getDepartments,
  getManagerOptions,
} from "../../services/employeeService";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d8dee8",
  borderRadius: 12,
  fontSize: 14,
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
  outline: "none",
  minHeight: 46,
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: "#334155",
  marginBottom: 8,
  letterSpacing: "0.02em",
};

const sectionCardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 24,
  maxWidth: 1120,
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
};

export default function EmployeeCreatePage() {
  const navigate = useNavigate();
  const dateInputRef = useRef(null);

  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [form, setForm] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    departmentId: "",
    designation: "",
    managerId: "",
    dateOfJoining: "",
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
      await createEmployeeProfile({
        ...form,
        employmentStatus: "active",
      });
      navigate("/employees");
    } catch (error) {
      console.error(error);
      setErrorText(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 1180 }}>
      <button
        type="button"
        onClick={() => navigate("/employees")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          border: "1px solid #dbeafe",
          background: "#eff6ff",
          color: "#2563eb",
          cursor: "pointer",
          marginBottom: 18,
          fontWeight: 800,
          borderRadius: 999,
          padding: "8px 12px",
        }}
      >
        <ArrowLeft size={16} />
        Back to Employees
      </button>

      <div
        style={{
          marginBottom: 22,
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
              fontSize: 34,
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
            }}
          >
            Create Employee
          </h1>
          <p style={{ color: "#64748b", margin: "8px 0 0", fontSize: 15 }}>
            Add basic employment details. The employee will be active by
            default.
          </p>
        </div>

        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "white",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 12px 24px rgba(37, 99, 235, 0.22)",
          }}
        >
          <UserPlus size={24} />
        </div>
      </div>

      <form onSubmit={handleSubmit} style={sectionCardStyle}>
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
            <label style={labelStyle}>Employee ID *</label>
            <div style={{ position: "relative" }}>
              <IdCard
                size={17}
                style={{
                  position: "absolute",
                  left: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                style={{ ...inputStyle, paddingLeft: 40 }}
                value={form.employeeCode}
                onChange={(event) =>
                  updateField("employeeCode", event.target.value)
                }
                placeholder="EMP-001"
                required
              />
            </div>
          </div>

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
            <div
              style={{ position: "relative", cursor: "pointer" }}
              onClick={() => {
                if (dateInputRef.current?.showPicker) {
                  dateInputRef.current.showPicker();
                } else {
                  dateInputRef.current?.focus();
                }
              }}
            >
              <CalendarDays
                size={17}
                style={{
                  position: "absolute",
                  left: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              />
              <input
                type="date"
                ref={dateInputRef}
                style={{ ...inputStyle, paddingLeft: 40, cursor: "pointer" }}
                value={form.dateOfJoining}
                onChange={(event) =>
                  updateField("dateOfJoining", event.target.value)
                }
              />
            </div>
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
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid #f1f5f9",
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
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#ffffff",
              borderRadius: 12,
              padding: "11px 16px",
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
