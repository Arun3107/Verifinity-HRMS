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
  Save,
  WalletCards,
} from "lucide-react";
import {
  approveEmployeeOnboarding,
  createEmployeeDocumentSignedUrl,
  getDepartments,
  getEmployeeById,
  getEmployeeDocuments,
  hasRequiredEmployeeDocuments,
  getManagerOptions,
  getEmployeeOnboardingHistory,
  requestEmployeeOnboardingChanges,
  updateEmployeeEmploymentInfo,
} from "../../services/employeeService";
import {
  getEmployeeLeaveBalance,
  getEmployeeLeaveRequests,
} from "../../services/leaveService";
import {
  EmptyTableRow,
  LeaveTable,
} from "../../components/leave/LeaveManagementUI";
import { tableCellStyle } from "../../components/leave/leaveStyles";
import {
  formatLeaveDate,
  formatLeaveDays,
  formatLeaveYear,
  getCurrentLeaveYear,
} from "../../utils/leaveUtils";

function DetailCard({ title, children }) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e6eaf0",
        borderRadius: 22,
        padding: 22,
        boxShadow: "0 18px 45px rgba(15, 23, 42, 0.055)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          color: "#0f172a",
          fontWeight: 850,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h2>
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
        alignItems: "center",
        padding: 13,
        border: "1px solid #eef2f7",
        borderRadius: 14,
        background: "#f8fafc",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
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
        <div style={{ marginTop: 3, color: "#111827", fontWeight: 700 }}>
          {value || "-"}
        </div>
      </div>
    </div>
  );
}

// Helper functions for onboarding status label and badge style
function getOnboardingLabel(status) {
  if (status === "submitted") return "Submitted for Review";
  if (status === "approved") return "Approved";
  if (status === "changes_requested") return "Changes Requested";
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

  if (status === "changes_requested") {
    return { ...base, background: "#ffedd5", color: "#9a3412" };
  }

  if (status === "rejected") {
    return { ...base, background: "#fee2e2", color: "#991b1b" };
  }

  return { ...base, background: "#fef3c7", color: "#92400e" };
}

function maskSensitiveValue(value, visibleCharacters = 4) {
  if (!value) return "-";
  if (value.length <= visibleCharacters) return "••••";
  return `${"•".repeat(Math.min(value.length - visibleCharacters, 12))}${value.slice(
    -visibleCharacters,
  )}`;
}

function getLeaveStatusStyle(status) {
  const base = {
    display: "inline-flex",
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  };

  if (status === "approved") {
    return { ...base, background: "#ecfdf5", color: "#166534" };
  }

  if (["pending_manager", "pending_hr"].includes(status)) {
    return { ...base, background: "#fffbeb", color: "#92400e" };
  }

  if (["rejected", "cancelled"].includes(status)) {
    return { ...base, background: "#fef2f2", color: "#991b1b" };
  }

  return { ...base, background: "#f1f5f9", color: "#475569" };
}

