import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    console.log('[SidebarContext] Provider rendering, sidebarOpen:', sidebarOpen, 'isMobile:', isMobile);

    // Handle responsive sidebar behavior
    useEffect(() => {
        // Set initial state based on window width
        const isDesktop = window.innerWidth >= 768;
        console.log('[SidebarContext] Initial setup, window.innerWidth:', window.innerWidth, 'isDesktop:', isDesktop);
        setSidebarOpen(isDesktop);
        setIsMobile(!isDesktop);

        const handleResize = () => {
            const isDesktop = window.innerWidth >= 768;
            console.log('[SidebarContext] Resize event, window.innerWidth:', window.innerWidth, 'isDesktop:', isDesktop);
            setSidebarOpen(isDesktop);
            setIsMobile(!isDesktop);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Wrap setSidebarOpen to log when it's called
    const setSidebarOpenWithLogging = (open: boolean) => {
        console.log('[SidebarContext] setSidebarOpen called with:', open, 'current:', sidebarOpen);
        setSidebarOpen(open);
    };

    return (
        <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen: setSidebarOpenWithLogging, isMobile }}>
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
