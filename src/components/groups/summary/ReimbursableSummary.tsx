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
import { Clock, CheckCircle2, AlertCircle, ArrowRight, UserCheck, Receipt, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { subMonths, subDays } from 'date-fns';

interface ReimbursableSummaryProps {
  expenses: GroupExpense[];
  balances?: Balance[];
  members?: GroupMember[];
  group?: Group;
  currentUserId?: string;
  loading: boolean;
}

const CHART_COLORS = [
  'hsl(350, 70%, 60%)',
  'hsl(217, 91%, 60%)',
  'hsl(160, 84%, 39%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(190, 80%, 45%)',
];

export const ReimbursableSummary = ({
  expenses,
  balances = [],
  members = [],
  group,
  currentUserId,
  loading,
}: ReimbursableSummaryProps) => {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [viewMode, setViewMode] = useState<SummaryViewMode>('group');

  // Filter expenses by timeRange and viewMode
  const filteredExpenses = useMemo(() => {
    const valid = expenses.filter((e) => e.category !== 'system' && e.note !== 'Automated Monthly Rent');
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
      return timeFiltered.filter((e) => (e.paid_by || e.user_id) === currentUserId);
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

  // Pipeline calculations
  const submitted = filteredExpenses.filter((e) => e.status === 'submitted');
  const approved = filteredExpenses.filter((e) => e.status === 'approved');
  const reimbursed = filteredExpenses.filter((e) => e.status === 'reimbursed');

  const totalSubmitted = sumMoney(submitted.map((e) => e.amount));
  const totalApproved = sumMoney(approved.map((e) => e.amount));
  const totalReimbursed = sumMoney(reimbursed.map((e) => e.amount));

  // Personal status for logged-in user
  let mySubmitted = 0;
  let myApproved = 0;
  let myReimbursed = 0;

  if (currentUserId) {
    const myExpenses = expenses.filter((e) => (e.paid_by || e.user_id) === currentUserId);
    mySubmitted = sumMoney(myExpenses.filter((e) => e.status === 'submitted').map((e) => e.amount));
    myApproved = sumMoney(myExpenses.filter((e) => e.status === 'approved').map((e) => e.amount));
    myReimbursed = sumMoney(myExpenses.filter((e) => e.status === 'reimbursed').map((e) => e.amount));
  }

  // Per-person claim breakdown table
  const personClaimMap = new Map<string, { name: string; submitted: number; approved: number; reimbursed: number }>();
  members.forEach((m) => {
    personClaimMap.set(m.user_id, {
      name: m.profile?.display_name || m.profile?.email || 'Unknown',
      submitted: 0,
      approved: 0,
      reimbursed: 0,
    });
  });

  filteredExpenses.forEach((e) => {
    const uid = e.paid_by || e.user_id;
    const existing = personClaimMap.get(uid) || {
      name: e.payer_name || 'Unknown',
      submitted: 0,
      approved: 0,
      reimbursed: 0,
    };

    if (e.status === 'submitted') existing.submitted += e.amount;
    else if (e.status === 'approved') existing.approved += e.amount;
    else if (e.status === 'reimbursed') existing.reimbursed += e.amount;

    personClaimMap.set(uid, existing);
  });

  const personClaimRows = Array.from(personClaimMap.values())
    .map((row) => ({
      ...row,
      submitted: roundMoney(row.submitted),
      approved: roundMoney(row.approved),
      reimbursed: roundMoney(row.reimbursed),
      total: roundMoney(row.submitted + row.approved + row.reimbursed),
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  // Category breakdown
  const categoryTotals = new Map<string, number>();
  filteredExpenses.forEach((e) => {
    const label = getCategoryById(e.category).label;
    categoryTotals.set(label, (categoryTotals.get(label) || 0) + e.amount);
  });
  const totalSpent = sumMoney(filteredExpenses.map((e) => e.amount));
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

      {/* Personal Claim Mini Dashboard */}
      {currentUserId && (
        <Card className="p-4 border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4" /> My Personal Claims Overview
            </h3>
            <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-600 dark:text-rose-400">
              Personal Status
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="p-2.5 rounded-lg bg-background border border-border/50">
              <span className="text-[11px] text-muted-foreground">Pending Review</span>
              <p className="text-lg font-bold text-amber-500 mt-0.5">₹{mySubmitted.toFixed(2)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border/50">
              <span className="text-[11px] text-muted-foreground">Approved (Awaiting Payout)</span>
              <p className="text-lg font-bold text-blue-500 mt-0.5">₹{myApproved.toFixed(2)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border/50">
              <span className="text-[11px] text-muted-foreground">Fully Reimbursed</span>
              <p className="text-lg font-bold text-emerald-500 mt-0.5">₹{myReimbursed.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Pipeline Funnel Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              1. Submitted Claims
            </span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">₹{totalSubmitted.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{submitted.length} claim(s) pending review</p>
        </Card>

        <Card className="p-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              2. Approved
            </span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">₹{totalApproved.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{approved.length} claim(s) ready for payout</p>
        </Card>

        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              3. Total Reimbursed
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">₹{totalReimbursed.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{reimbursed.length} claim(s) settled</p>
        </Card>
      </div>

      {/* Monthly Reimbursement Trend Chart */}
      <MonthlyTrendChart
        expenses={expenses}
        timeRange={timeRange}
        viewMode={viewMode}
        currentUserId={currentUserId}
      />

      {/* Per-Person Table & Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Claims Table by Member */}
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-rose-500" /> Per-Member Claim Summary
          </h3>

          {!personClaimRows.length ? (
            <p className="text-xs text-muted-foreground py-6 text-center italic">No claim records available.</p>
          ) : (
            <div className="space-y-2 pt-1">
              {personClaimRows.map((row) => (
                <div key={row.name} className="p-2.5 rounded-lg border border-border/40 bg-card space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">{row.name}</span>
                    <span className="text-foreground">Total: ₹{row.total.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                    <div>Pending: <span className="font-semibold text-amber-500">₹{row.submitted.toFixed(2)}</span></div>
                    <div>Approved: <span className="font-semibold text-blue-500">₹{row.approved.toFixed(2)}</span></div>
                    <div>Paid: <span className="font-semibold text-emerald-500">₹{row.reimbursed.toFixed(2)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Category breakdown */}
        <Card className="p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <PieIcon className="h-4 w-4 text-purple-500" /> Claim Category Breakdown
            </h3>
            <p className="text-xs text-muted-foreground">Expenses claimed by category</p>
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
