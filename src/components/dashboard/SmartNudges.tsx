import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DashboardData } from '@/hooks/useDashboardData';
import { AlertCircle, Clock, TrendingUp, X, Sparkles } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';

interface SmartNudgesProps {
  dashboardData: DashboardData;
  onQuickAdd?: () => void;
  className?: string;
}

interface Nudge {
  id: string;
  type: 'debt' | 'inactivity' | 'pace';
  title: string;
  message: string;
  actionLabel: string;
  actionLink?: string;
  actionFn?: () => void;
  icon: typeof AlertCircle;
  style: string;
}

export const SmartNudges = ({
  dashboardData,
  onQuickAdd,
  className = '',
}: SmartNudgesProps) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const nudges = useMemo(() => {
    const list: Nudge[] = [];
    const now = new Date();

    // 1. High Debt Alert Nudge
    if (dashboardData.netOwes > 1000) {
      list.push({
        id: 'high-debt',
        type: 'debt',
        title: 'Pending Debt Alert',
        message: `You owe ₹${dashboardData.netOwes.toLocaleString('en-IN')} total across your groups and friends.`,
        actionLabel: 'Settle Up',
        actionLink: '/groups',
        icon: AlertCircle,
        style: 'border-rose-500/40 bg-rose-500/10 text-rose-500',
      });
    }

    // 2. Inactivity Nudge
    let isInactive = false;
    if (dashboardData.lastExpenseDate) {
      try {
        const days = differenceInDays(now, parseISO(dashboardData.lastExpenseDate));
        if (days >= 5) isInactive = true;
      } catch {
        isInactive = false;
      }
    } else {
      isInactive = true;
    }

    if (isInactive) {
      list.push({
        id: 'inactivity',
        type: 'inactivity',
        title: 'Keep Tracking',
        message: 'No expenses logged in over 5 days — forgot to log recent spending?',
        actionLabel: '+ Quick Add',
        actionFn: onQuickAdd,
        icon: Clock,
        style: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
      });
    }

    // 3. High Spending Pace Nudge
    if (dashboardData.monthOverMonthPct !== null && dashboardData.monthOverMonthPct >= 25) {
      list.push({
        id: 'high-pace',
        type: 'pace',
        title: 'Spending Pace Warning',
        message: `Your spending this month is ${dashboardData.monthOverMonthPct}% higher than last month.`,
        actionLabel: 'Review',
        actionLink: '/expenses',
        icon: TrendingUp,
        style: 'border-blue-500/40 bg-blue-500/10 text-blue-500',
      });
    }

    return list;
  }, [dashboardData, onQuickAdd]);

  const activeNudges = nudges
    .filter((n) => !dismissedIds.has(n.id))
    .slice(0, 2);

  if (!activeNudges.length) return null;

  const dismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {activeNudges.map((nudge) => {
        const IconComponent = nudge.icon;
        return (
          <div
            key={nudge.id}
            className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border backdrop-blur-sm transition-all shadow-sm ${nudge.style}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-background/50 shrink-0">
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-90 truncate">
                  {nudge.title}
                </p>
                <p className="text-xs font-medium text-foreground/90 truncate mt-0.5">
                  {nudge.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {nudge.actionLink ? (
                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 bg-background/80" asChild>
                  <Link to={nudge.actionLink}>{nudge.actionLabel}</Link>
                </Button>
              ) : nudge.actionFn ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nudge.actionFn}
                  className="h-7 text-xs px-2.5 bg-background/80"
                >
                  {nudge.actionLabel}
                </Button>
              ) : null}

              <button
                type="button"
                onClick={() => dismiss(nudge.id)}
                className="text-foreground/60 hover:text-foreground p-1 rounded-md hover:bg-background/40 transition-colors"
                aria-label="Dismiss nudge"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
