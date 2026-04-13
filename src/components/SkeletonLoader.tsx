import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';

interface SkeletonLoaderProps {
  children: ReactNode;
  duration?: number;
}

function SkeletonBlock({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton ${className || ''}`} style={style} />;
}

function DashboardSkeleton() {
  return (
    <div className="fade-in space-y-6 p-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-5">
            <SkeletonBlock className="mb-3 h-3 w-20" />
            <SkeletonBlock className="mb-2 h-8 w-32" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-card p-5 lg:col-span-2">
          <SkeletonBlock className="mb-4 h-4 w-40" />
          <SkeletonBlock className="h-64 w-full" />
        </div>
        <div className="glass-card p-5">
          <SkeletonBlock className="mb-4 h-4 w-32" />
          <SkeletonBlock className="mx-auto h-64 w-full rounded-full" style={{ maxWidth: 200 }} />
        </div>
      </div>
      {/* Table */}
      <div className="glass-card p-5">
        <SkeletonBlock className="mb-4 h-4 w-48" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="mb-3 flex gap-4">
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

export function SkeletonLoader({ children, duration = 600 }: SkeletonLoaderProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (loading) {
    return <DashboardSkeleton />;
  }
  return <div className="fade-in">{children}</div>;
}

export function PageSkeleton() {
  return <DashboardSkeleton />;
}
