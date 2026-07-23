import { AlertCircle, CheckCircle2 } from "lucide-react";
import { tableCellStyle } from "./leaveStyles";

const buttonStyles = {
  primary: {
    border: "1px solid rgba(255,255,255,0.24)",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    boxShadow: "0 12px 28px rgba(37, 99, 235, 0.22)",
  },
  secondary: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
  },
  danger: {
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
  },
};

export function LeavePage({ icon: Icon, title, description, headerContent, children }) {
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
                display: "grid",
                placeItems: "center",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.24)",
                flexShrink: 0,
              }}
            >
              <Icon size={30} />
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
                {title}
              </h1>
              <p style={{ margin: "10px 0 0", color: "#cbd5e1", fontSize: 15 }}>
                {description}
              </p>
            </div>
          </div>
          {headerContent}
        </div>
      </div>
      {children}
    </div>
  );
}

export function LeaveSection({ icon: Icon, title, description, action, children }) {
  return (
    <section
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
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
          justifyContent: "space-between",
          gap: 14,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
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
        {action}
      </div>
      {children}
    </section>
  );
}

export function LeaveAlert({ type, children }) {
  const isError = type === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      style={{
        background: isError ? "#fef2f2" : "#ecfdf5",
        color: isError ? "#991b1b" : "#166534",
        border: `1px solid ${isError ? "#fecaca" : "#bbf7d0"}`,
        borderRadius: 14,
        padding: 14,
        marginBottom: 18,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      <Icon size={18} />
      {children}
    </div>
  );
}

export function FormGrid({ children, minWidth = 240 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
        gap: 18,
      }}
    >
      {children}
    </div>
  );
}

export function LeaveField({ label, required, fullWidth, children }) {
  return (
    <div style={fullWidth ? { gridColumn: "1 / -1" } : undefined}>
      <label
        style={{
          display: "block",
          marginBottom: 7,
          color: "#475569",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.02em",
        }}
      >
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}

export function LeaveCheckbox({ label, name, checked, onChange, disabled }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 46,
        color: disabled ? "#94a3b8" : "#475569",
        fontSize: 13,
        fontWeight: 750,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{ display: "none" }}
      />
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: checked ? "1px solid #2563eb" : "1px solid #94a3b8",
          background: checked ? "#2563eb" : "#ffffff",
          display: "grid",
          placeItems: "center",
          boxSizing: "border-box",
          flexShrink: 0,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {checked && (
          <span
            style={{
              width: 8,
              height: 4,
              borderLeft: "2px solid #ffffff",
              borderBottom: "2px solid #ffffff",
              transform: "rotate(-45deg)",
              marginTop: -2,
            }}
          />
        )}
      </span>
      {label}
    </label>
  );
}

export function LeaveButton({ variant = "primary", icon: Icon, disabled, children, style, ...props }) {
  return (
    <button
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        borderRadius: 999,
        padding: "11px 16px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13,
        fontWeight: 800,
        opacity: disabled ? 0.68 : 1,
        ...buttonStyles[variant],
        ...style,
      }}
      {...props}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

export function LeaveTable({ headers, children, columnWidths = [] }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
      }}
    >
      <table
        style={{
          width: "100%",
          maxWidth: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          background: "#ffffff",
        }}
      >
        {columnWidths.length > 0 && (
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={`${width}-${index}`} style={{ width }} />
            ))}
          </colgroup>
        )}
        <thead style={{ background: "#f8fafc" }}>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  padding: "9px 10px",
                  textAlign: "left",
                  color: "#64748b",
                  fontSize: 10,
                  fontWeight: 850,
                  lineHeight: 1.25,
                  letterSpacing: "0.035em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #e2e8f0",
                  borderRight: "1px solid #e2e8f0",
                  overflowWrap: "anywhere",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyTableRow({ colSpan, children }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          ...tableCellStyle,
          padding: 26,
          textAlign: "center",
          color: "#64748b",
        }}
      >
        {children}
      </td>
    </tr>
  );
}

export function MetricGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
        gap: 12,
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

export function MetricCard({ label, value, icon: Icon, color = "#2563eb" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 16,
        border: "1px solid #e6eaf0",
        borderRadius: 18,
        background: "#ffffff",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.045)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          display: "grid",
          placeItems: "center",
          color,
          background: `${color}14`,
          flexShrink: 0,
        }}
      >
        <Icon size={19} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#64748b", fontSize: 11, fontWeight: 800 }}>
          {label}
        </div>
        <div style={{ marginTop: 4, color: "#0f172a", fontSize: 20, fontWeight: 900 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

export function LoadingText({ children }) {
  return <div style={{ color: "#64748b" }}>{children}</div>;
}
