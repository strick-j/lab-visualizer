import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const location = useLocation();
  const isFullWidth = location.pathname === "/topology";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <Sidebar />
      <main
        className={`ml-64 min-h-[calc(100vh-var(--header-height))] ${isFullWidth ? "" : "p-6"}`}
      >
        <div className={isFullWidth ? "" : "mx-auto max-w-7xl"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
