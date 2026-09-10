import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GroupExpense, Balance } from '@/hooks/useGroupExpenses';
import { GroupMember, Group } from '@/hooks/useGroups';
import { useMultiMonthSettlements } from '@/hooks/useMultiMonthSettlements';
import { getCategoryById } from '@/lib/categories';
import { sumMoney, roundMoney } from '@/utils/money';
import { SummaryTimeFilter, TimeRangeOption } from './shared/SummaryTimeFilter';
import { MyViewToggle, SummaryViewMode } from './shared/MyViewToggle';
import { SummaryStatCard } from './shared/SummaryStatCard';
import { MonthlyTrendChart } from './shared/MonthlyTrendChart';
import { Home, Receipt, Trophy, Lock, Unlock, Scale, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { subMonths, subDays } from 'date-fns';

interface SharedLivingSummaryProps {
  expenses: GroupExpense[];
  balances?: Balance[];
  members?: GroupMember[];
  group?: Group;
  currentUserId?: string;
  loading: boolean;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const CHART_COLORS = [
  'hsl(160, 84%, 39%)',
  'hsl(217, 91%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(280, 65%, 60%)',
  'hsl(190, 80%, 45%)',
  'hsl(330, 70%, 55%)',
];

export const SharedLivingSummary = ({
  expenses,
  balances = [],
  members = [],
  group,
  currentUserId,
  loading,
}: SharedLivingSummaryProps) => {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [viewMode, setViewMode] = useState<SummaryViewMode>('group');

  const { data: settlements, isLoading: settlementsLoading } = useMultiMonthSettlements(group?.id, 6);

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

  // Breakdown Rent vs General
  const rentExpenses = filteredExpenses.filter(e => e.category.toLowerCase() === 'rent' || e.note === 'Automated Monthly Rent');
  const generalExpenses = filteredExpenses.filter(e => e.category.toLowerCase() !== 'rent' && e.note !== 'Automated Monthly Rent');

  const totalRent = sumMoney(rentExpenses.map(e => e.amount));
  const totalGeneral = sumMoney(generalExpenses.map(e => e.amount));
  const totalSpent = sumMoney(filteredExpenses.map(e => e.amount));

  // Distinct months in dataset
  const uniqueMonths = new Set(filteredExpenses.map(e => e.expense_date.slice(0, 7)));
  const monthsCount = Math.max(uniqueMonths.size, 1);
  const memberCount = Math.max(members.length, 1);
  const avgMonthlyPerson = roundMoney(totalSpent / (monthsCount * memberCount));

  // Member Leaderboard & Contribution Calculation
  const memberPaidMap = new Map<string, number>();
  members.forEach(m => memberPaidMap.set(m.user_id, 0));

  filteredExpenses.forEach(e => {
    const payerId = e.paid_by || e.user_id;
    memberPaidMap.set(payerId, (memberPaidMap.get(payerId) || 0) + e.amount);
  });

  const leaderboard = members.map(m => {
    const paid = memberPaidMap.get(m.user_id) || 0;
    const name = m.profile?.display_name || m.profile?.email || 'Unknown';
    const percentage = totalSpent > 0 ? roundMoney((paid / totalSpent) * 100) : 0;
    return { userId: m.user_id, name, paid: roundMoney(paid), percentage };
  }).sort((a, b) => b.paid - a.paid);

  // Fairness Score Calculation (ideal share vs actual)
  const idealShare = totalSpent / memberCount;
  let totalVariance = 0;
  leaderboard.forEach(m => {
    totalVariance += Math.abs(m.paid - idealShare);
  });
  const maxPossibleVariance = totalSpent > 0 ? totalSpent * 2 : 1;
  const fairnessScore = totalSpent > 0 
    ? Math.max(10, Math.min(100, Math.round(100 - (totalVariance / maxPossibleVariance) * 100)))
    : 100;

  let fairnessLabel = 'Highly Balanced';
  let fairnessColor = 'text-emerald-500';
  if (fairnessScore < 60) {
    fairnessLabel = 'Imbalanced Spread';
    fairnessColor = 'text-rose-500';
  } else if (fairnessScore < 80) {
    fairnessLabel = 'Moderately Balanced';
    fairnessColor = 'text-amber-500';
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryStatCard
          label="Total Rent Paid"
          value={totalRent}
          subLabel={`${rentExpenses.length} rent records`}
          icon={Home}
          iconColor="text-emerald-500 bg-emerald-500/10"
        />
        <SummaryStatCard
          label="General Expenses"
          value={totalGeneral}
          subLabel={`${generalExpenses.length} general expenses`}
          icon={Receipt}
          iconColor="text-blue-500 bg-blue-500/10"
        />
        <SummaryStatCard
          label="Avg / Person / Month"
          value={avgMonthlyPerson}
          subLabel={`Across ${monthsCount} month${monthsCount !== 1 ? 's' : ''}`}
          icon={Scale}
          iconColor="text-amber-500 bg-amber-500/10"
        />
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fairness Score</span>
            <span className={`text-xs font-bold ${fairnessColor}`}>{fairnessLabel}</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-2xl font-bold text-foreground">{fairnessScore}%</span>
              <span className="text-xs text-muted-foreground">Target: 100%</span>
            </div>
            <Progress value={fairnessScore} className="h-2" />
          </div>
          <p className="text-[11px] text-muted-foreground">Contribution equality across roommates</p>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <MonthlyTrendChart
        expenses={expenses}
        timeRange={timeRange}
        viewMode={viewMode}
        currentUserId={currentUserId}
      />

      {/* Leaderboard & Settlement History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Roommate Contribution Leaderboard */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" /> Member Leaderboard
              </h3>
              <p className="text-xs text-muted-foreground">Total paid toward apartment expenses</p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {leaderboard.map((member, index) => (
              <div key={member.userId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/40">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                  index === 1 ? 'bg-slate-400/20 text-slate-400' :
                  index === 2 ? 'bg-amber-700/20 text-amber-700' : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground truncate">{member.name}</span>
                    <span className="font-bold text-foreground">₹{member.paid.toFixed(2)} ({member.percentage}%)</span>
                  </div>
                  <Progress value={member.percentage} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Settlement Lock History */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-emerald-500" /> Settlement History
              </h3>
              <p className="text-xs text-muted-foreground">Recent monthly closure status</p>
            </div>
          </div>

          {settlementsLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !settlements?.length ? (
            <p className="text-xs text-muted-foreground py-6 text-center italic">
              No monthly settlements recorded yet. Use the Settlement tab to lock months!
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {settlements.map((s) => {
                const monthName = MONTH_NAMES[s.month - 1];
                const isLocked = s.status === 'locked';
                return (
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card">
                    <span className="text-xs font-medium text-foreground">{monthName} {s.year}</span>
                    <Badge variant={isLocked ? 'default' : 'outline'} className={`text-[10px] ${isLocked ? 'bg-amber-500/90 text-white' : ''}`}>
                      {isLocked ? (
                        <>
                          <Lock className="h-3 w-3 mr-1" /> Locked
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3 w-3 mr-1" /> Open
                        </>
                      )}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
