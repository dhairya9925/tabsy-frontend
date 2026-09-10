import { Card } from '@/components/ui/card';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export interface SummaryStatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number; // percentage or change value
    label?: string; // e.g. "vs last period"
    isPositiveGood?: boolean; // default true
  };
  className?: string;
}

export const SummaryStatCard = ({
  label,
  value,
  subLabel,
  icon: Icon,
  iconColor = 'text-primary bg-primary/10',
  trend,
  className = '',
}: SummaryStatCardProps) => {
  const isPositive = trend ? trend.value >= 0 : true;
  const isGood = trend?.isPositiveGood !== undefined 
    ? (isPositive ? trend.isPositiveGood : !trend.isPositiveGood)
    : isPositive;

  return (
    <Card className={`p-4 transition-all duration-200 hover:shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {label}
          </p>
          <div className="text-2xl font-bold text-foreground tracking-tight truncate">
            {typeof value === 'number' ? `₹${value.toFixed(2)}` : value}
          </div>
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-xl shrink-0 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {(subLabel || trend) && (
        <div className="mt-2 pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
          {subLabel && (
            <span className="text-muted-foreground truncate">{subLabel}</span>
          )}
          {trend && (
            <div className={`inline-flex items-center gap-1 font-semibold ml-auto ${
              isGood ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && (
                <span className="font-normal text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
