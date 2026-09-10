import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Expense } from '@/hooks/useExpenses';
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
import { format, parseISO, subMonths, startOfMonth } from 'date-fns';
import { roundMoney } from '@/utils/money';
import { Calendar } from 'lucide-react';

interface PersonalMonthlyTrendChartProps {
  expenses: Expense[];
  selectedYear?: string;
  selectedMonth?: string;
  onSelectMonth?: (monthKey: string, yearKey: string) => void;
  className?: string;
}

export const PersonalMonthlyTrendChart = ({
  expenses,
  selectedYear,
  selectedMonth,
  onSelectMonth,
  className = '',
}: PersonalMonthlyTrendChartProps) => {
  const chartData = useMemo(() => {
    if (!expenses.length) return [];

    const now = new Date();
    // Default: show last 12 months
    const cutoffDate = subMonths(now, 11);

    // Group expenses by YYYY-MM
    const monthMap = new Map<string, { year: string; month: string; label: string; date: Date; total: number; count: number }>();

    expenses.forEach((e) => {
      if (!e.expense_date) return;
      const dateObj = parseISO(e.expense_date);
      if (dateObj < startOfMonth(cutoffDate)) return;

      const year = format(dateObj, 'yyyy');
      const month = format(dateObj, 'MM');
      const key = `${year}-${month}`;
      const label = format(dateObj, 'MMM yy');

      const existing = monthMap.get(key);
      if (existing) {
        existing.total += Number(e.amount);
        existing.count += 1;
      } else {
        monthMap.set(key, {
          year,
          month,
          label,
          date: startOfMonth(dateObj),
          total: Number(e.amount),
          count: 1,
        });
      }
    });

    return Array.from(monthMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => ({
        key: `${item.year}-${item.month}`,
        year: item.year,
        month: item.month,
        label: item.label,
        total: roundMoney(item.total),
        count: item.count,
      }));
  }, [expenses]);

  const activeKey = selectedYear && selectedMonth && selectedYear !== 'all' && selectedMonth !== 'all'
    ? `${selectedYear}-${selectedMonth}`
    : null;

  if (!chartData.length) {
    return null;
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" /> Monthly Spending Trend
          </h3>
          <p className="text-xs text-muted-foreground">
            Personal spend over the last 12 months (click a bar to filter)
          </p>
        </div>
      </div>

      <div className="w-full h-44">
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
                borderRadius: 8,
                color: 'hsl(var(--card-foreground))',
                fontSize: 12,
              }}
              formatter={(val: number) => [`₹${val.toFixed(2)}`, 'Personal Spend']}
              labelStyle={{ fontWeight: 'bold', color: 'hsl(var(--foreground))' }}
            />
            <Bar
              dataKey="total"
              radius={[6, 6, 0, 0]}
              className="cursor-pointer"
              onClick={(data) => {
                if (data && data.month && data.year && onSelectMonth) {
                  onSelectMonth(data.month, data.year);
                }
              }}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={
                    activeKey === entry.key
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--primary) / 0.6)'
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
