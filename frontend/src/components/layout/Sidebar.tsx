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
  Cloud,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Lock,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";

// =============================================================================
// Navigation Data
// =============================================================================

interface NavItemData {
  name: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItemData[];
}

const navigationSections: NavSection[] = [
  {
    id: "aws",
    label: "AWS",
    icon: Cloud,
    items: [
      { name: "Topology", href: "/topology", icon: Waypoints },
      { name: "EC2 Instances", href: "/ec2", icon: Server },
      { name: "RDS Databases", href: "/rds", icon: Database },
      { name: "ECS Containers", href: "/ecs", icon: Container },
      { name: "VPC Networking", href: "/vpc", icon: Network },
    ],
  },
  {
    id: "cyberark",
    label: "CyberArk",
    icon: Shield,
    items: [
      { name: "Dashboard", href: "/cyberark-dashboard", icon: LayoutDashboard },
      { name: "Resources", href: "/cyberark", icon: Lock },
      { name: "Users", href: "/cyberark-users", icon: Users },
      { name: "Access Mapping", href: "/access-mapping", icon: Map },
    ],
  },
  {
    id: "iac",
    label: "IaC",
    icon: GitBranch,
    items: [{ name: "Terraform", href: "/terraform", icon: GitBranch }],
  },
];

// =============================================================================
// NavItem Component
// =============================================================================

function NavItem({
  item,
  sidebarCollapsed,
}: {
  item: NavItemData;
  sidebarCollapsed: boolean;
}) {
  return (
    <NavLink
      to={item.href}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center rounded-lg text-sm font-medium transition-colors",
          sidebarCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
          isActive
            ? "bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-white"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white",
        )
      }
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {!sidebarCollapsed && <span>{item.name}</span>}

      {sidebarCollapsed && (
        <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block dark:bg-gray-600">
          {item.name}
        </div>
      )}
    </NavLink>
  );
}

// =============================================================================
// SidebarSection Component
// =============================================================================

function SidebarSection({
  section,
  sidebarCollapsed,
  expanded,
  onToggle,
}: {
  section: NavSection;
  sidebarCollapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={cn(
          "group relative flex w-full items-center rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
          sidebarCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {sidebarCollapsed ? (
          <>
            <section.icon className="h-4 w-4" />
            <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-medium normal-case tracking-normal text-white shadow-lg group-hover:block dark:bg-gray-600">
              {section.label}
            </div>
          </>
        ) : (
          <>
            <span>{section.label}</span>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                expanded && "rotate-90",
              )}
            />
          </>
        )}
      </button>

      {/* Section Items (accordion) - expanded mode */}
      {!sidebarCollapsed && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-in-out",
            expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="space-y-0.5 py-1">
            {section.items.map((item) => (
              <NavItem key={item.href} item={item} sidebarCollapsed={false} />
            ))}
          </div>
        </div>
      )}

      {/* In collapsed sidebar mode, show items as icons when section is expanded */}
      {sidebarCollapsed && expanded && (
        <div className="space-y-0.5 py-1">
          {section.items.map((item) => (
            <NavItem key={item.href} item={item} sidebarCollapsed={true} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sidebar Component
// =============================================================================

export function Sidebar() {
  const { collapsed, toggleCollapsed, expandedSections, toggleSection } =
    useSidebar();

  return (
    <aside
      className={cn(
        "fixed left-0 top-[var(--header-height)] z-10 flex h-[calc(100vh-var(--header-height))] flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-800",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Collapse Toggle */}
      <div className="flex items-center px-2 pt-3 pb-1">
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5" />
          ) : (
            <ChevronsLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {/* Home Link */}
        <NavItem
          item={{ name: "Home", href: "/", icon: LayoutDashboard, end: true }}
          sidebarCollapsed={collapsed}
        />

        {/* Divider */}
        <div className="mx-2 my-1 border-t border-gray-200 dark:border-gray-700" />

        {/* Sections */}
        {navigationSections.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
            sidebarCollapsed={collapsed}
            expanded={expandedSections[section.id] ?? true}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </nav>

      {/* Bottom Area: Settings + Version */}
      <div className="border-t border-gray-200 px-2 py-3 dark:border-gray-700">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "group relative flex items-center rounded-lg text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
              isActive
                ? "bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-white"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white",
            )
          }
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
          {collapsed && (
            <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block dark:bg-gray-600">
              Settings
            </div>
          )}
        </NavLink>
        {!collapsed && (
          <p className="mt-2 px-3 text-xs text-gray-400 dark:text-gray-500">
            v{__APP_VERSION__}
          </p>
        )}
      </div>
    </aside>
  );
}
