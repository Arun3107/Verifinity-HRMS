import { useEffect, useState } from "react";
import {
  AlertCircle,
  BadgeIndianRupee,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  HeartPulse,
  Landmark,
  Mail,
  Save,
  UserRound,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  getMyProfileBundle,
  submitMyProfile,
  getMyDocuments,
  uploadMyDocument,
  createEmployeeDocumentSignedUrl,
  EMPLOYEE_DOCUMENT_TYPES,
  hasRequiredEmployeeDocuments,
} from "../services/employeeService";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d9e0ea",
  borderRadius: 12,
  fontSize: 14,
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: "#475569",
  marginBottom: 7,
  letterSpacing: "0.02em",
};

function SectionCard({ icon: Icon, title, description, children }) {
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
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: "linear-gradient(135deg, #eff6ff, #ecfeff)",
            color: "#2563eb",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>

        <div>
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 18,
              fontWeight: 850,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h2>
          {description && (
            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

function ReadOnlyField({ label, value, icon: Icon }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div
        style={{
          width: "100%",
          height: 46,
          padding: "12px 14px",
          border: "1px solid #d9e0ea",
          borderRadius: 12,
          background: "#ffffff",
          color: "#0f172a",
          display: "flex",
          alignItems: "center",
          gap: 9,
          boxSizing: "border-box",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
          fontSize: 14,
          fontWeight: 400,
          lineHeight: 1.2,
          minWidth: 0,
        }}
      >
        {Icon && <Icon size={16} color="#64748b" style={{ flexShrink: 0 }} />}
        <span
          title={value || "-"}
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.2,
            display: "block",
            flex: 1,
          }}
        >
          {value || "-"}
        </span>
      </div>
    </div>
  );
}

function FormGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 18,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}

