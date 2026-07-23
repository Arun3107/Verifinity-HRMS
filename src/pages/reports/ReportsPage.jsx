import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Download,
  IndianRupee,
  Search,
} from "lucide-react";
import {
  LeaveAlert,
  LeavePage,
  LeaveSection,
} from "../../components/leave/LeaveManagementUI";
import { getMonthlyLeaveReports } from "../../services/reportService";

function getCurrentMonthKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${today.getFullYear()}-${month}`;
}

function formatDays(value) {
  const days = Number(value || 0);
  return days === 1 ? "1 day" : `${days} days`;
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(rows, fileName) {
  const csv = [
    ["Employee", "Employee ID", "Department", "Days"],
    ...rows.map((row) => [
      row.employeeName,
      row.employeeCode,
      row.departmentName,
      row.days,
    ]),
  ]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({ label, value, tone = "#2563eb" }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 16,
        background: "#f8fafc",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 7,
          color: tone,
          fontSize: 25,
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ReportTable({ rows, emptyText }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          fontSize: 13,
        }}
      >
        <thead>
          <tr
            style={{
              background: "#f1f5f9",
              color: "#475569",
              textAlign: "left",
            }}
          >
            <th style={{ width: "34%", padding: "11px 13px" }}>Employee</th>
            <th style={{ width: "20%", padding: "11px 13px" }}>Employee ID</th>
            <th style={{ width: "30%", padding: "11px 13px" }}>Department</th>
            <th style={{ width: "16%", padding: "11px 13px" }}>Days</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan="4"
                style={{
                  padding: 26,
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.employeeId} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td
                  style={{
                    padding: "10px 13px",
                    color: "#0f172a",
                    fontWeight: 800,
                    overflowWrap: "anywhere",
                  }}
                >
                  {row.employeeName}
                </td>
                <td style={{ padding: "10px 13px", color: "#475569" }}>
                  {row.employeeCode}
                </td>
                <td
                  style={{
                    padding: "10px 13px",
                    color: "#475569",
                    overflowWrap: "anywhere",
                  }}
                >
                  {row.departmentName}
                </td>
                <td
                  style={{
                    padding: "10px 13px",
                    color: "#0f172a",
                    fontWeight: 850,
                  }}
                >
                  {row.days}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const [month, setMonth] = useState(getCurrentMonthKey);
  const [activeReport, setActiveReport] = useState("leave");
  const [reports, setReports] = useState({ leaveTaken: [], lop: [] });
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReports() {
      setLoading(true);
      setErrorText("");

      try {
        const data = await getMonthlyLeaveReports(month);
        if (isMounted) setReports(data);
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setErrorText(error.message || "Unable to load monthly reports.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadReports();

    return () => {
      isMounted = false;
    };
  }, [month]);

  const sourceRows =
    activeReport === "leave" ? reports.leaveTaken : reports.lop;
  const departments = useMemo(
    () =>
      [...new Set(sourceRows.map((row) => row.departmentName))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [sourceRows],
  );
  const filteredRows = sourceRows.filter((row) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      `${row.employeeName} ${row.employeeCode} ${row.departmentName}`
        .toLowerCase()
        .includes(query);
    const matchesDepartment =
      department === "all" || row.departmentName === department;

    return matchesSearch && matchesDepartment;
  });
  const totalDays =
    Math.round(
      filteredRows.reduce((sum, row) => sum + Number(row.days || 0), 0) * 2,
    ) / 2;
  const reportTitle =
    activeReport === "leave" ? "Monthly Leave Taken" : "Monthly LOP";

  function selectReport(report) {
    setActiveReport(report);
    setDepartment("all");
    setSearch("");
  }

  return (
    <LeavePage
      icon={BarChart3}
      title="Reports"
      description="Review monthly approved leave and loss-of-pay totals."
      headerContent={
        <label style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 800 }}>
          REPORT MONTH
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            onClick={(event) => event.currentTarget.showPicker?.()}
            style={{
              display: "block",
              marginTop: 7,
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 11,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.10)",
              color: "#ffffff",
              colorScheme: "dark",
              fontWeight: 750,
              cursor: "pointer",
            }}
          />
        </label>
      }
    >
      {errorText && <LeaveAlert type="error">{errorText}</LeaveAlert>}

      <div
        style={{
          display: "inline-flex",
          gap: 6,
          padding: 6,
          marginBottom: 18,
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          background: "#ffffff",
        }}
      >
        {[
          {
            id: "leave",
            label: "Monthly Leave Taken",
            icon: CalendarDays,
          },
          { id: "lop", label: "Monthly LOP", icon: IndianRupee },
        ].map((report) => {
          const Icon = report.icon;
          const isActive = activeReport === report.id;

          return (
            <button
              key={report.id}
              type="button"
              onClick={() => selectReport(report.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: 0,
                borderRadius: 10,
                padding: "10px 14px",
                background: isActive ? "#2563eb" : "transparent",
                color: isActive ? "#ffffff" : "#475569",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Icon size={16} />
              {report.label}
            </button>
          );
        })}
      </div>

      <LeaveSection
        icon={activeReport === "leave" ? CalendarDays : IndianRupee}
        title={reportTitle}
        description="Only approved leave is included. Weekends, configured holidays, and half-days are calculated automatically."
        action={
          <button
            type="button"
            disabled={filteredRows.length === 0}
            onClick={() =>
              downloadCsv(
                filteredRows,
                `${activeReport === "leave" ? "monthly-leave" : "monthly-lop"}-${month}.csv`,
              )
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "9px 12px",
              background: "#ffffff",
              color: "#334155",
              cursor: filteredRows.length === 0 ? "not-allowed" : "pointer",
              opacity: filteredRows.length === 0 ? 0.55 : 1,
              fontWeight: 800,
            }}
          >
            <Download size={15} />
            Export CSV
          </button>
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SummaryCard label="Employees" value={filteredRows.length} />
          <SummaryCard
            label={activeReport === "leave" ? "Total Leave Days" : "Total LOP Days"}
            value={formatDays(totalDays)}
            tone={activeReport === "leave" ? "#2563eb" : "#b45309"}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(min(100%, 320px), 1fr) minmax(180px, 260px)",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "0 11px",
              color: "#64748b",
            }}
          >
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee or department"
              style={{
                width: "100%",
                border: 0,
                outline: 0,
                padding: "10px 0",
                background: "transparent",
                color: "#0f172a",
              }}
            />
          </label>

          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "10px 11px",
              background: "#ffffff",
              color: "#0f172a",
            }}
          >
            <option value="all">All departments</option>
            {departments.map((departmentName) => (
              <option key={departmentName} value={departmentName}>
                {departmentName}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 24, color: "#64748b" }}>
            Loading monthly report...
          </div>
        ) : (
          <ReportTable
            rows={filteredRows}
            emptyText={`No approved ${activeReport === "leave" ? "leave" : "LOP"} found for this month.`}
          />
        )}
      </LeaveSection>
    </LeavePage>
  );
}
