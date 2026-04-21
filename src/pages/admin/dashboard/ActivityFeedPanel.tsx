import { useEffect, useState, useTransition } from 'react';
import { fetchRecentActivities, type ActivityItem } from '@/lib/api';

interface ActivityFeedPanelProps {
  apiBase?: string;
}

export function ActivityFeedPanel({ apiBase }: ActivityFeedPanelProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!apiBase) {
      startTransition(() => setActivities([]));
      return;
    }
    startTransition(() => setLoading(true));
    fetchRecentActivities(apiBase)
      .then((data) => startTransition(() => setActivities(data.activities.slice(0, 6))))
      .catch(() => startTransition(() => setActivities([])))
      .finally(() => startTransition(() => setLoading(false)));
  }, [apiBase]);

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold">Actividad reciente</h3>
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-[var(--sidebar-fg)]">Cargando...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-[var(--sidebar-fg)]">Sin actividad reciente.</p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--hover-bg)] p-3"
            >
              <div>
                <p className="text-sm font-semibold">{activity.action}</p>
                {activity.details ? (
                  <p className="text-xs text-[var(--sidebar-fg)]">{activity.details}</p>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-[var(--sidebar-fg)]">
                  {new Date(activity.created_at).toLocaleString('es-CL')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
