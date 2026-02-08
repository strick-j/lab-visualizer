import { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  ScanEye,
  User,
  LogOut,
  ChevronDown,
  Info,
  X,
} from "lucide-react";
import { Button } from "@/components/common";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useRefreshData, useStatusSummary, useAppInfo } from "@/hooks";
import { formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const { data: summary } = useStatusSummary();
  const { data: appInfo } = useAppInfo();
  const refreshMutation = useRefreshData();
  const { user, logout, isAuthenticated } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    refreshMutation.mutate(false);
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
  };

  const handleAboutOpen = () => {
    setIsUserMenuOpen(false);
    setIsAboutOpen(true);
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
    <>
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
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
                  <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
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
                      onClick={handleAboutOpen}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <Info className="h-4 w-4" />
                      About
                    </button>
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

      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                About
              </h2>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <ScanEye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    AWS Infrastructure Visualizer
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    v{__APP_VERSION__}
                  </p>
                </div>
              </div>
              <div className="space-y-3 rounded-md bg-gray-50 p-4 dark:bg-gray-900">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Frontend
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {__APP_VERSION__}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Backend
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {appInfo?.version ?? "..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Build
                  </span>
                  <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    {appInfo?.build_sha !== "unknown"
                      ? appInfo?.build_sha?.slice(0, 7)
                      : "dev"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Environment
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {appInfo?.environment ?? "..."}
                  </span>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                onClick={() => setIsAboutOpen(false)}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
