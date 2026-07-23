import { useEffect, useState } from "react";
import {
  CalendarDays,
  Info,
  ListChecks,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  createHoliday,
  deleteHoliday,
  getHolidayCalendar,
  updateHoliday,
} from "../../services/leaveService";
import {
  EmptyTableRow,
  FormGrid,
  LeaveAlert,
  LeaveButton,
  LeaveField,
  LeavePage,
  LeaveSection,
  LeaveTable,
  LoadingText,
} from "../../components/leave/LeaveManagementUI";
import {
  inputStyle,
  tableCellStyle,
} from "../../components/leave/leaveStyles";
import { formatLeaveDate } from "../../utils/leaveUtils";

const initialForm = {
  holiday_date: "",
  name: "",
};

export default function HolidayManagementPage() {
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadHolidays(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");

    try {
      setHolidays(await getHolidayCalendar());
    } catch (err) {
      setError(err.message || "Unable to load holidays.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    getHolidayCalendar()
      .then((data) => {
        if (active) setHolidays(data);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load holidays.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleEdit(holiday) {
    setEditingId(holiday.id);
    setForm({
      holiday_date: holiday.holiday_date || "",
      name: holiday.name || "",
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingId("");
    setForm(initialForm);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.holiday_date || !form.name.trim()) {
      setError("Please enter holiday date and name.");
      return;
    }

    const duplicateHoliday = holidays.find(
      (holiday) =>
        holiday.holiday_date === form.holiday_date && holiday.id !== editingId,
    );

    if (duplicateHoliday) {
      setError(`${duplicateHoliday.name} already exists on the selected date.`);
      return;
    }

    setSaving(true);

    try {
      const values = {
        holiday_date: form.holiday_date,
        name: form.name.trim(),
      };

      if (editingId) {
        await updateHoliday(editingId, values);
        setSuccess("Holiday updated successfully.");
      } else {
        await createHoliday(values);
        setSuccess("Holiday added successfully.");
      }

      setEditingId("");
      setForm(initialForm);
      await loadHolidays(false);
    } catch (err) {
      setError(err.message || "Unable to save holiday.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(holiday) {
    const confirmed = window.confirm(
      `Remove ${holiday.name} from the active holiday calendar?`,
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setActionId(holiday.id);

    try {
      await deleteHoliday(holiday.id);
      if (editingId === holiday.id) handleCancelEdit();
      setSuccess("Holiday removed successfully.");
      await loadHolidays(false);
    } catch (err) {
      setError(err.message || "Unable to remove holiday.");
    } finally {
      setActionId("");
    }
  }

  if (loading) return <LoadingText>Loading holidays...</LoadingText>;

  return (
    <LeavePage
      icon={CalendarDays}
      title="Holiday Management"
      description="Configure holidays excluded from employee leave calculations."
      headerContent={
        <div
          style={{
            minWidth: 170,
            padding: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 16,
            background: "rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ color: "#93c5fd", fontSize: 11, fontWeight: 850 }}>
            ACTIVE HOLIDAYS
          </div>
          <div style={{ marginTop: 5, fontSize: 22, fontWeight: 900 }}>
            {holidays.length}
          </div>
        </div>
      }
    >
      {error && <LeaveAlert type="error">{error}</LeaveAlert>}
      {success && <LeaveAlert type="success">{success}</LeaveAlert>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: 18,
          alignItems: "start",
        }}
      >
        <LeaveSection
          icon={editingId ? Pencil : Plus}
          title={editingId ? "Edit Holiday" : "Add Holiday"}
          description="Add a date once; duplicate holiday dates are not allowed."
        >
          <form onSubmit={handleSubmit}>
            <FormGrid minWidth={210}>
              <LeaveField label="Holiday Date" required>
                <input
                  type="date"
                  name="holiday_date"
                  value={form.holiday_date}
                  onChange={handleChange}
                  onClick={(event) => event.currentTarget.showPicker?.()}
                  style={{ ...inputStyle, colorScheme: "light", cursor: "pointer" }}
                />
              </LeaveField>
              <LeaveField label="Holiday Name" required>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Example: Independence Day"
                  style={inputStyle}
                />
              </LeaveField>
            </FormGrid>
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <LeaveButton type="submit" icon={Save} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Holiday" : "Add Holiday"}
              </LeaveButton>
              {editingId && (
                <LeaveButton
                  type="button"
                  variant="secondary"
                  icon={X}
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </LeaveButton>
              )}
            </div>
          </form>
        </LeaveSection>

        <LeaveSection
          icon={Info}
          title="Holiday Rules"
          description="How holidays affect employee leave requests."
        >
          <div style={{ display: "grid", gap: 12 }}>
            {[
              {
                title: "Weekends",
                text: "Saturday and Sunday are automatically excluded from working leave days.",
              },
              {
                title: "Public Holidays",
                text: "Every active date below is excluded when leave days are calculated.",
              },
            ].map((rule) => (
              <div
                key={rule.title}
                style={{
                  padding: 14,
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  background: "#f8fafc",
                }}
              >
                <strong style={{ color: "#0f172a", fontSize: 14 }}>{rule.title}</strong>
                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#64748b",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {rule.text}
                </p>
              </div>
            ))}
          </div>
        </LeaveSection>
      </div>

      <div style={{ marginTop: 18 }}>
        <LeaveSection
          icon={ListChecks}
          title="Holiday Calendar"
          description={`${holidays.length} active holiday${holidays.length === 1 ? "" : "s"}.`}
        >
          <LeaveTable headers={["Date", "Holiday", "Action"]} minWidth={620}>
            {holidays.length === 0 ? (
              <EmptyTableRow colSpan={3}>No holidays configured.</EmptyTableRow>
            ) : (
              holidays.map((holiday) => (
                <tr key={holiday.id}>
                  <td style={{ ...tableCellStyle, whiteSpace: "nowrap" }}>
                    {formatLeaveDate(holiday.holiday_date)}
                  </td>
                  <td style={{ ...tableCellStyle, color: "#0f172a", fontWeight: 750 }}>
                    {holiday.name}
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <LeaveButton
                        type="button"
                        variant="secondary"
                        icon={Pencil}
                        onClick={() => handleEdit(holiday)}
                        disabled={Boolean(actionId) || saving}
                        style={{ borderRadius: 10, padding: "8px 11px" }}
                      >
                        Edit
                      </LeaveButton>
                      <LeaveButton
                        type="button"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(holiday)}
                        disabled={Boolean(actionId) || saving}
                        style={{ borderRadius: 10, padding: "8px 11px" }}
                      >
                        {actionId === holiday.id ? "Removing..." : "Remove"}
                      </LeaveButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </LeaveTable>
        </LeaveSection>
      </div>
    </LeavePage>
  );
}
