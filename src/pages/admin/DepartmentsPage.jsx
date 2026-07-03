import { useEffect, useState } from "react";
import { Building2, Plus, RotateCcw, Save, XCircle } from "lucide-react";
import {
  createDepartment,
  deactivateDepartment,
  getAllDepartments,
  reactivateDepartment,
  updateDepartment,
} from "../../services/employeeService";

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 14,
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
  outline: "none",
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInitialDepartments() {
      try {
        const data = await getAllDepartments();

        if (!isMounted) return;

        setDepartments(data);
      } catch (error) {
        console.error(error);

        if (!isMounted) return;

        setErrorText(error.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitialDepartments();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCreateDepartment(event) {
    event.preventDefault();

    if (!newDepartmentName.trim()) return;

    setErrorText("");
    setSuccessText("");
    setSaving(true);

    try {
      const createdDepartment = await createDepartment(newDepartmentName);
      setDepartments((current) =>
        [...current, createdDepartment].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setNewDepartmentName("");
      setSuccessText("Department added successfully.");
    } catch (error) {
      console.error(error);
      setErrorText(error.message);
    } finally {
      setSaving(false);
    }
  }

  function startEditing(department) {
    setEditingId(department.id);
    setEditingName(department.name);
    setErrorText("");
    setSuccessText("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  async function handleUpdateDepartment(department) {
    if (!editingName.trim()) return;

    setErrorText("");
    setSuccessText("");
    setSaving(true);

    try {
      const updatedDepartment = await updateDepartment(department.id, {
        name: editingName,
        isActive: department.is_active,
      });

      setDepartments((current) =>
        current
          .map((item) =>
            item.id === updatedDepartment.id ? updatedDepartment : item,
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
      );

      setEditingId(null);
      setEditingName("");
      setSuccessText("Department updated successfully.");
    } catch (error) {
      console.error(error);
      setErrorText(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(departmentId) {
    setErrorText("");
    setSuccessText("");

    try {
      const updatedDepartment = await deactivateDepartment(departmentId);
      setDepartments((current) =>
        current.map((item) =>
          item.id === updatedDepartment.id ? updatedDepartment : item,
        ),
      );
      setSuccessText("Department deactivated.");
    } catch (error) {
      console.error(error);
      setErrorText(error.message);
    }
  }

  async function handleReactivate(departmentId) {
    setErrorText("");
    setSuccessText("");

    try {
      const updatedDepartment = await reactivateDepartment(departmentId);
      setDepartments((current) =>
        current.map((item) =>
          item.id === updatedDepartment.id ? updatedDepartment : item,
        ),
      );
      setSuccessText("Department reactivated.");
    } catch (error) {
      console.error(error);
      setErrorText(error.message);
    }
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: "#111827" }}>Departments</h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Manage Verifinity departments used for employee profiles, reporting,
          and dashboards.
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

      <form
        onSubmit={handleCreateDepartment}
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 320px" }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 800,
                color: "#374151",
                marginBottom: 7,
              }}
            >
              New Department Name
            </label>
            <input
              style={inputStyle}
              value={newDepartmentName}
              onChange={(event) => setNewDepartmentName(event.target.value)}
              placeholder="Example: Customer Support"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !newDepartmentName.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: 0,
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 10,
              padding: "11px 14px",
              cursor:
                saving || !newDepartmentName.trim() ? "not-allowed" : "pointer",
              fontWeight: 800,
              opacity: saving || !newDepartmentName.trim() ? 0.7 : 1,
            }}
          >
            <Plus size={16} />
            Add Department
          </button>
        </div>
      </form>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          style={{
            padding: 18,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Building2 size={20} color="#2563eb" />
          <div style={{ fontWeight: 800, color: "#111827" }}>
            Department List
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 18, color: "#64748b" }}>
            Loading departments...
          </div>
        ) : departments.length === 0 ? (
          <div style={{ padding: 18, color: "#64748b" }}>
            No departments found.
          </div>
        ) : (
          departments.map((department) => {
            const isEditing = editingId === department.id;

            return (
              <div
                key={department.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 14,
                  alignItems: "center",
                  padding: 16,
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div>
                  {isEditing ? (
                    <input
                      style={inputStyle}
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                  ) : (
                    <>
                      <div style={{ fontWeight: 800, color: "#111827" }}>
                        {department.name}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: department.is_active ? "#166534" : "#991b1b",
                          fontWeight: 700,
                        }}
                      >
                        {department.is_active ? "Active" : "Inactive"}
                      </div>
                    </>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateDepartment(department)}
                        disabled={saving || !editingName.trim()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          border: 0,
                          background: "#16a34a",
                          color: "#ffffff",
                          borderRadius: 10,
                          padding: "9px 12px",
                          cursor:
                            saving || !editingName.trim()
                              ? "not-allowed"
                              : "pointer",
                          fontWeight: 800,
                        }}
                      >
                        <Save size={15} />
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={cancelEditing}
                        style={{
                          border: "1px solid #d1d5db",
                          background: "#ffffff",
                          color: "#111827",
                          borderRadius: 10,
                          padding: "9px 12px",
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditing(department)}
                        style={{
                          border: "1px solid #d1d5db",
                          background: "#ffffff",
                          color: "#111827",
                          borderRadius: 10,
                          padding: "9px 12px",
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        Edit
                      </button>

                      {department.is_active ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(department.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            border: 0,
                            background: "#dc2626",
                            color: "#ffffff",
                            borderRadius: 10,
                            padding: "9px 12px",
                            cursor: "pointer",
                            fontWeight: 800,
                          }}
                        >
                          <XCircle size={15} />
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReactivate(department.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            border: 0,
                            background: "#16a34a",
                            color: "#ffffff",
                            borderRadius: 10,
                            padding: "9px 12px",
                            cursor: "pointer",
                            fontWeight: 800,
                          }}
                        >
                          <RotateCcw size={15} />
                          Reactivate
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
