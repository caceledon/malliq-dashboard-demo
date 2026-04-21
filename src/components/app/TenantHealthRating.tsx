import { Star } from 'lucide-react';

interface TenantHealthRatingProps {
  score: number;
  interactive?: boolean;
  onChange?: (score: number) => void;
  className?: string;
}

export function TenantHealthRating({ score, interactive, onChange, className }: TenantHealthRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      {stars.map((star) => {
        const filled = star <= score;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => {
              if (interactive && onChange) {
                onChange(star);
              }
            }}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Star
              className={`h-5 w-5 ${filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