export default function MyProfilePage() {
  const { profile: authProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [documents, setDocuments] = useState([]);
  const [uploadingType, setUploadingType] = useState("");

  const [form, setForm] = useState({
    phone: "",
    personalEmail: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",
    panNumber: "",
    aadhaarNumber: "",
    uanNumber: "",
    pfNumber: "",
    dateOfBirth: "",
    gender: "",
    fatherSpouseName: "",
    maritalStatus: "",
    earlierEpfMember: "",
    earlierEpsMember: "",
    previousEpfAccountNumber: "",
    pfDeclarationAgreed: false,
    emergencyContactName: "",
    emergencyContactPhone: "",
    address: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!authProfile?.id) return;

      try {
        const [data, documentData] = await Promise.all([
          getMyProfileBundle(authProfile.id),
          getMyDocuments(authProfile.id),
        ]);

        if (!isMounted) return;

        setProfile(data.profile);
        setDocuments(documentData);
        setForm({
          phone: data.profile?.phone || "",
          personalEmail: data.payroll?.personal_email || "",
          bankAccountNumber: data.payroll?.bank_account_number || "",
          bankIfsc: data.payroll?.bank_ifsc || "",
          bankName: data.payroll?.bank_name || "",
          panNumber: data.payroll?.pan_number || "",
          aadhaarNumber: data.payroll?.aadhaar_number || "",
          uanNumber: data.payroll?.uan_number || "",
          pfNumber: data.payroll?.pf_number || "",
          dateOfBirth: data.payroll?.date_of_birth || "",
          gender: data.payroll?.gender || "",
          fatherSpouseName: data.payroll?.father_spouse_name || "",
          maritalStatus: data.payroll?.marital_status || "",
          earlierEpfMember: data.payroll?.earlier_epf_member || "",
          earlierEpsMember: data.payroll?.earlier_eps_member || "",
          previousEpfAccountNumber:
            data.payroll?.previous_epf_account_number || "",
          pfDeclarationAgreed: data.payroll?.pf_declaration_agreed || false,
          emergencyContactName: data.payroll?.emergency_contact_name || "",
          emergencyContactPhone: data.payroll?.emergency_contact_phone || "",
          address: data.payroll?.address || "",
        });
      } catch (error) {
        console.error(error);

        if (!isMounted) return;

        setErrorText(error.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [authProfile?.id]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function getDocument(documentType) {
    return documents.find((doc) => doc.document_type === documentType) || null;
  }

  async function handleDocumentUpload(documentType, file) {
    if (!file || !authProfile?.id) return;

    setErrorText("");
    setSuccessText("");
    setUploadingType(documentType);

    try {
      const uploaded = await uploadMyDocument(
        authProfile.id,
        documentType,
        file,
      );

      setDocuments((current) => [
        uploaded,
        ...current.filter((doc) => doc.document_type !== documentType),
      ]);
      setSuccessText("Document uploaded successfully.");
    } catch (error) {
      console.error(error);
      setErrorText(error.message);
    } finally {
      setUploadingType("");
    }
  }

  async function handleViewDocument(document) {
    if (!document) return;

    const url = await createEmployeeDocumentSignedUrl(document.file_path);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorText("");
    setSuccessText("");
    setSaving(true);

    try {
      const requiredDocumentStatus = hasRequiredEmployeeDocuments(documents);

      if (!requiredDocumentStatus.complete) {
        throw new Error("Upload PAN, Aadhaar, and cancelled cheque first.");
      }

      await submitMyProfile(authProfile.id, form);
      setSuccessText("Profile submitted successfully for HR review.");
      setProfile((current) => ({
        ...current,
        phone: form.phone,
        onboarding_status: "submitted",
      }));
    } catch (error) {
      console.error(error);
      setErrorText(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ color: "#64748b" }}>Loading profile...</div>;
  }

  const initials = (profile?.full_name || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const onboardingStatus = profile?.onboarding_status || "invited";
  const onboardingStatusLabel =
    onboardingStatus === "submitted"
      ? "Pending HR review"
      : onboardingStatus === "changes_requested"
        ? "Changes requested"
        : onboardingStatus === "approved"
          ? "Approved"
          : "Profile setup pending";
  const requiredDocumentStatus = hasRequiredEmployeeDocuments(documents);

  return (
    <div style={{ maxWidth: 1320 }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 28,
          padding: 28,
          marginBottom: 22,
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
            filter: "blur(2px)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            gap: 22,
            alignItems: "center",
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
                display: "grid",
                placeItems: "center",
                fontSize: 24,
                fontWeight: 900,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.24)",
              }}
            >
              {initials || <UserRound size={28} />}
            </div>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 32,
                  lineHeight: 1.08,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                }}
              >
                {profile?.full_name || "My Profile"}
              </h1>
              <p
                style={{
                  margin: "10px 0 0",
                  color: "#cbd5e1",
                  fontSize: 15,
                }}
              >
                {profile?.designation || "No designation"} ·{" "}
                {profile?.departments?.name || "No department"}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(150px, 1fr))",
              gap: 10,
              minWidth: 320,
            }}
          >
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div style={{ color: "#93c5fd", fontSize: 12, fontWeight: 800 }}>
                EMAIL
              </div>
              <div
                style={{
                  marginTop: 5,
                  fontWeight: 800,
                  overflowWrap: "anywhere",
                }}
              >
                {profile?.verifinity_email || "-"}
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div style={{ color: "#93c5fd", fontSize: 12, fontWeight: 800 }}>
                MANAGER
              </div>
              <div style={{ marginTop: 5, fontWeight: 800 }}>
                {profile?.manager?.full_name || "Not assigned"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          background:
            onboardingStatus === "changes_requested" ? "#fff7ed" : "#eff6ff",
          color:
            onboardingStatus === "changes_requested" ? "#9a3412" : "#1e40af",
          border: `1px solid ${
            onboardingStatus === "changes_requested" ? "#fed7aa" : "#bfdbfe"
          }`,
          borderRadius: 14,
          padding: 14,
          marginBottom: 18,
          fontWeight: 700,
        }}
      >
        <div>{onboardingStatusLabel}</div>
        {onboardingStatus === "submitted" && (
          <div style={{ marginTop: 5, fontSize: 13, fontWeight: 500 }}>
            Your account remains active while admin reviews your information.
          </div>
        )}
        {onboardingStatus === "changes_requested" && (
          <div style={{ marginTop: 5, fontSize: 13, fontWeight: 500 }}>
            {profile?.onboarding_review_comments ||
              "Please update the requested details and resubmit."}
          </div>
        )}
      </div>

      {errorText && (
        <div
          style={{
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            borderRadius: 14,
            padding: 14,
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 700,
          }}
        >
          <AlertCircle size={18} />
          {errorText}
        </div>
      )}

      {successText && (
        <div
          style={{
            background: "#ecfdf5",
            color: "#166534",
            border: "1px solid #bbf7d0",
            borderRadius: 14,
            padding: 14,
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={18} />
          {successText}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 18,
          }}
        >
          <SectionCard
            icon={UserRound}
            title="Basic Details"
            description="Core employee details are controlled by HR. You can update your phone number here."
          >
            <FormGrid>
              <ReadOnlyField
                label="Full Name"
                value={profile?.full_name}
                icon={UserRound}
              />
              <ReadOnlyField
                label="Verifinity Email"
                value={profile?.verifinity_email}
                icon={Mail}
              />
              <ReadOnlyField
                label="Department"
                value={profile?.departments?.name}
                icon={Building2}
              />
              <ReadOnlyField
                label="Employee ID"
                value={profile?.employee_code}
                icon={UserRound}
              />
              <ReadOnlyField
                label="Reporting Manager"
                value={profile?.manager?.full_name}
                icon={UserRound}
              />

              <Field label="Phone Number" required>
                <input
                  style={inputStyle}
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  required
                />
              </Field>

              <Field label="Personal Email ID" required>
                <input
                  type="email"
                  style={inputStyle}
                  value={form.personalEmail}
                  onChange={(event) =>
                    updateField("personalEmail", event.target.value)
                  }
                  placeholder="Personal email address"
                  required
                />
              </Field>

              <Field label="Date of Birth">
                <input
                  type="date"
                  style={{
                    ...inputStyle,
                    cursor: "pointer",
                    colorScheme: "light",
                  }}
                  value={form.dateOfBirth}
                  onChange={(event) =>
                    updateField("dateOfBirth", event.target.value)
                  }
                  onClick={(event) => event.currentTarget.showPicker?.()}
                />
              </Field>

              <Field label="Gender">
                <select
                  style={inputStyle}
                  value={form.gender}
                  onChange={(event) =>
                    updateField("gender", event.target.value)
                  }
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>

              <Field label="Father / Spouse Name">
                <input
                  style={inputStyle}
                  value={form.fatherSpouseName}
                  onChange={(event) =>
                    updateField("fatherSpouseName", event.target.value)
                  }
                />
              </Field>

              <Field label="Marital Status">
                <select
                  style={inputStyle}
                  value={form.maritalStatus}
                  onChange={(event) =>
                    updateField("maritalStatus", event.target.value)
                  }
                >
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </Field>
            </FormGrid>
          </SectionCard>

          <SectionCard
            icon={Landmark}
            title="Payroll Details"
            description="These details help HR and payroll set up your salary account correctly."
          >
            <FormGrid>
              <Field label="Bank Account Number" required>
                <input
                  style={inputStyle}
                  value={form.bankAccountNumber}
                  onChange={(event) =>
                    updateField("bankAccountNumber", event.target.value)
                  }
                  required
                />
              </Field>

              <Field label="Bank IFSC" required>
                <input
                  style={inputStyle}
                  value={form.bankIfsc}
                  onChange={(event) =>
                    updateField("bankIfsc", event.target.value.toUpperCase())
                  }
                  required
                />
              </Field>

              <Field label="Bank Name" required>
                <input
                  style={inputStyle}
                  value={form.bankName}
                  onChange={(event) =>
                    updateField("bankName", event.target.value)
                  }
                  required
                />
              </Field>

              <Field label="PAN Number" required>
                <input
                  style={inputStyle}
                  value={form.panNumber}
                  onChange={(event) =>
                    updateField("panNumber", event.target.value.toUpperCase())
                  }
                  required
                />
              </Field>

              <Field label="Aadhaar Number" required>
                <input
                  style={inputStyle}
                  value={form.aadhaarNumber}
                  onChange={(event) =>
                    updateField("aadhaarNumber", event.target.value)
                  }
                  required
                />
              </Field>
            </FormGrid>
          </SectionCard>

          <SectionCard
            icon={BadgeIndianRupee}
            title="PF Details"
            description="Provide PF and UAN details only if you already have an existing PF account. If not available, leave these fields blank."
          >
            <FormGrid>
              <Field label="UAN Number">
                <input
                  style={inputStyle}
                  value={form.uanNumber}
                  onChange={(event) =>
                    updateField("uanNumber", event.target.value)
                  }
                  placeholder="Universal Account Number, if available"
                />
              </Field>

              <Field label="Earlier EPF Member?">
                <select
                  style={inputStyle}
                  value={form.earlierEpfMember}
                  onChange={(event) =>
                    updateField("earlierEpfMember", event.target.value)
                  }
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </Field>

              <Field label="Earlier EPS Member?">
                <select
                  style={inputStyle}
                  value={form.earlierEpsMember}
                  onChange={(event) =>
                    updateField("earlierEpsMember", event.target.value)
                  }
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </Field>

              <Field label="PF / Previous EPF Account Number">
                <input
                  style={inputStyle}
                  value={form.previousEpfAccountNumber}
                  onChange={(event) =>
                    updateField("previousEpfAccountNumber", event.target.value)
                  }
                />
              </Field>
            </FormGrid>

            <div
              style={{
                marginTop: 18,
                background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                border: "1px solid #dbeafe",
                borderRadius: 16,
                padding: 14,
                color: "#475569",
                fontSize: 14,
                lineHeight: 1.55,
                display: "flex",
                gap: 10,
              }}
            >
              <CreditCard
                size={18}
                color="#2563eb"
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div>
                UAN and PF details are optional. If you already have an existing
                PF / EPF account number, enter it here and upload the required
                documents in the Documents section below.
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <label
                style={{
                  display: "grid",
                  gridTemplateColumns: "16px 1fr",
                  alignItems: "start",
                  columnGap: 10,
                  fontSize: 13,
                  color: "#475569",
                  lineHeight: 1.5,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.pfDeclarationAgreed}
                  onChange={(event) =>
                    updateField("pfDeclarationAgreed", event.target.checked)
                  }
                  style={{ display: "none" }}
                />
                <span
                  style={{
                    marginTop: 2,
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: form.pfDeclarationAgreed
                      ? "1px solid #2563eb"
                      : "1px solid #cbd5e1",
                    background: form.pfDeclarationAgreed
                      ? "#2563eb"
                      : "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  {form.pfDeclarationAgreed && (
                    <span
                      style={{
                        width: 7,
                        height: 3,
                        borderLeft: "2px solid #ffffff",
                        borderBottom: "2px solid #ffffff",
                        transform: "rotate(-45deg)",
                        marginTop: -1,
                      }}
                    />
                  )}
                </span>
                <span>
                  I confirm that the PF, UAN, Aadhaar, PAN and personal details
                  provided above are accurate and can be used for employment and
                  statutory registrations.
                </span>
              </label>
            </div>
          </SectionCard>

          <SectionCard
            icon={HeartPulse}
            title="Emergency Contact & Address"
            description="Keep this updated so HR can contact the right person in case of an emergency."
          >
            <FormGrid>
              <Field label="Emergency Contact Name" required>
                <input
                  style={inputStyle}
                  value={form.emergencyContactName}
                  onChange={(event) =>
                    updateField("emergencyContactName", event.target.value)
                  }
                  required
                />
              </Field>

              <Field label="Emergency Contact Phone" required>
                <input
                  style={inputStyle}
                  value={form.emergencyContactPhone}
                  onChange={(event) =>
                    updateField("emergencyContactPhone", event.target.value)
                  }
                  required
                />
              </Field>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Current Address" required>
                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: 96,
                      resize: "vertical",
                    }}
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    required
                  />
                </Field>
              </div>
            </FormGrid>
          </SectionCard>
          <SectionCard
            icon={CreditCard}
            title="Documents"
            description="Upload the mandatory documents required for payroll processing."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              {EMPLOYEE_DOCUMENT_TYPES.map((item) => {
                const doc = getDocument(item.type);
                const isUploading = uploadingType === item.type;

                return (
                  <div
                    key={item.type}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      padding: 14,
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      background: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        minWidth: 0,
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
                        <FileText size={16} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#0f172a",
                          }}
                        >
                          {item.label}
                          {item.required ? " *" : ""}
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            fontWeight: 700,
                            color: doc ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {doc ? "Uploaded" : "Not uploaded"}
                        </div>
                      </div>
                    </div>

                    {doc?.file_name && (
                      <div
                        title={doc.file_name}
                        style={{
                          fontSize: 11,
                          color: "#64748b",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.file_name}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: "auto",
                      }}
                    >
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 76,
                          padding: "7px 11px",
                          borderRadius: 9,
                          background: "#2563eb",
                          color: "#ffffff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: isUploading ? "not-allowed" : "pointer",
                          opacity: isUploading ? 0.7 : 1,
                        }}
                      >
                        {isUploading
                          ? "Uploading..."
                          : doc
                            ? "Replace"
                            : "Upload"}
                        <input
                          type="file"
                          hidden
                          disabled={isUploading}
                          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                          onChange={(event) => {
                            handleDocumentUpload(
                              item.type,
                              event.target.files?.[0],
                            );
                            event.target.value = "";
                          }}
                        />
                      </label>

                      {doc && (
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc)}
                          style={{
                            minWidth: 62,
                            padding: "7px 11px",
                            borderRadius: 9,
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#334155",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div
          style={{
            position: "sticky",
            bottom: 18,
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 22,
            pointerEvents: "none",
          }}
        >
          <button
            type="submit"
            disabled={saving || !requiredDocumentStatus.complete}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              border: "1px solid rgba(255,255,255,0.24)",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#ffffff",
              borderRadius: 999,
              padding: "13px 20px",
              cursor:
                saving || !requiredDocumentStatus.complete
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 850,
              minWidth: 190,
              opacity: saving || !requiredDocumentStatus.complete ? 0.65 : 1,
              boxShadow: "0 18px 38px rgba(37, 99, 235, 0.28)",
            }}
          >
            <Save size={17} />
            {saving
              ? "Submitting..."
              : onboardingStatus === "changes_requested"
                ? "Resubmit Profile"
                : "Submit Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
