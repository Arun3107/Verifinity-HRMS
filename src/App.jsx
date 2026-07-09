import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeeListPage from "./pages/EmployeeListPage";
import EmployeeCreatePage from "./pages/employees/EmployeeCreatePage";
import EmployeeDetailsPage from "./pages/employees/EmployeeDetailsPage";

import MyProfilePage from "./pages/MyProfilePage";
import MyDocumentsPage from "./pages/MyDocumentsPage";
import MyLeavePage from "./pages/leave/MyLeavePage";
import ManagerLeavePage from "./pages/leave/ManagerLeavePage";
import DepartmentsPage from "./pages/admin/DepartmentsPage";
import HolidayManagementPage from "./pages/admin/HolidayManagementPage";
import LeavePolicyPage from "./pages/admin/LeavePolicyPage";
import LeaveReportsPage from "./pages/admin/LeaveReportsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={<DashboardPage dashboardType="employee" />}
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr", "payroll"]}>
                <DashboardPage dashboardType="admin" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr", "payroll"]}>
                <EmployeeListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/new"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <EmployeeCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr", "payroll"]}>
                <EmployeeDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/departments"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr", "payroll"]}>
                <DepartmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/holidays"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <HolidayManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-policy"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <LeavePolicyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-reports"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr", "payroll"]}>
                <LeaveReportsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<MyProfilePage />} />
          <Route path="/my-documents" element={<MyDocumentsPage />} />
          <Route path="/leave" element={<MyLeavePage />} />
          <Route path="/manager-leave" element={<ManagerLeavePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
