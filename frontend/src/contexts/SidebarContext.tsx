import React, { createContext, useContext, useEffect, useState } from "react";

interface SidebarContextType {
  collapsed: boolean;
  toggleCollapsed: () => void;
  expandedSections: Record<string, boolean>;
  toggleSection: (sectionId: string) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const COLLAPSED_STORAGE_KEY = "lab-visualizer-sidebar-collapsed";
const SECTIONS_STORAGE_KEY = "lab-visualizer-sidebar-sections";

const DEFAULT_SECTIONS: Record<string, boolean> = {
  aws: true,
  cyberark: true,
  iac: true,
};

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    return stored === "true";
  });

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >(() => {
    const stored = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_SECTIONS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_SECTIONS;
      }
    }
    return DEFAULT_SECTIONS;
  });

  useEffect(() => {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem(
      SECTIONS_STORAGE_KEY,
      JSON.stringify(expandedSections),
    );
  }, [expandedSections]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  return (
    <SidebarContext.Provider
      value={{ collapsed, toggleCollapsed, expandedSections, toggleSection }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
