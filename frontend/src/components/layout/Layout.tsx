import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";

export function Layout() {
  const location = useLocation();
  const { collapsed } = useSidebar();
  const isFullWidth = ["/topology", "/access-mapping"].includes(
    location.pathname,
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <Sidebar />
      <main
        className={cn(
          "min-h-[calc(100vh-var(--header-height))] transition-all duration-300",
          collapsed ? "ml-16" : "ml-64",
          isFullWidth ? "" : "p-6",
        )}
      >
        <div className={isFullWidth ? "" : "mx-auto max-w-7xl"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
