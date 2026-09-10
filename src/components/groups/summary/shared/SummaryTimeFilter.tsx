import { Calendar } from 'lucide-react';

export type TimeRangeOption = '30d' | '3m' | '6m' | '1y' | 'all';

interface SummaryTimeFilterProps {
  value: TimeRangeOption;
  onChange: (value: TimeRangeOption) => void;
  className?: string;
}

const OPTIONS: { id: TimeRangeOption; label: string }[] = [
  { id: '30d', label: '30D' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' },
];

export const SummaryTimeFilter = ({
  value,
  onChange,
  className = '',
}: SummaryTimeFilterProps) => {
  return (
    <div className={`inline-flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50 text-xs ${className}`}>
      <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-0.5 shrink-0 hidden sm:block" />
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-2.5 py-1 rounded-md font-medium transition-all duration-150 ${
            value === opt.id
              ? 'bg-background text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
