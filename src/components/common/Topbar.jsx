import { useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { signOut } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

const pageLabels = {
  "/dashboard": {
    title: "Employee Dashboard",
    subtitle: "Your profile, documents, leave, and timesheet overview.",
  },
  "/admin-dashboard": {
    title: "Admin Dashboard",
    subtitle: "Company-wide employee, onboarding, leave, and asset overview.",
  },
  "/profile": {
    title: "My Profile",
    subtitle: "Manage your employee and payroll details.",
  },
  "/my-documents": {
    title: "My Documents",
    subtitle: "Upload and manage your onboarding documents.",
  },
  "/employees": {
    title: "Employees",
    subtitle: "Manage employee records and onboarding.",
  },
  "/departments": {
    title: "Departments",
    subtitle: "Manage departments used across employee records.",
  },
  "/assets": {
    title: "Assets",
    subtitle: "Track company assets issued to employees.",
  },
  "/timesheets": {
    title: "Timesheets",
    subtitle: "Track daily login, logout, and attendance records.",
  },
  "/leave": {
    title: "Leave Management",
    subtitle: "Apply for and manage paid leave requests.",
  },
  "/org-tree": {
    title: "Organization Tree",
    subtitle: "View reporting structure and manager relationships.",
  },
  "/reports": {
    title: "Reports",
    subtitle: "Export employee, timesheet, and payroll-ready reports.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Manage internal tool configuration.",
  },
};

function getPageLabel(pathname) {
  if (pathname.startsWith("/employees/")) {
    return {
      title: "Employee Details",
      subtitle: "Review profile, documents, assets, timesheets, and leave.",
    };
  }

  return (
    pageLabels[pathname] || {
      title: "Employee Portal",
      subtitle: "Internal HR, payroll, leave, and asset tracking.",
    }
  );
}

export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const pageLabel = getPageLabel(location.pathname);

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  const initials = (profile?.full_name || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <header
      style={{
        minHeight: 68,
        background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
        borderBottom: "1px solid #e6eaf0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 28px",
        gap: 20,
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: "blur(14px)",
        boxShadow: "0 1px 0 rgba(15, 23, 42, 0.03)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: "#2563eb",
              boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.10)",
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#64748b",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Verifinity Internal
          </span>
        </div>

        <div
          style={{
            fontSize: 19,
            fontWeight: 850,
            color: "#0f172a",
            letterSpacing: "-0.035em",
            lineHeight: 1.15,
          }}
        >
          {pageLabel.title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#64748b",
            marginTop: 3,
            lineHeight: 1.3,
          }}
        >
          {pageLabel.subtitle}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 10px 6px 6px",
            border: "1px solid #e6eaf0",
            borderRadius: 999,
            background: "#ffffff",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "linear-gradient(135deg, #2563eb, #06b6d4)",
              color: "#ffffff",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: "-0.02em",
            }}
          >
            {initials || "U"}
          </div>

          <div style={{ textAlign: "left", lineHeight: 1.15, paddingRight: 2 }}>
            <div style={{ fontSize: 14, fontWeight: 850, color: "#0f172a" }}>
              {profile?.full_name || "User"}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#64748b",
                textTransform: "capitalize",
                marginTop: 3,
              }}
            >
              {profile?.role || "employee"}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Logout"
          style={{
            width: 44,
            height: 44,
            display: "grid",
            placeItems: "center",
            border: "1px solid #e6eaf0",
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: 999,
            cursor: "pointer",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.05)",
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
