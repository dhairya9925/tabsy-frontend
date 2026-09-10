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
import { Plane, Users, Wallet, Sparkles, Calendar, PieChart as PieIcon, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { format, parseISO, subMonths, subDays } from 'date-fns';

interface TripSummaryProps {
  expenses: GroupExpense[];
  balances?: Balance[];
  members?: GroupMember[];
  group?: Group;
  currentUserId?: string;
  loading: boolean;
}

const CHART_COLORS = [
  'hsl(190, 80%, 45%)',
  'hsl(160, 84%, 39%)',
  'hsl(217, 91%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(330, 70%, 55%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 72%, 51%)',
];

export const TripSummary = ({
  expenses,
  balances = [],
  members = [],
  group,
  currentUserId,
  loading,
}: TripSummaryProps) => {
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

  // Key metrics
  const totalSpent = sumMoney(filteredExpenses.map((e) => e.amount));
  const memberCount = Math.max(members.length, 1);
  const perHeadCost = roundMoney(totalSpent / memberCount);
  const totalUnsettled = sumMoney(balances.map((b) => b.amount));

  // Biggest Single Expense
  const biggestExpense = useMemo(() => {
    if (!filteredExpenses.length) return null;
    return [...filteredExpenses].sort((a, b) => b.amount - a.amount)[0];
  }, [filteredExpenses]);

  // Day-by-Day Spend Breakdown
  const dayData = useMemo(() => {
    const map = new Map<string, { dateStr: string; label: string; total: number }>();
    filteredExpenses.forEach((e) => {
      const dateObj = parseISO(e.expense_date);
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      const label = format(dateObj, 'MMM d');

      const existing = map.get(dateStr);
      if (existing) {
        existing.total += e.amount;
      } else {
        map.set(dateStr, { dateStr, label, total: e.amount });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .map((item) => ({ ...item, total: roundMoney(item.total) }));
  }, [filteredExpenses]);

  // Who Covered What %
  const payerMap = new Map<string, number>();
  members.forEach((m) => payerMap.set(m.user_id, 0));
  filteredExpenses.forEach((e) => {
    const payerId = e.paid_by || e.user_id;
    payerMap.set(payerId, (payerMap.get(payerId) || 0) + e.amount);
  });

  const payerBreakdown = members.map((m) => {
    const paid = payerMap.get(m.user_id) || 0;
    const name = m.profile?.display_name || m.profile?.email || 'Unknown';
    const percentage = totalSpent > 0 ? roundMoney((paid / totalSpent) * 100) : 0;
    return { userId: m.user_id, name, paid: roundMoney(paid), percentage };
  }).sort((a, b) => b.paid - a.paid);

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

  // Chronological mini timeline (top 5)
  const timeline = [...filteredExpenses]
    .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card p-2 rounded-xl border border-border/60 shadow-sm">
        <MyViewToggle value={viewMode} onChange={setViewMode} />
        <SummaryTimeFilter value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Trip Hero Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 border-cyan-500/20 bg-cyan-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              Total Trip Cost
            </span>
            <Plane className="h-4 w-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">₹{totalSpent.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredExpenses.length} trip expenses recorded</p>
        </Card>

        <SummaryStatCard
          label="Per Head Cost"
          value={perHeadCost}
          subLabel={`Split among ${memberCount} traveler${memberCount !== 1 ? 's' : ''}`}
          icon={Users}
          iconColor="text-blue-500 bg-blue-500/10"
        />

        <SummaryStatCard
          label="Unsettled Debt"
          value={totalUnsettled}
          subLabel={balances.length > 0 ? `${balances.length} debt link(s) open` : 'All trip debts settled! 🎉'}
          icon={Wallet}
          iconColor={balances.length > 0 ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10'}
        />
      </div>

      {/* Highlight Card: Biggest Expense */}
      {biggestExpense && (
        <Card className="p-4 border-purple-500/20 bg-purple-500/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Largest Trip Spend
              </span>
              <p className="text-sm font-bold text-foreground">
                {biggestExpense.note || getCategoryById(biggestExpense.category).label} — ₹{biggestExpense.amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Paid by <span className="font-medium text-foreground">{biggestExpense.payer_name}</span> on {format(parseISO(biggestExpense.expense_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-300 shrink-0 hidden sm:inline-flex">
            Major Expense
          </Badge>
        </Card>
      )}

      {/* Day-by-Day Spend Bar Chart */}
      <Card className="p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-cyan-500" /> Day-by-Day Trip Spending
          </h3>
          <p className="text-xs text-muted-foreground">Expenses chronologically per day of travel</p>
        </div>

        {dayData.length > 0 ? (
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  formatter={(val: number) => [`₹${val.toFixed(2)}`, 'Spent']}
                />
                <Bar dataKey="total" fill="hsl(190, 80%, 45%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">No daily spend recorded.</p>
        )}
      </Card>

      {/* Who Covered What & Category Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Who Covered What % */}
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Traveler Contributions (% Paid)</h3>
          <div className="space-y-2 pt-1">
            {payerBreakdown.map((p, i) => (
              <div key={p.userId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className="font-bold text-foreground">₹{p.paid.toFixed(2)} ({p.percentage}%)</span>
                </div>
                <Progress value={p.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        </Card>

        {/* Category breakdown */}
        <Card className="p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <PieIcon className="h-4 w-4 text-cyan-500" /> Trip Categories
            </h3>
            <p className="text-xs text-muted-foreground">Distribution across travel activities</p>
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

      {/* Mini Timeline Feed */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Recent Trip Activity</h3>
        <div className="space-y-2">
          {timeline.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs">
              <div>
                <span className="font-medium text-foreground">{item.note || getCategoryById(item.category).label}</span>
                <span className="text-muted-foreground ml-2">by {item.payer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{format(parseISO(item.expense_date), 'MMM d')}</span>
                <span className="font-bold text-foreground">₹{item.amount.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
