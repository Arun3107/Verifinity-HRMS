import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { loading, isLoggedIn, profile, role } = useAuth();

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (!profile) {
    return (
      <div style={{ padding: 24 }}>
        No employee profile found for this login. Please contact HR.
      </div>
    );
  }

  if (profile.is_active === false) {
    return (
      <div style={{ padding: 24 }}>
        Your account is inactive. Please contact HR.
      </div>
    );
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return (
      <div style={{ padding: 24 }}>
        You do not have permission to view this page.
      </div>
    );
  }

  return children;
}
