import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Laptop,
  Clock,
  CalendarDays,
  Network,
  Building2,
  BarChart3,
  Settings,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const employeeLinks = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "My Profile", path: "/profile", icon: UserRound },
  { label: "My Documents", path: "/my-documents", icon: FileText },
  { label: "My Assets", path: "/assets", icon: Laptop },
  { label: "My Timesheets", path: "/timesheets", icon: Clock },
  { label: "My Leave", path: "/leave", icon: CalendarDays },
  { label: "Team Leave", path: "/manager-leave", icon: CalendarDays },
  { label: "Organization Tree", path: "/org-tree", icon: Network },
];

const adminLinks = [
  { label: "Dashboard", path: "/admin-dashboard", icon: LayoutDashboard },
  { label: "Employees", path: "/employees", icon: Users },
  { label: "Departments", path: "/departments", icon: Building2 },
  { label: "Holiday Management", path: "/holidays", icon: CalendarDays },
  { label: "Leave Policy", path: "/leave-policy", icon: CalendarDays },
  { label: "Leave Reports", path: "/leave-reports", icon: BarChart3 },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Settings", path: "/settings", icon: Settings },
];

const adminRoles = ["admin", "hr", "payroll"];

function SidebarLink({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        color: isActive ? "#ffffff" : "#cbd5e1",
        background: isActive ? "#2563eb" : "transparent",
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 600,
      })}
    >
      <Icon size={18} />
      {item.label}
    </NavLink>
  );
}

function SidebarSection({ title, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "#64748b",
          marginBottom: 10,
          fontWeight: 800,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

export default function Sidebar() {
  const { role } = useAuth();
  const canSeeAdminPortal = adminRoles.includes(role);

  return (
    <aside
      style={{
        width: 260,
        background: "#0f172a",
        color: "white",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <img
          src="/verifinity-light.png"
          alt="Verifinity"
          style={{
            width: 250,
            height: 56,
            display: "block",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>

      <SidebarSection title="Employee Portal">
        <nav style={{ display: "grid", gap: 6 }}>
          {employeeLinks.map((item) => (
            <SidebarLink key={`${item.label}-${item.path}`} item={item} />
          ))}
        </nav>
      </SidebarSection>

      {canSeeAdminPortal && (
        <div
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: "1px solid rgba(148, 163, 184, 0.2)",
          }}
        >
          <SidebarSection title="Admin Portal">
            <nav style={{ display: "grid", gap: 6 }}>
              {adminLinks.map((item) => (
                <SidebarLink key={item.path} item={item} />
              ))}
            </nav>
          </SidebarSection>
        </div>
      )}
    </aside>
  );
}
