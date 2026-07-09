import { useEffect, useState } from "react";
import {
  createHoliday,
  deleteHoliday,
  getHolidayCalendar,
  updateHoliday,
} from "../../services/leaveService";

const initialForm = {
  holiday_date: "",
  name: "",
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function HolidayManagementPage() {
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadHolidays() {
    setLoading(true);
    setError("");

    try {
      const data = await getHolidayCalendar();
      setHolidays(data);
    } catch (err) {
      setError(err.message || "Unable to load holidays.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadInitialHolidays() {
      await loadHolidays();
    }

    loadInitialHolidays();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleEdit(holiday) {
    setEditingId(holiday.id);
    setForm({
      holiday_date: holiday.holiday_date || "",
      name: holiday.name || "",
    });
    setError("");
    setSuccess("");
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

    setSaving(true);

    try {
      if (editingId) {
        await updateHoliday(editingId, {
          holiday_date: form.holiday_date,
          name: form.name.trim(),
        });
        setSuccess("Holiday updated successfully.");
      } else {
        await createHoliday({
          holiday_date: form.holiday_date,
          name: form.name.trim(),
        });
        setSuccess("Holiday added successfully.");
      }

      setEditingId("");
      setForm(initialForm);
      await loadHolidays();
    } catch (err) {
      setError(err.message || "Unable to save holiday.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await deleteHoliday(id);
      setSuccess("Holiday removed successfully.");
      await loadHolidays();
    } catch (err) {
      setError(err.message || "Unable to remove holiday.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="page-card">Loading holidays...</div>;
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Holiday Management</h1>
          <p>
            Configure public holidays that should not deduct employee leave
            balance.
          </p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="content-grid two-column-grid">
        <section className="page-card">
          <h2>{editingId ? "Edit Holiday" : "Add Holiday"}</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Holiday Date
              <input
                type="date"
                name="holiday_date"
                value={form.holiday_date}
                onChange={handleChange}
              />
            </label>

            <label>
              Holiday Name
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Example: Independence Day"
              />
            </label>

            <div className="form-actions full-width">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Holiday"
                    : "Add Holiday"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="page-card">
          <h2>Holiday Rules</h2>
          <div className="simple-list">
            <div className="simple-list-item">
              <div>
                <strong>Weekends</strong>
                <p>Saturday and Sunday are automatically excluded.</p>
              </div>
            </div>
            <div className="simple-list-item">
              <div>
                <strong>Public Holidays</strong>
                <p>
                  Active holidays in this list are excluded from leave-day
                  calculation.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="page-card">
        <div className="section-header">
          <div>
            <h2>Holiday Calendar</h2>
            <p>
              {holidays.length} active holiday{holidays.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Holiday</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan="3">No holidays configured.</td>
                </tr>
              ) : (
                holidays.map((holiday) => (
                  <tr key={holiday.id}>
                    <td>{formatDate(holiday.holiday_date)}</td>
                    <td>{holiday.name}</td>
                    <td>
                      <div className="button-row">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleEdit(holiday)}
                          disabled={saving}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDelete(holiday.id)}
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
