import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GroupExpense, Balance } from '@/hooks/useGroupExpenses';
import { GroupMember, Group } from '@/hooks/useGroups';
import { getCategoryById } from '@/lib/categories';
import { sumMoney, roundMoney } from '@/utils/money';
import { SummaryTimeFilter, TimeRangeOption } from './shared/SummaryTimeFilter';
import { MyViewToggle, SummaryViewMode } from './shared/MyViewToggle';
import { SummaryStatCard } from './shared/SummaryStatCard';
import { MonthlyTrendChart } from './shared/MonthlyTrendChart';
import { Coffee, User, Calendar, Flame, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, subMonths, subDays, differenceInDays } from 'date-fns';

interface DayToDaySummaryProps {
  expenses: GroupExpense[];
  balances?: Balance[];
  members?: GroupMember[];
  group?: Group;
  currentUserId?: string;
  loading: boolean;
}

const CHART_COLORS = [
  'hsl(38, 92%, 50%)',
  'hsl(217, 91%, 60%)',
  'hsl(160, 84%, 39%)',
  'hsl(0, 72%, 51%)',
  'hsl(280, 65%, 60%)',
  'hsl(190, 80%, 45%)',
];

export const DayToDaySummary = ({
  expenses,
  balances = [],
  members = [],
  group,
  currentUserId,
  loading,
}: DayToDaySummaryProps) => {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [viewMode, setViewMode] = useState<SummaryViewMode>('group');

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    const valid = expenses.filter((e) => e.category !== 'system');
    if (!valid.length) return [];

    const now = new Date();
    let cutoff: Date | null = null;
    if (timeRange === '30d') cutoff = subDays(now, 30);
    else if (timeRange === '3m') cutoff = subMonths(now, 3);
    else if (timeRange === '6m') cutoff = subMonths(now, 6);
    else if (timeRange === '1y') cutoff = subMonths(now, 12);

    const timeFiltered = cutoff
      ? valid.filter((e) => new Date(e.expense_date) >= cutoff!)
      : valid;

    if (viewMode === 'mine' && currentUserId) {
      return timeFiltered.filter((e) => {
        const isPayer = (e.paid_by || e.user_id) === currentUserId;
        const isSplitMember = e.splits?.some((s) => s.user_id === currentUserId);
        return isPayer || isSplitMember;
      });
    }

    return timeFiltered;
  }, [expenses, timeRange, viewMode, currentUserId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalSpent = sumMoney(filteredExpenses.map((e) => e.amount));
  const expenseCount = filteredExpenses.length;
  const avgSession = expenseCount > 0 ? roundMoney(totalSpent / expenseCount) : 0;

  // Most Frequent Payer (by transaction count)
  const payerCountMap = new Map<string, { name: string; count: number; totalPaid: number }>();
  filteredExpenses.forEach((e) => {
    const uid = e.paid_by || e.user_id;
    const name = e.payer_name || 'Unknown';

    const existing = payerCountMap.get(uid) || { name, count: 0, totalPaid: 0 };
    existing.count += 1;
    existing.totalPaid += e.amount;
    payerCountMap.set(uid, existing);
  });

  const sortedPayers = Array.from(payerCountMap.values()).sort((a, b) => b.count - a.count);
  const topFrequentPayer = sortedPayers[0] || { name: 'N/A', count: 0, totalPaid: 0 };

  // Last Activity Cadence
  const lastExpenseDate = filteredExpenses.length > 0
    ? parseISO(filteredExpenses[0].expense_date)
    : null;
  const daysAgo = lastExpenseDate ? differenceInDays(new Date(), lastExpenseDate) : null;
  const daysAgoText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : daysAgo !== null ? `${daysAgo} days ago` : 'No activity';

  // Top 3 Largest Single Expenses
  const top3Spends = [...filteredExpenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // Category breakdown
  const categoryTotals = new Map<string, number>();
  filteredExpenses.forEach((e) => {
    const label = getCategoryById(e.category).label;
    categoryTotals.set(label, (categoryTotals.get(label) || 0) + e.amount);
  });
  const categoryData = Array.from(categoryTotals.entries())
    .map(([name, value]) => ({
      name,
      value: roundMoney(value),
      percentage: totalSpent > 0 ? roundMoney((value / totalSpent) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card p-2 rounded-xl border border-border/60 shadow-sm">
        <MyViewToggle value={viewMode} onChange={setViewMode} />
        <SummaryTimeFilter value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Hero Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryStatCard
          label="Avg Per Outing / Session"
          value={avgSession}
          subLabel={`Across ${expenseCount} recorded outing(s)`}
          icon={Coffee}
          iconColor="text-amber-500 bg-amber-500/10"
        />
        <SummaryStatCard
          label="Most Frequent Payer"
          value={topFrequentPayer.name}
          subLabel={`Initiated ${topFrequentPayer.count} payment(s)`}
          icon={User}
          iconColor="text-blue-500 bg-blue-500/10"
        />
        <SummaryStatCard
          label="Group Cadence"
          value={daysAgoText}
          subLabel={`Total spend: ₹${totalSpent.toFixed(2)}`}
          icon={Calendar}
          iconColor="text-emerald-500 bg-emerald-500/10"
        />
      </div>

      {/* Top 3 Spends Highlight Section */}
      {top3Spends.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-amber-500" /> Top 3 Most Expensive Sessions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {top3Spends.map((item, idx) => (
              <div key={item.id} className="p-2.5 rounded-lg border border-border/40 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground truncate">{item.note || getCategoryById(item.category).label}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">#{idx + 1}</Badge>
                </div>
                <p className="text-base font-bold text-foreground">₹{item.amount.toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Paid by {item.payer_name} on {format(parseISO(item.expense_date), 'MMM d')}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Monthly Trend Chart */}
      <MonthlyTrendChart
        expenses={expenses}
        timeRange={timeRange}
        viewMode={viewMode}
        currentUserId={currentUserId}
      />

      {/* Category breakdown */}
      <Card className="p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <PieIcon className="h-4 w-4 text-amber-500" /> Day-to-Day Category Distribution
          </h3>
          <p className="text-xs text-muted-foreground">Coffee, Food, Drinks, Transport & Shopping</p>
        </div>
        {categoryData.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={160} className="max-w-[160px]">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={38}
                  strokeWidth={0}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--card-foreground))',
                    fontSize: 12,
                  }}
                  formatter={(val: number) => [`₹${val.toFixed(2)}`]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 w-full">
              {categoryData.slice(0, 6).map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate flex-1">{cat.name}</span>
                  <span className="text-muted-foreground font-normal text-[11px]">{cat.percentage}%</span>
                  <span className="text-foreground font-semibold">₹{cat.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">No category data available.</p>
        )}
      </Card>
    </div>
  );
};