function getLeaveStatusLabel(status) {
  return (status || "-")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const [reviewComments, setReviewComments] = useState("");
  const [reviewHistory, setReviewHistory] = useState([]);
  const [showSensitiveDetails, setShowSensitiveDetails] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [savingEmployment, setSavingEmployment] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [leaveYear, setLeaveYear] = useState(getCurrentLeaveYear());
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
  }, [id]);

  useEffect(() => {
    if (activeTab !== "leave" || !id) return undefined;

    let isMounted = true;

    async function loadLeaveDetails() {
      setLeaveLoading(true);
      setLeaveError("");

      try {
        const [balanceData, requestData] = await Promise.all([
          getEmployeeLeaveBalance(id, leaveYear),
          getEmployeeLeaveRequests(id, leaveYear),
        ]);

        if (!isMounted) return;
        setLeaveBalances(balanceData);
        setLeaveRequests(requestData);
      } catch (error) {
        if (isMounted) {
          setLeaveError(error.message || "Unable to load employee leave details.");
        }
      } finally {
        if (isMounted) setLeaveLoading(false);
      }
    }

    loadLeaveDetails();

    return () => {
      isMounted = false;
    };
  }, [activeTab, id, leaveYear]);

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
        const [data, history] = await Promise.all([
          getEmployeeById(id),
          getEmployeeOnboardingHistory(id),
        ]);
        setEmployee(data);
        setReviewHistory(history);
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

  if (errorText && !employee) {
    return <div style={{ color: "red" }}>{errorText}</div>;
  }

  if (!employee) {
    return <div>Employee not found.</div>;
  }

  const tabs = [
    { id: "profile", label: "Employee Profile", icon: UserRound },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "leave", label: "Leave Details", icon: CalendarDays },
  ];

  const requiredDocumentStatus = hasRequiredEmployeeDocuments(documents);

  const requiredDocumentLabels = {
    pan_card: "PAN Card",
    aadhaar_card: "Aadhaar Card",
    cancelled_cheque: "Cancelled Cheque",
  };

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

  async function refreshReviewHistory() {
    try {
      setReviewHistory(await getEmployeeOnboardingHistory(employee.id));
    } catch (error) {
      console.error("Unable to refresh onboarding review history:", error);
    }
  }

  async function handleApproveOnboarding() {
    if (!requiredDocumentStatus.complete) {
      alert(
        `Cannot approve onboarding. Missing: ${requiredDocumentStatus.missing
          .map((type) => requiredDocumentLabels[type])
          .join(", ")}`,
      );
      return;
    }
    try {
      setStatusUpdating(true);
      setErrorText("");

      await approveEmployeeOnboarding(employee.id, reviewComments);

      setEmployee((current) => ({
        ...current,
        onboarding_status: "approved",
        onboarding_review_comments: reviewComments || null,
      }));
      await refreshReviewHistory();
      setReviewComments("");
      setSuccessText("Employee onboarding approved successfully.");
    } catch (error) {
      console.error(error);
      setErrorText(error.message || "Unable to approve onboarding.");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleRequestChanges() {
    if (!reviewComments.trim()) {
      setErrorText("Enter the changes required before sending it back.");
      return;
    }

    try {
      setStatusUpdating(true);
      setErrorText("");

      await requestEmployeeOnboardingChanges(
        employee.id,
        reviewComments.trim(),
      );

      setEmployee((current) => ({
        ...current,
        onboarding_status: "changes_requested",
        onboarding_review_comments: reviewComments.trim(),
      }));
      await refreshReviewHistory();
      setReviewComments("");
      setSuccessText("Changes requested from the employee.");
    } catch (error) {
      console.error(error);
      setErrorText(error.message || "Unable to request changes.");
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
    <div
      style={{
        width: "100%",
        maxWidth: 1320,
        minWidth: 0,
        paddingBottom: 32,
        boxSizing: "border-box",
      }}
    >
      <button
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
          padding: "9px 13px",
        }}
      >
        <ArrowLeft size={16} />
        Back to Employees
      </button>

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 28,
          padding: 28,
          marginBottom: 20,
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
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 22,
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
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                fontSize: 24,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.24)",
                flexShrink: 0,
              }}
            >
              {(employee.full_name || "Employee")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part.charAt(0).toUpperCase())
                .join("")}
            </div>

            <div>
              <h1
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: 32,
                  lineHeight: 1.08,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                }}
              >
                {employee.full_name}
              </h1>
              <p style={{ color: "#cbd5e1", margin: "10px 0 0", fontSize: 15 }}>
                {employee.designation || "No designation"} ·{" "}
                {employee.departments?.name || "No department"}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 8,
                  color: "#93c5fd",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <span>
                  {employee.employee_code || "Employee ID not assigned"}
                </span>
                <span>{employee.verifinity_email}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(145px, 1fr))",
              gap: 10,
              width: "min(100%, 350px)",
            }}
          >
            <div
              style={{
                padding: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 16,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ color: "#93c5fd", fontSize: 11, fontWeight: 850 }}>
                ACCOUNT STATUS
              </div>
              <div
                style={{
                  marginTop: 5,
                  color: employee.is_active ? "#86efac" : "#fca5a5",
                  fontWeight: 850,
                }}
              >
                {employee.is_active ? "Active" : "Inactive"}
              </div>
            </div>

            <div
              style={{
                padding: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 16,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ color: "#93c5fd", fontSize: 11, fontWeight: 850 }}>
                ONBOARDING
              </div>
              <div style={{ marginTop: 5, fontWeight: 850 }}>
                {getOnboardingLabel(employee.onboarding_status)}
              </div>
            </div>
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
          border: "1px solid #e6eaf0",
          borderRadius: 18,
          padding: 7,
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
          position: "sticky",
          top: 0,
          zIndex: 5,
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
                borderRadius: 12,
                padding: "10px 14px",
                background: isActive
                  ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                  : "transparent",
                color: isActive ? "#ffffff" : "#475569",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: isActive
                  ? "0 8px 18px rgba(37, 99, 235, 0.22)"
                  : "none",
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

      {errorText && (
        <div
          style={{
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: 12,
            marginBottom: 18,
            fontWeight: 700,
          }}
        >
          {errorText}
        </div>
      )}

      {activeTab === "profile" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 16,
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

              {employee.onboarding_status === "submitted" && (
                <div style={{ width: "min(100%, 520px)" }}>
                  <textarea
                    value={reviewComments}
                    onChange={(event) => setReviewComments(event.target.value)}
                    placeholder="Review comments (required when requesting changes)"
                    style={{
                      width: "100%",
                      minHeight: 76,
                      resize: "vertical",
                      border: "1px solid #cbd5e1",
                      borderRadius: 10,
                      padding: 11,
                      boxSizing: "border-box",
                      font: "inherit",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 10,
                    }}
                  >
                    <button
                      type="button"
                      disabled={
                        statusUpdating || !requiredDocumentStatus.complete
                      }
                      onClick={handleApproveOnboarding}
                      style={{
                        border: 0,
                        background: "#16a34a",
                        color: "#ffffff",
                        borderRadius: 10,
                        padding: "10px 14px",
                        cursor:
                          statusUpdating || !requiredDocumentStatus.complete
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          statusUpdating || !requiredDocumentStatus.complete
                            ? 0.6
                            : 1,
                        fontWeight: 800,
                      }}
                    >
                      Approve Onboarding
                    </button>

                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={handleRequestChanges}
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
                      Request Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                marginTop: 18,
                paddingTop: 18,
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Required Documents
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                {Object.entries(requiredDocumentLabels).map(([type, label]) => {
                  const isUploaded =
                    !requiredDocumentStatus.missing.includes(type);

                  return (
                    <div
                      key={type}
                      style={{
                        border: `1px solid ${isUploaded ? "#bbf7d0" : "#fecaca"}`,
                        background: isUploaded ? "#f0fdf4" : "#fef2f2",
                        color: isUploaded ? "#166534" : "#991b1b",
                        borderRadius: 10,
                        padding: "10px 12px",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {isUploaded ? "✓" : "Missing:"} {label}
                    </div>
                  );
                })}
              </div>

              {!requiredDocumentStatus.complete && (
                <div
                  style={{
                    marginTop: 10,
                    color: "#b45309",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Onboarding cannot be approved until all required documents are
                  uploaded.
                </div>
              )}
            </div>

            {employee.onboarding_review_comments && (
              <div
                style={{
                  marginTop: 16,
                  padding: 13,
                  borderRadius: 12,
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  color: "#9a3412",
                }}
              >
                <strong>Latest review comments:</strong>{" "}
                {employee.onboarding_review_comments}
              </div>
            )}

            {reviewHistory.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Review History
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {reviewHistory.map((historyItem) => (
                    <div
                      key={historyItem.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 14,
                        padding: 12,
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        background: "#f8fafc",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#0f172a",
                            fontWeight: 800,
                            textTransform: "capitalize",
                          }}
                        >
                          {historyItem.action.replaceAll("_", " ")}
                        </div>
                        {historyItem.comments && (
                          <div
                            style={{
                              marginTop: 4,
                              color: "#475569",
                              fontSize: 13,
                            }}
                          >
                            {historyItem.comments}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 12,
                          textAlign: "right",
                          flexShrink: 0,
                        }}
                      >
                        <div>{historyItem.actor?.full_name || "Employee"}</div>
                        <div style={{ marginTop: 3 }}>
                          {new Date(historyItem.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DetailCard>

          <DetailCard title="Submitted Personal & Payroll Details">
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 12,
              }}
            >
              <button
                type="button"
                onClick={() => setShowSensitiveDetails((current) => !current)}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  borderRadius: 9,
                  padding: "8px 11px",
                  cursor: "pointer",
                  fontWeight: 750,
                }}
              >
                {showSensitiveDetails ? "Hide sensitive data" : "Reveal data"}
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
                gap: 10,
              }}
            >
              <InfoRow
                label="Personal Email"
                value={employee.payroll_details?.personal_email}
                icon={Mail}
              />
              <InfoRow
                label="Date of Birth"
                value={employee.payroll_details?.date_of_birth}
                icon={CalendarDays}
              />
              <InfoRow
                label="PAN Number"
                value={
                  showSensitiveDetails
                    ? employee.payroll_details?.pan_number
                    : maskSensitiveValue(employee.payroll_details?.pan_number)
                }
                icon={WalletCards}
              />
              <InfoRow
                label="Aadhaar Number"
                value={
                  showSensitiveDetails
                    ? employee.payroll_details?.aadhaar_number
                    : maskSensitiveValue(
                        employee.payroll_details?.aadhaar_number,
                      )
                }
                icon={WalletCards}
              />
              <InfoRow
                label="Bank Account"
                value={
                  showSensitiveDetails
                    ? employee.payroll_details?.bank_account_number
                    : maskSensitiveValue(
                        employee.payroll_details?.bank_account_number,
                      )
                }
                icon={WalletCards}
              />
              <InfoRow
                label="Bank / IFSC"
                value={[
                  employee.payroll_details?.bank_name,
                  employee.payroll_details?.bank_ifsc,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                icon={WalletCards}
              />
              <InfoRow
                label="Emergency Contact"
                value={[
                  employee.payroll_details?.emergency_contact_name,
                  employee.payroll_details?.emergency_contact_phone,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                icon={Phone}
              />
              <InfoRow
                label="Address"
                value={employee.payroll_details?.address}
                icon={UserRound}
              />
            </div>
          </DetailCard>

          <DetailCard title="Employment Information">
            <form onSubmit={handleSaveEmploymentInfo}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
                  gap: "18px 20px",
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
                      border: "1px solid #cbd5e1",
                      borderRadius: 9,
                      fontSize: 14,
                      background: "#ffffff",
                      color: "#111827",
                      boxSizing: "border-box",
                      outline: "none",
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
                      border: "1px solid #cbd5e1",
                      borderRadius: 9,
                      fontSize: 14,
                      background: "#ffffff",
                      color: "#111827",
                      boxSizing: "border-box",
                      outline: "none",
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
                      border: "1px solid #cbd5e1",
                      borderRadius: 9,
                      fontSize: 14,
                      background: "#ffffff",
                      color: "#111827",
                      boxSizing: "border-box",
                      outline: "none",
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
                      border: "1px solid #cbd5e1",
                      borderRadius: 9,
                      fontSize: 14,
                      background: "#ffffff",
                      color: "#111827",
                      boxSizing: "border-box",
                      outline: "none",
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
                      border: "1px solid #cbd5e1",
                      borderRadius: 9,
                      fontSize: 14,
                      background: "#ffffff",
                      color: "#111827",
                      colorScheme: "light",
                      boxSizing: "border-box",
                      outline: "none",
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
                      border: "1px solid #cbd5e1",
                      borderRadius: 9,
                      fontSize: 14,
                      background: "#ffffff",
                      color: "#111827",
                      boxSizing: "border-box",
                      outline: "none",
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
                      border: "1px solid #cbd5e1",
                      borderRadius: 9,
                      fontSize: 14,
                      background: "#ffffff",
                      color: "#111827",
                      boxSizing: "border-box",
                      outline: "none",
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
                      border: "1px solid #cbd5e1",
                      borderRadius: 9,
                      fontSize: 14,
                      background: "#ffffff",
                      color: "#111827",
                      boxSizing: "border-box",
                      outline: "none",
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
                    borderRadius: 9,
                    padding: "11px 16px",
                    cursor: savingEmployment ? "not-allowed" : "pointer",
                    fontWeight: 800,
                    opacity: savingEmployment ? 0.7 : 1,
                    boxShadow: "0 4px 10px rgba(37, 99, 235, 0.18)",
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
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
              gap: 16,
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

      {activeTab === "leave" && (
        <div style={{ display: "grid", gap: 16 }}>
          {leaveError && (
            <div
              style={{
                padding: 13,
                border: "1px solid #fecaca",
                borderRadius: 12,
                background: "#fef2f2",
                color: "#991b1b",
                fontWeight: 700,
              }}
            >
              {leaveError}
            </div>
          )}

          <DetailCard title="Leave Balance">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ color: "#64748b", fontSize: 13 }}>
                Entitlement is calculated from leave policy and joining date.
              </div>
              <select
                value={leaveYear}
                onChange={(event) => setLeaveYear(Number(event.target.value))}
                style={{
                  padding: "9px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 750,
                }}
              >
                {Array.from(
                  { length: 6 },
                  (_, index) => getCurrentLeaveYear() - index,
                ).map((year) => (
                  <option key={year} value={year}>
                    FY {formatLeaveYear(year)}
                  </option>
                ))}
              </select>
            </div>

            {leaveLoading ? (
              <div style={{ color: "#64748b" }}>Loading leave balances...</div>
            ) : leaveBalances.length === 0 ? (
              <div
                style={{
                  padding: 18,
                  border: "1px dashed #cbd5e1",
                  borderRadius: 12,
                  color: "#64748b",
                  background: "#f8fafc",
                }}
              >
                No leave balance available for FY {formatLeaveYear(leaveYear)}.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 12,
                }}
              >
                {leaveBalances.map((balance) => (
                  <div
                    key={balance.id}
                    style={{
                      padding: 16,
                      border: "1px solid #e2e8f0",
                      borderRadius: 16,
                      background: "linear-gradient(135deg, #ffffff, #f8fafc)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          display: "grid",
                          placeItems: "center",
                          background: "#eff6ff",
                          color: "#2563eb",
                        }}
                      >
                        <WalletCards size={18} />
                      </div>
                      <div>
                        <div style={{ color: "#0f172a", fontWeight: 800 }}>
                          {balance.leave_type?.name || "Leave"}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          Available balance
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: 14,
                        color: "#166534",
                        fontSize: 25,
                        fontWeight: 900,
                      }}
                    >
                      {formatLeaveDays(balance.available_balance)}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 8,
                        marginTop: 14,
                      }}
                    >
                      {[
                        ["Opening", balance.opening_balance],
                        ["Credited", balance.credited],
                        ["Used", balance.used],
                        ["Adjusted", balance.adjusted],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div style={{ color: "#94a3b8", fontSize: 10 }}>{label}</div>
                          <div
                            style={{
                              marginTop: 2,
                              color: "#334155",
                              fontSize: 13,
                              fontWeight: 800,
                            }}
                          >
                            {Number(value || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>

          <DetailCard title={`Leave History (${leaveRequests.length})`}>
            {leaveLoading ? (
              <div style={{ color: "#64748b" }}>Loading leave history...</div>
            ) : (
              <LeaveTable
                headers={[
                  "Leave Type",
                  "Dates / Days",
                  "Status",
                  "Reason",
                  "Manager Comments",
                ]}
                columnWidths={["17%", "20%", "15%", "24%", "24%"]}
              >
                {leaveRequests.length === 0 ? (
                  <EmptyTableRow colSpan={5}>
                    No leave requests found for FY {formatLeaveYear(leaveYear)}.
                  </EmptyTableRow>
                ) : (
                  leaveRequests.map((request) => (
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
                        {formatLeaveDate(request.start_date)} to{" "}
                        {formatLeaveDate(request.end_date)}
                        <div
                          style={{ marginTop: 5, color: "#64748b", fontSize: 12 }}
                        >
                          {formatLeaveDays(request.calculated_days)}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={getLeaveStatusStyle(request.status)}>
                          {getLeaveStatusLabel(request.status)}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        {request.reason || "-"}
                      </td>
                      <td style={tableCellStyle}>
                        {request.manager_comments || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </LeaveTable>
            )}
          </DetailCard>
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
                {getOnboardingLabel(employee.onboarding_status)}
              </div>
            </div>
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
    </div>
  );
}
