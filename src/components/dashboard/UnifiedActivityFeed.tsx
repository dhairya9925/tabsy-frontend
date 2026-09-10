import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardActivityItem } from '@/hooks/useDashboardData';
import { getCategoryById } from '@/lib/categories';
import { Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface UnifiedActivityFeedProps {
  activities: DashboardActivityItem[];
  className?: string;
}

export const UnifiedActivityFeed = ({ activities, className = '' }: UnifiedActivityFeedProps) => {
  const topActivities = activities.slice(0, 7);

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="section-header flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-primary" /> Recent Activity
        </p>
        <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground hover:text-foreground" asChild>
          <Link to="/expenses">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      {topActivities.length > 0 ? (
        <div className="flex flex-col gap-3">
          {topActivities.map((item) => {
            const cat = getCategoryById(item.category);
            const CatIcon = cat.icon;
            const isSettlement = item.type === 'settlement';

            let dateLabel = '';
            if (item.date) {
              try {
                dateLabel = format(parseISO(item.date), 'MMM d');
              } catch {
                dateLabel = item.date;
              }
            }

            return (
              <Link
                key={item.id}
                to={item.link}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors border border-transparent hover:border-border/40"
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSettlement ? 'bg-emerald-500/10 text-emerald-500' : cat.color
                  }`}
                >
                  {isSettlement ? <CheckCircle2 className="h-4 w-4" /> : <CatIcon className="h-4 w-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                    <span>{item.subText}</span>
                    {dateLabel && (
                      <>
                        <span>•</span>
                        <span>{dateLabel}</span>
                      </>
                    )}
                  </p>
                </div>

                <p className="font-mono-num text-sm font-bold text-foreground shrink-0">
                  ₹{item.amount.toLocaleString('en-IN')}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No recent activity recorded
        </div>
      )}
    </Card>
  );
};
