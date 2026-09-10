import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GroupExpense, Balance } from '@/hooks/useGroupExpenses';
import { GroupMember, Group } from '@/hooks/useGroups';
import { getCategoryById } from '@/lib/categories';
import { sumMoney, roundMoney } from '@/utils/money';
import { SummaryTimeFilter, TimeRangeOption } from './shared/SummaryTimeFilter';
import { MyViewToggle, SummaryViewMode } from './shared/MyViewToggle';
import { SummaryStatCard } from './shared/SummaryStatCard';
import { PartyPopper, CheckCircle2, AlertCircle, Users, Trophy, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, subMonths, subDays } from 'date-fns';

interface EventSummaryProps {
  expenses: GroupExpense[];
  balances?: Balance[];
  members?: GroupMember[];
  group?: Group;
  currentUserId?: string;
  loading: boolean;
}

const CHART_COLORS = [
  'hsl(280, 65%, 60%)',
  'hsl(330, 70%, 55%)',
  'hsl(217, 91%, 60%)',
  'hsl(160, 84%, 39%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
];

export const EventSummary = ({
  expenses,
  balances = [],
  members = [],
  group,
  currentUserId,
  loading,
}: EventSummaryProps) => {
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
  const memberCount = Math.max(members.length, 1);
  const perPersonCost = roundMoney(totalSpent / memberCount);
  const isFullySettled = filteredExpenses.length > 0 && balances.length === 0;

  // Upfront Contributors
  const payerMap = new Map<string, number>();
  members.forEach((m) => payerMap.set(m.user_id, 0));
  filteredExpenses.forEach((e) => {
    const payerId = e.paid_by || e.user_id;
    payerMap.set(payerId, (payerMap.get(payerId) || 0) + e.amount);
  });

  const topContributors = members
    .map((m) => {
      const paid = payerMap.get(m.user_id) || 0;
      const name = m.profile?.display_name || m.profile?.email || 'Unknown';
      const percentage = totalSpent > 0 ? roundMoney((paid / totalSpent) * 100) : 0;
      return { userId: m.user_id, name, paid: roundMoney(paid), percentage };
    })
    .sort((a, b) => b.paid - a.paid);

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

      {/* Celebratory Banner or Status Callout */}
      {isFullySettled ? (
        <Card className="p-4 border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                🎉 Event Fully Settled!
              </h3>
              <p className="text-xs text-muted-foreground">
                All members are settled up. All balances for {group?.name || 'this event'} are at ₹0.00.
              </p>
            </div>
          </div>
          <Badge variant="default" className="bg-emerald-600 text-white shrink-0 hidden sm:inline-flex text-xs">
            Ready to Archive
          </Badge>
        </Card>
      ) : (
        <Card className="p-4 border-purple-500/20 bg-purple-500/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PartyPopper className="h-6 w-6 text-purple-500 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-purple-600 dark:text-purple-400">
                Event Expense Tracking Active
              </h3>
              <p className="text-xs text-muted-foreground">
                {balances.length} outstanding debt link(s) remaining to settle.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 shrink-0 text-xs">
            {balances.length} Pending Debts
          </Badge>
        </Card>
      )}

      {/* Hero Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryStatCard
          label="Total Event Spend"
          value={totalSpent}
          subLabel={`${filteredExpenses.length} event expense(s)`}
          icon={PartyPopper}
          iconColor="text-purple-500 bg-purple-500/10"
        />
        <SummaryStatCard
          label="Per Attendee Cost"
          value={perPersonCost}
          subLabel={`Split across ${memberCount} attendee(s)`}
          icon={Users}
          iconColor="text-blue-500 bg-blue-500/10"
        />
        <SummaryStatCard
          label="Settlement Readiness"
          value={isFullySettled ? '100%' : `${Math.round(100 - (balances.length / memberCount) * 50)}%`}
          subLabel={isFullySettled ? 'Fully Settled' : `${balances.length} unsettled debts`}
          icon={Trophy}
          iconColor="text-amber-500 bg-amber-500/10"
        />
      </div>

      {/* Upfront Contributors & Category Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Upfront Contributors */}
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-purple-500" /> Top Upfront Contributors
          </h3>
          <p className="text-xs text-muted-foreground">Members who fronted the money for the event</p>
          <div className="space-y-2 pt-1">
            {topContributors.map((c, i) => (
              <div key={c.userId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="font-bold text-foreground">₹{c.paid.toFixed(2)} ({c.percentage}%)</span>
                </div>
                <Progress value={c.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        </Card>

        {/* Category Breakdown */}
        <Card className="p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <PieIcon className="h-4 w-4 text-purple-500" /> Event Category Breakdown
            </h3>
            <p className="text-xs text-muted-foreground">Venue, Catering, Decor & Other Expenses</p>
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
