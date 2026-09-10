import { User, Users } from 'lucide-react';

export type SummaryViewMode = 'group' | 'mine';

interface MyViewToggleProps {
  value: SummaryViewMode;
  onChange: (value: SummaryViewMode) => void;
  className?: string;
}

export const MyViewToggle = ({
  value,
  onChange,
  className = '',
}: MyViewToggleProps) => {
  return (
    <div className={`inline-flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50 text-xs ${className}`}>
      <button
        type="button"
        onClick={() => onChange('group')}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all duration-150 ${
          value === 'group'
            ? 'bg-background text-foreground shadow-sm font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
        }`}
      >
        <Users className="h-3.5 w-3.5" />
        <span>Group View</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('mine')}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all duration-150 ${
          value === 'mine'
            ? 'bg-background text-foreground shadow-sm font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
        }`}
      >
        <User className="h-3.5 w-3.5" />
        <span>My View</span>
      </button>
    </div>
  );
};
