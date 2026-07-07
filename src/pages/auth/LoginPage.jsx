import { useState } from "react";
import { Navigate } from "react-router-dom";
import { signInWithGoogle } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (user && profile) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleLogin() {
    setErrorText("");
    setLoading(true);

    const { error } = await signInWithGoogle();

    setLoading(false);

    if (error) {
      setErrorText(error.message);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f4f6f8",
      }}
    >
      <form
        onSubmit={(e) => e.preventDefault()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          padding: 28,
          borderRadius: 14,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1 style={{ marginBottom: 6 }}>Verifinity</h1>
        <p style={{ marginTop: 0, color: "#64748b" }}>
          Employee Management Portal
        </p>

        {errorText && (
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>{errorText}</div>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            border: 0,
            borderRadius: 8,
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>
      </form>
    </div>
  );
}
