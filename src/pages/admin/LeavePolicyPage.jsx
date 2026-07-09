import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import {
  recalculateLeaveBalances,
  runMonthlyLeaveCredit,
} from "../../services/leaveService";

export default function LeavePolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAction, setRunningAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadPolicy() {
    setLoading(true);
    const { data, error } = await supabase
      .from("leave_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      setError(error.message);
    } else {
      setPolicy(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function loadInitialPolicy() {
      await loadPolicy();
    }

    loadInitialPolicy();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setPolicy((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("leave_settings")
      .update({
        paid_leave_per_year: Number(policy.paid_leave_per_year),
        monthly_credit: Number(policy.monthly_credit),
        hr_approval_required: policy.hr_approval_required,
        carry_forward_enabled: policy.carry_forward_enabled,
        max_carry_forward: Number(policy.max_carry_forward),
      })
      .eq("id", policy.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Leave policy updated successfully.");
    }

    setSaving(false);
  }

  async function handleRunMonthlyCredit() {
    setRunningAction("monthly-credit");
    setError("");
    setSuccess("");

    try {
      const result = await runMonthlyLeaveCredit();
      setSuccess(
        `Monthly leave credit completed. Credits inserted: ${result?.credits_inserted ?? 0}.`,
      );
    } catch (err) {
      setError(err.message || "Unable to run monthly leave credit.");
    } finally {
      setRunningAction("");
    }
  }

  async function handleRecalculateBalances() {
    setRunningAction("recalculate");
    setError("");
    setSuccess("");

    try {
      const result = await recalculateLeaveBalances();
      setSuccess(
        `Leave balances recalculated. Affected balances: ${result?.affected_balances ?? 0}.`,
      );
    } catch (err) {
      setError(err.message || "Unable to recalculate leave balances.");
    } finally {
      setRunningAction("");
    }
  }

  if (loading) return <div className="page-card">Loading leave policy...</div>;
  if (!policy) return <div className="page-card">Leave policy not found.</div>;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1>Leave Policy</h1>
          <p>Configure company-wide leave settings.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <section className="page-card">
        <form className="form-grid" onSubmit={handleSave}>
          <label>
            Paid Leave Per Year
            <input
              type="number"
              step="0.5"
              name="paid_leave_per_year"
              value={policy.paid_leave_per_year}
              onChange={handleChange}
            />
          </label>

          <label>
            Monthly Credit
            <input
              type="number"
              step="0.5"
              name="monthly_credit"
              value={policy.monthly_credit}
              onChange={handleChange}
            />
          </label>

          <label>
            Max Carry Forward
            <input
              type="number"
              step="0.5"
              name="max_carry_forward"
              value={policy.max_carry_forward}
              onChange={handleChange}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              name="hr_approval_required"
              checked={policy.hr_approval_required}
              onChange={handleChange}
            />
            HR Approval Required
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              name="carry_forward_enabled"
              checked={policy.carry_forward_enabled}
              onChange={handleChange}
            />
            Enable Carry Forward
          </label>

          <div className="form-actions full-width">
            <button className="primary-button" disabled={saving}>
              {saving ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </form>
      </section>

      <section className="page-card">
        <h2>Leave Balance Actions</h2>
        <p className="muted-text">
          Use these actions after employee data changes, policy changes, or
          before payroll review.
        </p>

        <div className="button-row">
          <button
            type="button"
            className="primary-button"
            disabled={Boolean(runningAction)}
            onClick={handleRunMonthlyCredit}
          >
            {runningAction === "monthly-credit"
              ? "Running..."
              : "Run Monthly Credit"}
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={Boolean(runningAction)}
            onClick={handleRecalculateBalances}
          >
            {runningAction === "recalculate"
              ? "Recalculating..."
              : "Recalculate Balances"}
          </button>
        </div>
      </section>
    </div>
  );
}
