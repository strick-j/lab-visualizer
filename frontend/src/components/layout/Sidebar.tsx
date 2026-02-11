import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  Database,
  Network,
  GitBranch,
  Waypoints,
  Settings,
  Container,
  Shield,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";

const awsNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Topology", href: "/topology", icon: Waypoints },
  { name: "EC2 Instances", href: "/ec2", icon: Server },
  { name: "RDS Databases", href: "/rds", icon: Database },
  { name: "ECS Containers", href: "/ecs", icon: Container },
  { name: "VPC Networking", href: "/vpc", icon: Network },
  { name: "Terraform", href: "/terraform", icon: GitBranch },
];

const cyberarkNavigation = [
  { name: "CyberArk", href: "/cyberark", icon: Shield },
  { name: "Access Mapping", href: "/access-mapping", icon: Map },
];

function NavItem({
  item,
}: {
  item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> };
}) {
  return (
    <NavLink
      to={item.href}
      end={item.href === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-white"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white",
        )
      }
    >
      <item.icon className="h-5 w-5" />
      {item.name}
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-[var(--header-height)] z-10 h-[calc(100vh-var(--header-height))] w-64 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <nav className="flex flex-col gap-1 p-4">
        {/* AWS Resources */}
        {awsNavigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}

        {/* CyberArk Section */}
        <div className="mt-3 mb-1 px-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            CyberArk
          </p>
        </div>
        {cyberarkNavigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4 dark:border-gray-700">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-white"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white",
            )
          }
        >
          <Settings className="h-5 w-5" />
          Settings
        </NavLink>
        <p className="mt-2 px-3 text-xs text-gray-400 dark:text-gray-500">
          v{__APP_VERSION__}
        </p>
      </div>
    </aside>
  );
}
