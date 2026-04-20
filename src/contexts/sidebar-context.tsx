"use client";

import React, { createContext, useCallback, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
  conversationsVersion: number;
  bumpConversations: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const SIDEBAR_PREF_KEY = "sidebar_open";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpenState] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [conversationsVersion, setConversationsVersion] = useState(0);
  const bumpConversations = useCallback(() => setConversationsVersion((v) => v + 1), []);

  // Persist user-initiated sidebar changes
  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open);
    try {
      localStorage.setItem(SIDEBAR_PREF_KEY, String(open));
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);

    // Restore persisted preference, fall back to device-based default
    try {
      const stored = localStorage.getItem(SIDEBAR_PREF_KEY);
      setSidebarOpenState(stored !== null ? stored === "true" : !mobile);
    } catch {
      setSidebarOpenState(!mobile);
    }

    const handleResize = () => {
      const nowMobile = window.innerWidth < 768;
      setIsMobile(nowMobile);
      // On device-type boundary change, reset to appropriate default
      const wasMobile = isMobile;
      if (wasMobile !== nowMobile) {
        setSidebarOpenState(!nowMobile);
        try {
          localStorage.setItem(SIDEBAR_PREF_KEY, String(!nowMobile));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen, isMobile, conversationsVersion, bumpConversations }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
