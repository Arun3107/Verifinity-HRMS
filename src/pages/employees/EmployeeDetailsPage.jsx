import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  UserRound,
  Briefcase,
  CalendarDays,
  FileText,
  Laptop,
  Clock,
  CalendarCheck,
  Save,
} from "lucide-react";
import {
  approveEmployeeOnboarding,
  createEmployeeDocumentSignedUrl,
  getDepartments,
  getEmployeeById,
  getEmployeeDocuments,
  getManagerOptions,
  rejectEmployeeOnboarding,
  updateEmployeeEmploymentInfo,
} from "../../services/employeeService";

function DetailCard({ title, children }) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18, color: "#111827" }}>{title}</h2>
      <div style={{ marginTop: 16 }}>{children}</div>
    </section>
  );
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "#eff6ff",
          color: "#2563eb",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={17} />
      </div>

      <div>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
          {label}
        </div>
        <div style={{ marginTop: 3, color: "#111827", fontWeight: 600 }}>
          {value || "-"}
        </div>
      </div>
    </div>
  );
}

function PlaceholderPanel({ title, description }) {
  return (
    <DetailCard title={title}>
      <div
        style={{
          color: "#64748b",
          background: "#f8fafc",
          border: "1px dashed #cbd5e1",
          borderRadius: 12,
          padding: 18,
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </DetailCard>
  );
}

// Helper functions for onboarding status label and badge style
function getOnboardingLabel(status) {
  if (status === "submitted") return "Submitted for Review";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Invited";
}

function getOnboardingBadgeStyle(status) {
  const base = {
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 800,
    textTransform: "capitalize",
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

export default function EmployeeDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [savingEmployment, setSavingEmployment] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [editForm, setEditForm] = useState({
    employeeCode: "",
    departmentId: "",
    designation: "",
    managerId: "",
    dateOfJoining: "",
    employmentStatus: "",
    role: "",
    isActive: true,
  });

  useEffect(() => {
    async function loadDocuments() {
      if (activeTab !== "documents") return;

      try {
        setDocumentsLoading(true);
        const data = await getEmployeeDocuments(id);
        setDocuments(data);
      } catch (error) {
        console.error(error);
      } finally {
        setDocumentsLoading(false);
      }
    }

    loadDocuments();
  }, [activeTab, id]);

  useEffect(() => {
    let isMounted = true;

    async function loadEditOptions() {
      try {
        const [departmentData, managerData] = await Promise.all([
          getDepartments(),
          getManagerOptions(),
        ]);

        if (!isMounted) return;

        setDepartments(departmentData);
        setManagers(managerData);
      } catch (error) {
        console.error(error);
      }
    }

    loadEditOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    async function loadEmployee() {
      try {
        const data = await getEmployeeById(id);
        setEmployee(data);
        setEditForm({
          employeeCode: data.employee_code || "",
          departmentId: data.departments?.id || "",
          designation: data.designation || "",
          managerId: data.manager?.id || "",
          dateOfJoining: data.date_of_joining || "",
          employmentStatus: data.employment_status || "",
          role: data.role || "employee",
          isActive: Boolean(data.is_active),
        });
      } catch (error) {
        console.error(error);
        setErrorText(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadEmployee();
  }, [id]);

  if (loading) return <div>Loading employee...</div>;

  if (errorText) {
    return <div style={{ color: "red" }}>{errorText}</div>;
  }

  if (!employee) {
    return <div>Employee not found.</div>;
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "assets", label: "Assets", icon: Laptop },
    { id: "timesheets", label: "Timesheets", icon: Clock },
    { id: "leave", label: "Leave", icon: CalendarCheck },
  ];

  function getDocumentLabel(documentType) {
    if (documentType === "pan_card") return "PAN Card";
    if (documentType === "aadhaar_card") return "Aadhaar Card";
    if (documentType === "cancelled_cheque") return "Cancelled Cheque";
    if (documentType === "uan_pf_document") return "UAN / PF Document";
    return "Other Document";
  }

  async function handleViewDocument(filePath) {
    try {
      const signedUrl = await createEmployeeDocumentSignedUrl(filePath);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      alert("Unable to open document.");
    }
  }

  async function handleApproveOnboarding() {
    try {
      setStatusUpdating(true);

      await approveEmployeeOnboarding(employee.id);

      setEmployee((current) => ({
        ...current,
        onboarding_status: "approved",
      }));
      setSuccessText("Employee onboarding approved successfully.");
    } catch (error) {
      console.error(error);
      alert("Unable to approve onboarding.");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleRejectOnboarding() {
    try {
      setStatusUpdating(true);

      await rejectEmployeeOnboarding(employee.id);

      setEmployee((current) => ({
        ...current,
        onboarding_status: "rejected",
      }));
      setSuccessText("Employee onboarding rejected.");
    } catch (error) {
      console.error(error);
      alert("Unable to reject onboarding.");
    } finally {
      setStatusUpdating(false);
    }
  }

  function updateEditField(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveEmploymentInfo(event) {
    event.preventDefault();
    setSuccessText("");
    setErrorText("");
    setSavingEmployment(true);

    try {
      await updateEmployeeEmploymentInfo(employee.id, editForm);
      const refreshedEmployee = await getEmployeeById(employee.id);
      setEmployee(refreshedEmployee);
      setSuccessText("Employment information updated successfully.");
    } catch (error) {
      console.error(error);
      setErrorText(error.message);
    } finally {
      setSavingEmployment(false);
    }
  }

  return (
    <div>
      <button
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

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 24,
          marginBottom: 20,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 16,
                background: "#2563eb",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: 22,
              }}
            >
              {employee.full_name?.charAt(0)?.toUpperCase() || "E"}
            </div>

            <div>
              <h1 style={{ margin: 0, color: "#111827" }}>
                {employee.full_name}
              </h1>
              <p style={{ color: "#64748b", margin: "6px 0 0" }}>
                {employee.designation || "No designation"} ·{" "}
                {employee.departments?.name || "No department"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "7px 10px",
                borderRadius: 999,
                background: employee.is_active ? "#dcfce7" : "#fee2e2",
                color: employee.is_active ? "#166534" : "#991b1b",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {employee.is_active ? "Active" : "Inactive"}
            </span>

            <span
              style={getOnboardingBadgeStyle(
                employee.onboarding_status || "invited",
              )}
            >
              {getOnboardingLabel(employee.onboarding_status)}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 20,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 8,
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: 0,
                borderRadius: 10,
                padding: "10px 12px",
                background: isActive ? "#2563eb" : "transparent",
                color: isActive ? "#ffffff" : "#475569",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {successText && (
        <div
          style={{
            background: "#ecfdf5",
            color: "#166534",
            border: "1px solid #bbf7d0",
            borderRadius: 12,
            padding: 12,
            marginBottom: 18,
            fontWeight: 700,
          }}
        >
          {successText}
        </div>
      )}

      {activeTab === "profile" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 18,
          }}
        >
          {/* Onboarding Review Card */}
          <DetailCard title="Onboarding Review">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                  }}
                >
                  Current Status
                </div>

                <div style={{ marginTop: 8 }}>
                  <span
                    style={getOnboardingBadgeStyle(
                      employee.onboarding_status || "invited",
                    )}
                  >
                    {getOnboardingLabel(employee.onboarding_status)}
                  </span>
                </div>
              </div>

              {employee.onboarding_status !== "approved" &&
                employee.onboarding_status !== "rejected" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={handleApproveOnboarding}
                      style={{
                        border: 0,
                        background: "#16a34a",
                        color: "#ffffff",
                        borderRadius: 10,
                        padding: "10px 14px",
                        cursor: statusUpdating ? "not-allowed" : "pointer",
                        fontWeight: 800,
                      }}
                    >
                      Approve Onboarding
                    </button>

                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={handleRejectOnboarding}
                      style={{
                        border: 0,
                        background: "#dc2626",
                        color: "#ffffff",
                        borderRadius: 10,
                        padding: "10px 14px",
                        cursor: statusUpdating ? "not-allowed" : "pointer",
                        fontWeight: 800,
                      }}
                    >
                      Reject Onboarding
                    </button>
                  </div>
                )}
            </div>
          </DetailCard>

          <DetailCard title="Employment Information">
            <form onSubmit={handleSaveEmploymentInfo}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#374151",
                      marginBottom: 7,
                    }}
                  >
                    Employee ID
                  </label>
                  <input
                    value={editForm.employeeCode}
                    onChange={(event) =>
                      updateEditField("employeeCode", event.target.value)
                    }
                    placeholder="Example: EMP-001"
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      fontSize: 14,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#374151",
                      marginBottom: 7,
                    }}
                  >
                    Department
                  </label>
                  <select
                    value={editForm.departmentId}
                    onChange={(event) =>
                      updateEditField("departmentId", event.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      fontSize: 14,
                      background: "#ffffff",
                    }}
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
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#374151",
                      marginBottom: 7,
                    }}
                  >
                    Designation
                  </label>
                  <input
                    value={editForm.designation}
                    onChange={(event) =>
                      updateEditField("designation", event.target.value)
                    }
                    placeholder="Example: Customer Support Executive"
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      fontSize: 14,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#374151",
                      marginBottom: 7,
                    }}
                  >
                    Reporting Manager
                  </label>
                  <select
                    value={editForm.managerId}
                    onChange={(event) =>
                      updateEditField("managerId", event.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      fontSize: 14,
                      background: "#ffffff",
                    }}
                  >
                    <option value="">Select manager</option>
                    {managers
                      .filter((manager) => manager.id !== employee.id)
                      .map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.full_name} - {manager.verifinity_email}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#374151",
                      marginBottom: 7,
                    }}
                  >
                    Date of Joining
                  </label>
                  <input
                    type="date"
                    value={editForm.dateOfJoining}
                    onChange={(event) =>
                      updateEditField("dateOfJoining", event.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      fontSize: 14,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#374151",
                      marginBottom: 7,
                    }}
                  >
                    Employment Status
                  </label>
                  <select
                    value={editForm.employmentStatus}
                    onChange={(event) =>
                      updateEditField("employmentStatus", event.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      fontSize: 14,
                      background: "#ffffff",
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="probation">Probation</option>
                    <option value="notice_period">Notice Period</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#374151",
                      marginBottom: 7,
                    }}
                  >
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(event) =>
                      updateEditField("role", event.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      fontSize: 14,
                      background: "#ffffff",
                    }}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="payroll">Payroll</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#374151",
                      marginBottom: 7,
                    }}
                  >
                    Account Status
                  </label>
                  <select
                    value={editForm.isActive ? "active" : "inactive"}
                    onChange={(event) =>
                      updateEditField(
                        "isActive",
                        event.target.value === "active",
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      fontSize: 14,
                      background: "#ffffff",
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 18,
                }}
              >
                <button
                  type="submit"
                  disabled={savingEmployment}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: 0,
                    background: "#2563eb",
                    color: "#ffffff",
                    borderRadius: 10,
                    padding: "10px 14px",
                    cursor: savingEmployment ? "not-allowed" : "pointer",
                    fontWeight: 800,
                    opacity: savingEmployment ? 0.7 : 1,
                  }}
                >
                  <Save size={16} />
                  {savingEmployment ? "Saving..." : "Save Employment Info"}
                </button>
              </div>
            </form>
          </DetailCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 18,
            }}
          >
            <DetailCard title="Basic Information">
              <InfoRow
                label="Full Name"
                value={employee.full_name}
                icon={UserRound}
              />
              <InfoRow
                label="Email"
                value={employee.verifinity_email}
                icon={Mail}
              />
              <InfoRow label="Phone" value={employee.phone} icon={Phone} />
              <InfoRow label="Role" value={employee.role} icon={Briefcase} />
            </DetailCard>

            <DetailCard title="Work Information">
              <InfoRow
                label="Department"
                value={employee.departments?.name}
                icon={Briefcase}
              />
              <InfoRow
                label="Designation"
                value={employee.designation}
                icon={Briefcase}
              />
              <InfoRow
                label="Date of Joining"
                value={employee.date_of_joining}
                icon={CalendarDays}
              />
              <InfoRow
                label="Reporting Manager"
                value={employee.manager?.full_name}
                icon={UserRound}
              />
            </DetailCard>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <DetailCard title={`Employee Documents (${documents.length})`}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 18,
              padding: 14,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Current Onboarding Status
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#111827",
                  textTransform: "capitalize",
                }}
              >
                {employee.onboarding_status || "pending"}
              </div>
            </div>

            {employee.onboarding_status !== "approved" &&
              employee.onboarding_status !== "rejected" && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={statusUpdating}
                    onClick={handleApproveOnboarding}
                    style={{
                      border: 0,
                      background: "#16a34a",
                      color: "#ffffff",
                      borderRadius: 10,
                      padding: "10px 14px",
                      cursor: statusUpdating ? "not-allowed" : "pointer",
                      fontWeight: 800,
                    }}
                  >
                    Approve Onboarding
                  </button>

                  <button
                    type="button"
                    disabled={statusUpdating}
                    onClick={handleRejectOnboarding}
                    style={{
                      border: 0,
                      background: "#dc2626",
                      color: "#ffffff",
                      borderRadius: 10,
                      padding: "10px 14px",
                      cursor: statusUpdating ? "not-allowed" : "pointer",
                      fontWeight: 800,
                    }}
                  >
                    Reject Onboarding
                  </button>
                </div>
              )}
          </div>
          {documentsLoading ? (
            <div style={{ color: "#64748b" }}>Loading documents...</div>
          ) : documents.length === 0 ? (
            <div
              style={{
                color: "#64748b",
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: 12,
                padding: 18,
              }}
            >
              No documents uploaded.
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {documents.map((document) => (
                <div
                  key={document.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    gap: 16,
                    padding: 14,
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: "#111827" }}>
                      {getDocumentLabel(document.document_type)}
                    </div>
                    <div style={{ color: "#64748b", marginTop: 4 }}>
                      {document.file_name}
                    </div>
                    <div
                      style={{ color: "#94a3b8", marginTop: 4, fontSize: 12 }}
                    >
                      Uploaded:{" "}
                      {new Date(document.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Secure signed URL view action */}
                  <button
                    type="button"
                    onClick={() => handleViewDocument(document.file_path)}
                    style={{
                      border: 0,
                      background: "#2563eb",
                      color: "#ffffff",
                      borderRadius: 10,
                      padding: "10px 16px",
                      cursor: "pointer",
                      fontWeight: 800,
                      minWidth: 90,
                      textAlign: "center",
                      boxShadow: "0 6px 14px rgba(37, 99, 235, 0.2)",
                    }}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </DetailCard>
      )}

      {activeTab === "assets" && (
        <PlaceholderPanel
          title="Assets"
          description="Asset tracking will be added in Phase 2. This tab will show returnable assets issued to this employee."
        />
      )}

      {activeTab === "timesheets" && (
        <PlaceholderPanel
          title="Timesheets"
          description="Timesheet management will be added in Phase 3. This tab will show login/logout records and missing timesheet status."
        />
      )}

      {activeTab === "leave" && (
        <PlaceholderPanel
          title="Leave"
          description="Leave management will be added in Phase 4. This tab will show paid leave balance, requests, approvals, and leave history."
        />
      )}
    </div>
  );
}
