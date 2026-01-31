import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Database,
  Network,
  GitBranch,
  Waypoints,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Topology', href: '/topology', icon: Waypoints },
  { name: 'EC2 Instances', href: '/ec2', icon: Server },
  { name: 'RDS Databases', href: '/rds', icon: Database },
  { name: 'VPC Networking', href: '/vpc', icon: Network },
  { name: 'Terraform', href: '/terraform', icon: GitBranch },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-[var(--header-height)] z-10 h-[calc(100vh-var(--header-height))] w-64 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4 dark:border-gray-700">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
            )
          }
        >
          <Settings className="h-5 w-5" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
