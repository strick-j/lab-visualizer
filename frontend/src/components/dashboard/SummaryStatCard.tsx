import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/common";

interface SummaryStatCardProps {
  title: string;
  icon: React.ReactNode;
  value: number | string;
  subtitle?: string;
  href?: string;
  linkText?: string;
  loading?: boolean;
}

export function SummaryStatCard({
  title,
  icon,
  value,
  subtitle,
  href,
  linkText = "View details",
  loading = false,
}: SummaryStatCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {title}
              </p>
              {loading ? (
                <div className="mt-1 h-7 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {value}
                </p>
              )}
            </div>
          </div>
        </div>
        {subtitle && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
        {href && (
          <Link
            to={href}
            className="mt-3 block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {linkText} →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
