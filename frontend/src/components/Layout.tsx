import React, { useEffect } from 'react';
import { mockAuthAPI as authAPI } from "@/services/mockAuth.ts";
import { ModeToggle } from "@/components/mode-toggle.tsx";
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from "@/store/authSlice.ts";
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const handleLogout = () => {
        dispatch(logout())
        navigate('/login')
    }

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
        <>
            <header className="bg-sidebar flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
                <div className="flex w-full justify-between px-4">
                    <h2 className="font-semibold text-2xl">Mailboxes</h2>
                    <div className="flex items-center gap-4">
                        <ModeToggle />
                        <Button variant="outline" onClick={handleLogout} className='cursor-pointer'>
                            <LogOut className="size-4" />
                            <span>Logout</span>
                        </Button>
                    </div>
                </div>
            </header>
            <main className="flex-1 flex flex-col bg-sidebar">
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </>
    );
};

export default Layout;