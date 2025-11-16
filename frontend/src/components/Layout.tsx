import React, { useEffect } from 'react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './app-sidebar.tsx';
import { Separator } from "@/components/ui/separator"
import { mockAuthAPI as authAPI } from "@/services/mockAuth.ts";
import { ModeToggle } from "@/components/mode-toggle.tsx";

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) {
            authAPI.getMe().catch(() => {
                localStorage.removeItem('token')
                window.location.href = '/login'
            })
        }
    }, [])

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="bg-sidebar flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
                    <div className="flex w-full justify-between px-4">
                        <div className={"flex items-center gap-2"}>
                            <SidebarTrigger className="-ml-1" />
                            <Separator
                                orientation="vertical"
                                className="mr-2 data-[orientation=vertical]:h-4"
                            />
                        </div>
                        <ModeToggle />
                    </div>
                </header>
                <main className="flex-1 flex flex-col bg-sidebar">
                    <div className="flex-1 overflow-auto">
                        {children}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default Layout;