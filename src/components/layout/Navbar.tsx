import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, Building2, ChevronDown, Menu } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { NotificationDrawer } from '@/components/NotificationDrawer';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavbarProps {
    onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = location.pathname.startsWith('/admin');
    const [mallOpen, setMallOpen] = useState(false);

    const handleRoleToggle = () => {
        if (isAdmin) {
            navigate('/locatario/dashboard');
        } else {
            navigate('/admin/dashboard');
        }
    };

    return (
        <nav
            className="sticky top-0 z-40 h-16 flex items-center justify-between px-4 md:px-8 border-b border-[var(--border-color)]"
            style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(12px)' }}
        >
            {/* Left: Mobile Menu + Mall selector */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    title="Menú"
                    className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Mall selector */}
                <div className="relative">
                    <button
                        onClick={() => setMallOpen(!mallOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 -ml-3 md:ml-0 rounded-lg text-sm font-medium hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                    >
                        <Building2 className="w-4 h-4 text-[var(--sidebar-fg)] hidden md:block" />
                        <span className="hidden sm:inline text-[var(--sidebar-fg)]">Mall:</span>
                        <span>Patio Outlet Maipú</span>
                        <ChevronDown className="w-3.5 h-3.5 text-[var(--sidebar-fg)]" />
                    </button>
                    {mallOpen && (
                        <div
                            className="absolute top-full left-0 mt-1 w-56 glass-card py-1.5 scale-in"
                            onMouseLeave={() => setMallOpen(false)}
                        >
                            {['Patio Outlet Maipú', 'Patio Quilicura', 'Outlet La Fábrica'].map(mall => (
                                <button
                                    key={mall}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                                    onClick={() => setMallOpen(false)}
                                >
                                    {mall}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
                {/* Role Toggle */}
                <div className="flex items-center rounded-full p-0.5" style={{ background: 'var(--hover-bg)' }}>
                    <button
                        onClick={() => { if (!isAdmin) handleRoleToggle(); }}
                        className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer',
                            isAdmin
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-[var(--sidebar-fg)] hover:text-[var(--fg)]'
                        )}
                    >
                        Admin
                    </button>
                    <button
                        onClick={() => { if (isAdmin) handleRoleToggle(); }}
                        className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer',
                            !isAdmin
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-[var(--sidebar-fg)] hover:text-[var(--fg)]'
                        )}
                    >
                        Locatario
                    </button>
                </div>

                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                    title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                >
                    {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                </button>

                {/* Notifications */}
                <NotificationDrawer />
            </div>
        </nav>
    );
}
