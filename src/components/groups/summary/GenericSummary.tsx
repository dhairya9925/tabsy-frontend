import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { GroupExpense, Balance } from '@/hooks/useGroupExpenses';
import { GroupMember, Group } from '@/hooks/useGroups';
import { getCategoryById } from '@/lib/categories';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { sumMoney, roundMoney } from '@/utils/money';
import { SummaryTimeFilter, TimeRangeOption } from './shared/SummaryTimeFilter';
import { MyViewToggle, SummaryViewMode } from './shared/MyViewToggle';
import { SummaryStatCard } from './shared/SummaryStatCard';
import { MonthlyTrendChart } from './shared/MonthlyTrendChart';
import { Wallet, CreditCard, Receipt, PieChart as PieIcon } from 'lucide-react';
import { subMonths, subDays } from 'date-fns';

interface GenericSummaryProps {
  expenses: GroupExpense[];
  balances?: Balance[];
  members?: GroupMember[];
  group?: Group;
  currentUserId?: string;
  loading: boolean;
}

const CHART_COLORS = [
  'hsl(160, 84%, 39%)',
  'hsl(217, 91%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(280, 65%, 60%)',
  'hsl(190, 80%, 45%)',
  'hsl(330, 70%, 55%)',
  'hsl(50, 85%, 55%)',
];

export const GenericSummary = ({
  expenses,
  balances = [],
  members = [],
  group,
  currentUserId,
  loading,
}: GenericSummaryProps) => {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [viewMode, setViewMode] = useState<SummaryViewMode>('group');

  // Filter expenses by timeRange and viewMode
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

  if (!expenses.filter((e) => e.category !== 'system').length) {
    return (
      <Card className="flex flex-col items-center py-10 text-center">
        <p className="text-sm text-muted-foreground">No expenses yet to summarize.</p>
      </Card>
    );
  }

  // Calculate Key Stats
  const totalSpent = sumMoney(filteredExpenses.map((e) => e.amount));
  const expenseCount = filteredExpenses.length;
  const avgExpense = expenseCount > 0 ? roundMoney(totalSpent / expenseCount) : 0;

  // Personal metrics if in My View
  let myPaidTotal = 0;
  let myShareTotal = 0;
  if (currentUserId) {
    filteredExpenses.forEach((e) => {
      if ((e.paid_by || e.user_id) === currentUserId) {
        myPaidTotal += e.amount;
      }
      const mySplit = e.splits?.find((s) => s.user_id === currentUserId);
      if (mySplit) {
        myShareTotal += mySplit.amount;
      }
    });
  }

  // Member contributions
  const memberTotals = new Map<string, number>();
  filteredExpenses.forEach((e) => {
    const name = e.payer_name || 'Unknown';
    memberTotals.set(name, (memberTotals.get(name) || 0) + e.amount);
  });
  const memberData = Array.from(memberTotals.entries())
    .map(([name, amount]) => ({ name, amount: roundMoney(amount) }))
    .sort((a, b) => b.amount - a.amount);

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
      {/* Controls Bar: View Toggle & Time Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card p-2 rounded-xl border border-border/60 shadow-sm">
        <MyViewToggle value={viewMode} onChange={setViewMode} />
        <SummaryTimeFilter value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryStatCard
          label={viewMode === 'mine' ? 'My Total Paid' : 'Total Group Spend'}
          value={viewMode === 'mine' ? myPaidTotal : totalSpent}
          subLabel={`${expenseCount} expense${expenseCount !== 1 ? 's' : ''}`}
          icon={Wallet}
          iconColor="text-emerald-500 bg-emerald-500/10"
        />
        {viewMode === 'mine' ? (
          <SummaryStatCard
            label="My Share"
            value={myShareTotal}
            subLabel="Your total obligation"
            icon={CreditCard}
            iconColor="text-cyan-500 bg-cyan-500/10"
          />
        ) : (
          <SummaryStatCard
            label="Average Expense"
            value={avgExpense}
            subLabel="Per recorded expense"
            icon={CreditCard}
            iconColor="text-blue-500 bg-blue-500/10"
          />
        )}
        <SummaryStatCard
          label="Active Categories"
          value={categoryData.length}
          subLabel={`Top: ${categoryData[0]?.name || 'N/A'}`}
          icon={PieIcon}
          iconColor="text-purple-500 bg-purple-500/10"
        />
      </div>

      {/* Monthly Trend Chart */}
      <MonthlyTrendChart
        expenses={expenses}
        timeRange={timeRange}
        viewMode={viewMode}
        currentUserId={currentUserId}
      />

      {/* Breakdown Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Per-member bar chart */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">Paid by Member</h3>
            <p className="text-xs text-muted-foreground">Total contributions in period</p>
          </div>
          {memberData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(memberData.length * 40 + 20, 160)}>
              <BarChart data={memberData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={85}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--card-foreground))',
                    fontSize: 12,
                  }}
                  formatter={(val: number) => [`₹${val.toFixed(2)}`, 'Paid']}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                  {memberData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center">No member data available.</p>
          )}
        </Card>

        {/* Category pie chart */}
        <Card className="p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">By Category</h3>
            <p className="text-xs text-muted-foreground">Distribution of spending</p>
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
    </div>
  );
};
