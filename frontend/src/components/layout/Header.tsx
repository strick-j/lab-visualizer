import { useState, useRef, useEffect } from "react";
import { RefreshCw, ScanEye, User, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/common";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useRefreshData, useStatusSummary } from "@/hooks";
import { formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const { data: summary } = useStatusSummary();
  const refreshMutation = useRefreshData();
  const { user, logout, isAuthenticated } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    refreshMutation.mutate(false);
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
            <ScanEye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AWS Infrastructure Visualizer
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {formatRelativeTime(summary?.last_refreshed)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 pr-6">
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshMutation.isPending}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>

          {/* User Menu */}
          {isAuthenticated && user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:inline">
                  {user.display_name || user.username}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Dropdown menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.display_name || user.username}
                    </p>
                    {user.email && (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {user.auth_provider === "local"
                        ? "Local account"
                        : "OIDC account"}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
