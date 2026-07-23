import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeeListPage from "./pages/EmployeeListPage";
import EmployeeCreatePage from "./pages/employees/EmployeeCreatePage";
import EmployeeDetailsPage from "./pages/employees/EmployeeDetailsPage";

import MyProfilePage from "./pages/MyProfilePage";
import MyLeavePage from "./pages/leave/MyLeavePage";
import ManagerLeavePage from "./pages/leave/ManagerLeavePage";
import DepartmentsPage from "./pages/admin/DepartmentsPage";
import HolidayManagementPage from "./pages/admin/HolidayManagementPage";
import ReportsPage from "./pages/reports/ReportsPage";

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
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <DashboardPage dashboardType="admin" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
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
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <EmployeeDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/departments"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
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
          <Route path="/profile" element={<MyProfilePage />} />
          <Route path="/leave" element={<MyLeavePage />} />
          <Route
            path="/manager-leave"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr", "manager"]}>
                <ManagerLeavePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
