import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Loader2,
  AlertCircle,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import { getUsers, updateUserStatus, updateUserRole } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { User, UserRole } from "@/types";

export function UserManagementPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      setError("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleStatusToggle = async (userId: number, currentActive: boolean) => {
    setPendingAction(userId);
    setActionError(null);
    try {
      const updated = await updateUserStatus(userId, {
        is_active: !currentActive,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setActionError(
        axiosError.response?.data?.detail || "Failed to update user status",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setPendingAction(userId);
    setActionError(null);
    try {
      const updated = await updateUserRole(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setActionError(
        axiosError.response?.data?.detail || "Failed to update user role",
      );
    } finally {
      setPendingAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              User Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {total} user{total !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">
              {actionError}
            </p>
            <button
              onClick={() => setActionError(null)}
              className="ml-auto text-sm text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* User table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Provider
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Last Login
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {users.map((user) => {
              const isSelf = currentUser?.id === user.id;
              const isPending = pendingAction === user.id;

              return (
                <tr
                  key={user.id}
                  className={`${isPending ? "opacity-60" : ""} ${
                    !user.is_active ? "bg-gray-50 dark:bg-gray-800/50" : ""
                  }`}
                >
                  {/* User info */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user.display_name || user.username}
                        </span>
                        {isSelf && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            you
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {user.username}
                        {user.email && ` - ${user.email}`}
                      </div>
                    </div>
                  </td>

                  {/* Auth provider */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.auth_provider === "oidc"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {user.auth_provider === "oidc" ? "OIDC" : "Local"}
                    </span>
                  </td>

                  {/* Role */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user.id, e.target.value as UserRole)
                      }
                      disabled={isPending || isSelf}
                      className={`rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white ${
                        isSelf ? "cursor-not-allowed opacity-60" : ""
                      }`}
                      title={
                        isSelf
                          ? "You cannot change your own role"
                          : "Change user role"
                      }
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-4 py-3">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <UserCheck className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        <UserX className="h-3 w-3" />
                        Inactive
                      </span>
                    )}
                  </td>

                  {/* Last login */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleString()
                      : "Never"}
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        handleStatusToggle(user.id, user.is_active)
                      }
                      disabled={isPending || isSelf}
                      title={
                        isSelf
                          ? "You cannot change your own status"
                          : user.is_active
                            ? "Deactivate user"
                            : "Activate user"
                      }
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        user.is_active
                          ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                          : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                      }`}
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : user.is_active ? (
                        <ShieldOff className="h-3 w-3" />
                      ) : (
                        <Shield className="h-3 w-3" />
                      )}
                      {user.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          No users found.
        </div>
      )}
    </div>
  );
}
