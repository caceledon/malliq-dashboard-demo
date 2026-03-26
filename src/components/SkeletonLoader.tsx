import { useState, useEffect, type ReactNode } from 'react';

interface SkeletonLoaderProps {
    children: ReactNode;
    duration?: number;
}

function SkeletonBlock({ className }: { className?: string }) {
    return <div className={`skeleton ${className || ''}`} />;
}

function DashboardSkeleton() {
    return (
        <div className="fade-in p-6 space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="glass-card p-5">
                        <SkeletonBlock className="h-3 w-20 mb-3" />
                        <SkeletonBlock className="h-8 w-32 mb-2" />
                        <SkeletonBlock className="h-3 w-24" />
                    </div>
                ))}
            </div>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 glass-card p-5">
                    <SkeletonBlock className="h-4 w-40 mb-4" />
                    <SkeletonBlock className="h-64 w-full" />
                </div>
                <div className="glass-card p-5">
                    <SkeletonBlock className="h-4 w-32 mb-4" />
                    <SkeletonBlock className="h-64 w-full rounded-full mx-auto" style={{ maxWidth: 200 }} />
                </div>
            </div>
            {/* Table */}
            <div className="glass-card p-5">
                <SkeletonBlock className="h-4 w-48 mb-4" />
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-4 mb-3">
                        <SkeletonBlock className="h-4 w-24" />
                        <SkeletonBlock className="h-4 w-32" />
                        <SkeletonBlock className="h-4 w-20" />
                        <SkeletonBlock className="h-4 w-28" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonLoader({ children, duration = 800 }: SkeletonLoaderProps) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => setLoading(false), duration);
        return () => clearTimeout(timer);
    }, [duration]);

    if (loading) return <DashboardSkeleton />;
    return <div className="fade-in">{children}</div>;
}

export function PageSkeleton() {
    return <DashboardSkeleton />;
}
