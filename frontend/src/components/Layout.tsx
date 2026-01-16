import { LayoutGrid, LogOut, Mail } from "lucide-react";
import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { ModeToggle } from "@/components/mode-toggle.tsx";
import { mockAuthAPI as authAPI } from "@/services/mockAuth.ts";
import { logout } from "@/store/authSlice.ts";

import { Button } from "./ui/button";

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    const isKanbanMode = location.pathname === "/kanban";
    const toggleKanbanMode = () => {
        if (isKanbanMode) {
            navigate("/dashboard");
        } else {
            navigate("/kanban");
        }
    };
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            authAPI.getMe().catch(() => {
                localStorage.removeItem("token");
                window.location.href = "/login";
            });
        }
    }, []);

    return (
        <>
            <header className="bg-sidebar flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
                <div className="flex w-full justify-between items-center px-2 sm:px-4 gap-2">
                    <h2 className="font-semibold text-base sm:text-xl md:text-2xl truncate flex-shrink min-w-0">
                        {isKanbanMode ? (
                            <>
                                <span className="hidden sm:inline">Email Kanban Board</span>
                                <span className="sm:hidden">Kanban</span>
                            </>
                        ) : (
                            "Mailboxes"
                        )}
                    </h2>
                    <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleKanbanMode}
                            className="cursor-pointer h-9"
                        >
                            {isKanbanMode ? (
                                <>
                                    <Mail className="size-4" />
                                    <span className="hidden md:inline ml-2">List View</span>
                                </>
                            ) : (
                                <>
                                    <LayoutGrid className="size-4" />
                                    <span className="hidden md:inline ml-2">Kanban View</span>
                                </>
                            )}
                        </Button>
                        <ModeToggle />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogout}
                            className="cursor-pointer h-9"
                        >
                            <LogOut className="size-4" />
                            <span className="hidden md:inline ml-2">Logout</span>
                        </Button>
                    </div>
                </div>
            </header>
            <main className="flex-1 flex flex-col bg-sidebar">
                <div className="flex-1 overflow-auto">{children}</div>
            </main>
        </>
    );
};

export default Layout;
