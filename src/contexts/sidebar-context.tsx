"use client";

import React, { createContext, useCallback, useContext, useState, useLayoutEffect } from "react";

interface SidebarContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
  conversationsVersion: number;
  bumpConversations: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [conversationsVersion, setConversationsVersion] = useState(0);
  const bumpConversations = useCallback(() => setConversationsVersion((v) => v + 1), []);

  useLayoutEffect(() => {
    const isDesktop = window.innerWidth >= 768;
    setSidebarOpen(isDesktop);
    setIsMobile(!isDesktop);

    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      setSidebarOpen(isDesktop);
      setIsMobile(!isDesktop);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
