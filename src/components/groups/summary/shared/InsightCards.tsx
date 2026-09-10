import { Insight } from '@/hooks/useInsightEngine';
import { Card } from '@/components/ui/card';
import { Sparkles, TrendingUp, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface InsightCardsProps {
  insights: Insight[];
  className?: string;
}

export const InsightCards = ({ insights, className = '' }: InsightCardsProps) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-1.5 px-1">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
          Smart Group Insights
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {insights.map((item) => {
          let borderColor = 'border-border/60 bg-card';
          let iconColor = 'text-primary bg-primary/10';
          let IconComponent = Info;

          if (item.type === 'warning') {
            borderColor = 'border-amber-500/30 bg-amber-500/5';
            iconColor = 'text-amber-500 bg-amber-500/10';
            IconComponent = AlertCircle;
          } else if (item.type === 'success') {
            borderColor = 'border-emerald-500/30 bg-emerald-500/5';
            iconColor = 'text-emerald-500 bg-emerald-500/10';
            IconComponent = CheckCircle2;
          } else if (item.type === 'highlight') {
            borderColor = 'border-purple-500/30 bg-purple-500/5';
            iconColor = 'text-purple-500 bg-purple-500/10';
            IconComponent = Sparkles;
          }

          return (
            <Card key={item.id} className={`p-3 transition-all duration-200 hover:shadow-sm ${borderColor}`}>
              <div className="flex items-start gap-2.5">
                <div className={`p-2 rounded-lg shrink-0 ${iconColor}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground truncate">{item.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
