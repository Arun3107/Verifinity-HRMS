import { Outlet } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import Topbar from "../components/common/Topbar";

export default function AppLayout() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: "#f8fafc",
        overflow: "hidden",
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Topbar />

        <main
          style={{
            flex: 1,
            padding: "24px",
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            overflowY: "auto",
            overflowX: "hidden",
            minHeight: 0,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
