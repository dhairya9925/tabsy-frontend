import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Expense } from '@/hooks/useExpenses';
import { GroupUserSplitItem } from '@/hooks/useDashboardData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { format, parseISO, subMonths, startOfMonth } from 'date-fns';
import { roundMoney } from '@/utils/money';
import { TrendingUp } from 'lucide-react';

interface DashboardTrendChartProps {
  personalExpenses: Expense[];
  groupUserSplits: GroupUserSplitItem[];
  className?: string;
}

export const DashboardTrendChart = ({
  personalExpenses,
  groupUserSplits,
  className = '',
}: DashboardTrendChartProps) => {
  const chartData = useMemo(() => {
    const now = new Date();
    // Build array for last 6 months in chronological order
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(now, 5 - i);
      return {
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM yy'),
        date: startOfMonth(d),
        personal: 0,
        groupShare: 0,
      };
    });

    const monthMap = new Map(months.map((m) => [m.key, m]));

    // Aggregate personal expenses
    personalExpenses.forEach((e) => {
      if (!e.expense_date) return;
      const key = e.expense_date.slice(0, 7);
      const m = monthMap.get(key);
      if (m) {
        m.personal += Number(e.amount);
      }
    });

    // Aggregate group splits
    groupUserSplits.forEach((s) => {
      if (!s.expense_date) return;
      const key = s.expense_date.slice(0, 7);
      const m = monthMap.get(key);
      if (m) {
        m.groupShare += Number(s.amount);
      }
    });

    return months.map((m) => ({
      key: m.key,
      label: m.label,
      personal: roundMoney(m.personal),
      groupShare: roundMoney(m.groupShare),
      total: roundMoney(m.personal + m.groupShare),
    }));
  }, [personalExpenses, groupUserSplits]);

  const hasData = chartData.some((d) => d.total > 0);

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-header flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" /> 6-Month Spending Trend
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personal vs. Group share spend over the last 6 months
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <span className="text-muted-foreground">Personal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
            <span className="text-muted-foreground">Group Share</span>
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="glass-card p-3 text-xs space-y-1.5 border border-border">
                      <p className="font-semibold text-foreground">{label}</p>
                      <div className="space-y-0.5 text-muted-foreground">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-primary inline-block" /> Personal:
                          </span>
                          <span className="font-mono-num font-medium text-foreground">
                            ₹{data.personal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" /> Group Share:
                          </span>
                          <span className="font-mono-num font-medium text-foreground">
                            ₹{data.groupShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50 font-bold text-foreground">
                          <span>Total:</span>
                          <span className="font-mono-num text-primary">
                            ₹{data.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="personal" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="groupShare" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
          No spending recorded in the last 6 months
        </div>
      )}
    </Card>
  );
};
