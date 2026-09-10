import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { GroupExpense } from '@/hooks/useGroupExpenses';
import { TimeRangeOption } from './SummaryTimeFilter';
import { SummaryViewMode } from './MyViewToggle';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { format, parseISO, subMonths, subDays, startOfMonth } from 'date-fns';
import { roundMoney } from '@/utils/money';

interface MonthlyTrendChartProps {
  expenses: GroupExpense[];
  timeRange: TimeRangeOption;
  viewMode?: SummaryViewMode;
  currentUserId?: string;
  className?: string;
}

export const MonthlyTrendChart = ({
  expenses,
  timeRange,
  viewMode = 'group',
  currentUserId,
  className = '',
}: MonthlyTrendChartProps) => {
  const chartData = useMemo(() => {
    const validExpenses = expenses.filter((e) => e.category !== 'system');
    if (!validExpenses.length) return [];

    const now = new Date();

    // Determine date cutoff based on timeRange
    let cutoffDate: Date | null = null;
    if (timeRange === '30d') cutoffDate = subDays(now, 30);
    else if (timeRange === '3m') cutoffDate = subMonths(now, 3);
    else if (timeRange === '6m') cutoffDate = subMonths(now, 6);
    else if (timeRange === '1y') cutoffDate = subMonths(now, 12);

    const filtered = cutoffDate
      ? validExpenses.filter((e) => new Date(e.expense_date) >= cutoffDate!)
      : validExpenses;

    // Further filter if viewMode === 'mine'
    const finalExpenses =
      viewMode === 'mine' && currentUserId
        ? filtered.filter((e) => {
            const isPayer = (e.paid_by || e.user_id) === currentUserId;
            const isSplitMember = e.splits?.some((s) => s.user_id === currentUserId);
            return isPayer || isSplitMember;
          })
        : filtered;

    // Group by Month ("MMM yyyy" -> sorted chronologically)
    const monthMap = new Map<string, { monthKey: string; label: string; date: Date; total: number; count: number }>();

    finalExpenses.forEach((e) => {
      const dateObj = parseISO(e.expense_date);
      const monthKey = format(dateObj, 'yyyy-MM');
      const label = format(dateObj, 'MMM yy');

      let amountToAdd = e.amount;
      if (viewMode === 'mine' && currentUserId) {
        // If user paid, count what they paid. Or count their split amount.
        const isPayer = (e.paid_by || e.user_id) === currentUserId;
        if (isPayer) {
          amountToAdd = e.amount;
        } else {
          const userSplit = e.splits?.find((s) => s.user_id === currentUserId);
          amountToAdd = userSplit ? userSplit.amount : 0;
        }
      }

      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.total += amountToAdd;
        existing.count += 1;
      } else {
        monthMap.set(monthKey, {
          monthKey,
          label,
          date: startOfMonth(dateObj),
          total: amountToAdd,
          count: 1,
        });
      }
    });

    const result = Array.from(monthMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => ({
        label: item.label,
        total: roundMoney(item.total),
        count: item.count,
      }));

    return result;
  }, [expenses, timeRange, viewMode, currentUserId]);

  if (!chartData.length) {
    return (
      <Card className={`p-6 text-center text-muted-foreground ${className}`}>
        <p className="text-sm font-medium">No trend data for the selected period.</p>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Spending Trend</h3>
          <p className="text-xs text-muted-foreground">
            {viewMode === 'mine' ? 'Your monthly spending' : 'Group total spending per month'}
          </p>
        </div>
      </div>

      <div className="w-full h-52">
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
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--card-foreground))',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(val: number) => [`₹${val.toFixed(2)}`, 'Spent']}
              labelStyle={{ fontWeight: 'bold', color: 'hsl(var(--foreground))' }}
            />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    index === chartData.length - 1
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--primary) / 0.65)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
