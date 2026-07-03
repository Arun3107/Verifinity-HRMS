import { useEffect, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getMyDocuments, uploadMyDocument } from "../services/employeeService";

const documentItems = [
  { type: "pan_card", label: "PAN Card", required: true },
  { type: "aadhaar_card", label: "Aadhaar Card", required: true },
  { type: "cancelled_cheque", label: "Cancelled Cheque", required: true },
  { type: "uan_pf_document", label: "UAN / PF Document", required: false },
  { type: "other", label: "Other Document", required: false },
];

function getDocumentLabel(documentType) {
  if (documentType === "pan_card") return "PAN Card";
  if (documentType === "aadhaar_card") return "Aadhaar Card";
  if (documentType === "cancelled_cheque") return "Cancelled Cheque";
  if (documentType === "uan_pf_document") return "UAN / PF Document";
  return "Other Document";
}

export default function MyDocumentsPage() {
  const { user } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState("");
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  useEffect(() => {
    async function loadDocuments() {
      if (!user?.id) return;

      try {
        const data = await getMyDocuments(user.id);
        setDocuments(data);
      } catch (error) {
        console.error(error);
        setErrorText(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, [user?.id]);

  function hasDocument(documentType) {
    return documents.some(
      (document) => document.document_type === documentType,
    );
  }

  async function handleDocumentUpload(documentType, file) {
    if (!file || !user?.id) return;

    setErrorText("");
    setSuccessText("");
    setUploadingType(documentType);

    try {
      const uploadedDocument = await uploadMyDocument(
        user.id,
        documentType,
        file,
      );
      setDocuments((current) => [uploadedDocument, ...current]);
      setSuccessText("Document uploaded successfully.");
    } catch (error) {
      console.error(error);
      setErrorText(error.message);
    } finally {
      setUploadingType("");
    }
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 42,
            fontWeight: 800,
            color: "#111827",
          }}
        >
          My Documents
        </h1>

        <p
          style={{
            marginTop: 8,
            color: "#64748b",
            fontSize: 16,
          }}
        >
          Upload and manage your onboarding and payroll documents.
        </p>
      </div>

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

      {successText && (
        <div
          style={{
            background: "#ecfdf5",
            color: "#166534",
            border: "1px solid #bbf7d0",
            borderRadius: 10,
            padding: 12,
            marginBottom: 18,
          }}
        >
          {successText}
        </div>
      )}

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#111827" }}>Required Documents</h2>

        {loading ? (
          <div style={{ color: "#64748b" }}>Loading documents...</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
              marginTop: 20,
            }}
          >
            {documentItems.map((documentItem) => (
              <div
                key={documentItem.type}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 18,
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        color: "#111827",
                        marginBottom: 6,
                      }}
                    >
                      {documentItem.label}
                      {documentItem.required ? " *" : ""}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#64748b",
                      }}
                    >
                      {hasDocument(documentItem.type)
                        ? "Uploaded"
                        : "Not uploaded"}
                    </div>
                  </div>

                  <div
                    style={{
                      height: 24,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: hasDocument(documentItem.type)
                        ? "#dcfce7"
                        : "#fee2e2",
                      color: hasDocument(documentItem.type)
                        ? "#166534"
                        : "#991b1b",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {hasDocument(documentItem.type) ? "Done" : "Pending"}
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 16,
                    padding: "11px 12px",
                    borderRadius: 10,
                    background: "#2563eb",
                    color: "#ffffff",
                    cursor:
                      uploadingType === documentItem.type
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: 800,
                    opacity: uploadingType === documentItem.type ? 0.7 : 1,
                  }}
                >
                  <UploadCloud size={16} />
                  {uploadingType === documentItem.type
                    ? "Uploading..."
                    : "Upload / Replace"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={uploadingType === documentItem.type}
                    onChange={(event) =>
                      handleDocumentUpload(
                        documentItem.type,
                        event.target.files?.[0],
                      )
                    }
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          padding: 24,
          marginTop: 20,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#111827" }}>Uploaded Documents</h2>

        {documents.length === 0 ? (
          <div
            style={{
              color: "#64748b",
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: 12,
              padding: 18,
            }}
          >
            No documents uploaded yet.
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
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 14,
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <FileText size={18} color="#2563eb" />
                  <div>
                    <div style={{ fontWeight: 800, color: "#111827" }}>
                      {getDocumentLabel(document.document_type)}
                    </div>
                    <div
                      style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}
                    >
                      {document.file_name}
                    </div>
                  </div>
                </div>

                <div style={{ color: "#64748b", fontSize: 13 }}>
                  {new Date(document.uploaded_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
