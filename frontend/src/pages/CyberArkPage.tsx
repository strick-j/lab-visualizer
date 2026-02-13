import { useState } from "react";
import { Shield } from "lucide-react";
import { CyberArkTabNavigation } from "@/components/cyberark/CyberArkTabNavigation";
import { SafeList } from "@/components/cyberark/SafeList";
import { RoleList } from "@/components/cyberark/RoleList";
import { SIAPolicyList } from "@/components/cyberark/SIAPolicyList";
import type { CyberArkResourceType } from "@/types";

export function CyberArkPage() {
  const [activeTab, setActiveTab] = useState<CyberArkResourceType>("safes");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            CyberArk Resources
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Identity roles, Privilege Cloud safes, and SIA policies
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <CyberArkTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div>
        {activeTab === "safes" && <SafeList />}
        {activeTab === "roles" && <RoleList />}
        {activeTab === "sia-policies" && <SIAPolicyList />}
      </div>
    </div>
  );
}
