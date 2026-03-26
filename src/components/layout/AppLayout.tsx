import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { GatewayStatus } from '@/components/GatewayStatus';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useState } from 'react';

export function AppLayout() {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[var(--bg)] flex">
            {/* Sidebar natively occupies width on desktop because it is sticky */}
            <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            
            {/* Main content flex-1 takes remainder, min-w-0 prevents chart clipping/overflow */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300">
                <Navbar onMenuClick={() => setMobileOpen(true)} />
                
                <main className="flex-1 w-full overflow-x-hidden">
                    <div className="w-full max-w-[1600px] mx-auto">
                        <SkeletonLoader key={location.pathname}>
                            <Outlet />
                        </SkeletonLoader>
                    </div>
                </main>
            </div>
            
            <GatewayStatus />
        </div>
    );
}
