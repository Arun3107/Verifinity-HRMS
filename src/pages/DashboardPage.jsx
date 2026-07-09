import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  ClipboardList,
  CalendarClock,
  AlertTriangle,
  Laptop,
  RotateCcw,
  UserRound,
  FileCheck,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  getAdminDashboardStats,
  getEmployeeDashboardStats,
} from "../services/employeeService";
import {
  getMyLeaveBalance,
  getMyLeaveRequests,
  getPendingLeaveApprovals,
} from "../services/leaveService";

const adminRoles = ["admin", "hr", "payroll"];

function formatOnboardingStatus(status) {
  if (status === "submitted") return "Submitted for Review";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "invited") return "Invited";
  return "Pending";
}

function getCompletionMessage(
  profileCompletion,
  uploadedRequiredCount,
  requiredDocumentCount,
) {
  if (
    profileCompletion >= 100 &&
    uploadedRequiredCount >= requiredDocumentCount
  ) {
    return "Your profile and required documents are complete.";
  }

  if (
    profileCompletion < 100 &&
    uploadedRequiredCount < requiredDocumentCount
  ) {
    return "Please complete your profile and upload the required documents.";
  }

  if (profileCompletion < 100) {
    return "Please complete the remaining profile details.";
  }

  return "Please upload the remaining required documents.";
}

export default function DashboardPage({ dashboardType = "employee" }) {
  const { role, profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaveStats, setLeaveStats] = useState({
    leaveBalance: 0,
    pendingLeaveRequests: 0,
    approvedLeaveRequests: 0,
    pendingLeaveApprovals: 0,
  });

  const canAccessAdminDashboard = adminRoles.includes(role);
  const isAdminDashboard = dashboardType === "admin" && canAccessAdminDashboard;

  useEffect(() => {
    async function loadDashboardStats() {
      if (!profile?.id) return;

      try {
        setLoading(true);

        const data = isAdminDashboard
          ? await getAdminDashboardStats()
          : await getEmployeeDashboardStats(profile.id);

        setStats(data);

        if (isAdminDashboard) {
          const pendingApprovals = await getPendingLeaveApprovals();
          setLeaveStats((current) => ({
            ...current,
            pendingLeaveApprovals: pendingApprovals.length,
          }));
        } else {
          const [leaveBalances, leaveRequests] = await Promise.all([
            getMyLeaveBalance(),
            getMyLeaveRequests(),
          ]);

          const paidLeaveBalance = leaveBalances.find(
            (balance) => balance.leave_type?.code === "paid_leave",
          );

          setLeaveStats({
            leaveBalance: Number(paidLeaveBalance?.available_balance || 0),
            pendingLeaveRequests: leaveRequests.filter((request) =>
              ["pending_manager", "pending_hr"].includes(request.status),
            ).length,
            approvedLeaveRequests: leaveRequests.filter(
              (request) => request.status === "approved",
            ).length,
            pendingLeaveApprovals: 0,
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardStats();
  }, [isAdminDashboard, profile?.id]);

  const kpis = isAdminDashboard
    ? [
        {
          label: "Total Employees",
          value: stats?.totalEmployees ?? "-",
          icon: Users,
        },
        {
          label: "Active Employees",
          value: stats?.activeEmployees ?? "-",
          icon: UserCheck,
        },
        {
          label: "Pending Onboarding",
          value: stats?.pendingOnboarding ?? "-",
          icon: ClipboardList,
        },
        {
          label: "Missing Documents",
          value: stats?.employeesWithMissingDocuments ?? "-",
          icon: AlertTriangle,
        },
        {
          label: "Pending Leave Approvals",
          value: leaveStats.pendingLeaveApprovals,
          icon: CalendarClock,
        },
        { label: "Assets Issued", value: "0", icon: Laptop },
        { label: "Assets Pending Return", value: "0", icon: RotateCcw },
      ]
    : [
        {
          label: "Profile Completion",
          value: `${stats?.profileCompletion ?? 0}%`,
          icon: UserRound,
        },
        {
          label: "Documents Complete",
          value: `${stats?.uploadedRequiredCount ?? 0}/${stats?.requiredDocumentCount ?? 3}`,
          icon: FileCheck,
        },
        {
          label: "Onboarding Status",
          value: stats?.onboardingStatus || "pending",
          icon: ClipboardList,
        },
        {
          label: "Leave Balance",
          value: leaveStats.leaveBalance,
          icon: CalendarDays,
        },
        {
          label: "Pending Leave",
          value: leaveStats.pendingLeaveRequests,
          icon: CalendarClock,
        },
        {
          label: "Approved Leave",
          value: leaveStats.approvedLeaveRequests,
          icon: CalendarDays,
        },
      ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, color: "#111827" }}>
          Welcome {profile?.full_name || "User"}
        </h1>
        <p style={{ marginTop: 6, color: "#64748b" }}>
          {isAdminDashboard
            ? "Overview of employees, onboarding, leave, timesheets, and assets."
            : "Your employee workspace for profile, documents, leave, and timesheets."}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {kpis.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 20,
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 16,
                }}
              >
                <Icon size={20} />
              </div>

              <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>
                {loading ? "..." : item.value}
              </div>

              <div style={{ marginTop: 4, color: "#64748b", fontSize: 14 }}>
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {!isAdminDashboard && (
        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div
              style={{ fontWeight: 800, color: "#111827", marginBottom: 12 }}
            >
              Onboarding Summary
            </div>

            <div style={{ color: "#64748b", lineHeight: 1.7 }}>
              Status:{" "}
              <strong style={{ color: "#111827" }}>
                {formatOnboardingStatus(stats?.onboardingStatus)}
              </strong>
              <br />
              Profile completion:{" "}
              <strong style={{ color: "#111827" }}>
                {stats?.profileCompletion ?? 0}%
              </strong>
              <br />
              Required documents:{" "}
              <strong style={{ color: "#111827" }}>
                {stats?.uploadedRequiredCount ?? 0}/
                {stats?.requiredDocumentCount ?? 3}
              </strong>
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div
              style={{ fontWeight: 800, color: "#111827", marginBottom: 12 }}
            >
              Next Action
            </div>

            <div style={{ color: "#64748b", lineHeight: 1.7 }}>
              {getCompletionMessage(
                stats?.profileCompletion ?? 0,
                stats?.uploadedRequiredCount ?? 0,
                stats?.requiredDocumentCount ?? 3,
              )}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 24,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div style={{ fontWeight: 800, color: "#111827", marginBottom: 8 }}>
          {isAdminDashboard ? "Admin Workspace" : "Employee Workspace"}
        </div>

        <div style={{ color: "#64748b", lineHeight: 1.6 }}>
          {isAdminDashboard
            ? "Employee, onboarding, and pending leave approval metrics are now connected to Supabase. Timesheet and asset metrics will appear after those modules are built."
            : "Your profile, document, and leave metrics are connected to Supabase. Timesheet reminders will appear after that module is built."}
        </div>
      </div>
    </div>
  );
}
