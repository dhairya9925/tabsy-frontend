import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { getCategoryById, getChartColor } from '@/lib/categories';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { SummaryStatCard } from '@/components/groups/summary/shared/SummaryStatCard';
import { ActiveGroupsStrip } from '@/components/dashboard/ActiveGroupsStrip';
import { SettleUpList } from '@/components/dashboard/SettleUpList';
import { DashboardTrendChart } from '@/components/dashboard/DashboardTrendChart';
import { UnifiedActivityFeed } from '@/components/dashboard/UnifiedActivityFeed';
import { SmartNudges } from '@/components/dashboard/SmartNudges';
import { Plus, Receipt, Wallet, Clock, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import { roundMoney } from '@/utils/money';

const Dashboard = () => {
  const { profile } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [categoryViewMode, setCategoryViewMode] = useState<'all' | 'personal'>('all');

  const now = new Date();

  const { data: dashboardData, isLoading, isError, refetch } = useDashboardData();
  const { categories } = useCategories();

  const {
    personalTotal = 0,
    personalExpenseCount = 0,
    personalExpenses = [],
    groupShareTotal = 0,
    groupBalances = [],
    groupUserSplits = [],
    friendBalances = [],
    unifiedTotal = 0,
    monthOverMonthPct = null,
    netBalance = 0,
    netOwed = 0,
    netOwes = 0,
    unsettledCount = 0,
    monthlyTransactionCount = 0,
    recentActivity = [],
  } = dashboardData || {};

  // Category data for Pie Chart (Personal vs All Spending for current month)
  const categoryData = useMemo(() => {
    const currentMonthStr = format(now, 'yyyy-MM');
    const map = new Map<string, number>();

    // Personal expenses for current month
    const monthPersonalExpenses = personalExpenses.filter(
      e => e.expense_date && e.expense_date.startsWith(currentMonthStr)
    );
    monthPersonalExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + Number(e.amount));
    });

    // Group splits for current month (if mode is 'all')
    if (categoryViewMode === 'all') {
      const monthGroupSplits = groupUserSplits.filter(
        s => s.expense_date && s.expense_date.startsWith(currentMonthStr)
      );
      monthGroupSplits.forEach((s) => {
        map.set(s.category, (map.get(s.category) || 0) + Number(s.amount));
      });
    }

    const totalSum = Array.from(map.values()).reduce((sum, val) => sum + val, 0);

    return Array.from(map.entries())
      .map(([category, amount]) => ({
        name: getCategoryById(category).label,
        value: roundMoney(amount),
        percentage: totalSum > 0 ? Math.round((amount / totalSum) * 100) : 0,
        categoryId: category,
      }))
      .sort((a, b) => b.value - a.value);
  }, [personalExpenses, groupUserSplits, categoryViewMode]);

  // Net Balance Stat Card formatting
  const netBalanceValue = useMemo(() => {
    if (netBalance > 0.01) {
      return `+₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    } else if (netBalance < -0.01) {
      return `-₹${Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    return 'All Settled ✓';
  }, [netBalance]);

  const netBalanceSubLabel = useMemo(() => {
    if (netBalance > 0.01) {
      return `You're owed ₹${netOwed.toLocaleString('en-IN')} (owe ₹${netOwes.toLocaleString('en-IN')})`;
    } else if (netBalance < -0.01) {
      return `You owe ₹${netOwes.toLocaleString('en-IN')} (owed ₹${netOwed.toLocaleString('en-IN')})`;
    }
    return unsettledCount > 0 ? `${unsettledCount} active balance(s)` : 'No active debts';
  }, [netBalance, netOwed, netOwes, unsettledCount]);

  const netBalanceIconColor = useMemo(() => {
    if (netBalance > 0.01) return 'text-emerald-500 bg-emerald-500/10';
    if (netBalance < -0.01) return 'text-rose-500 bg-rose-500/10';
    return 'text-muted-foreground bg-muted';
  }, [netBalance]);

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-header mb-1">Overview</p>
          <h1 className="text-3xl font-bold">
            Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}
          </h1>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Quick Add
        </Button>
      </div>

      {isError ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground mb-4">Failed to load dashboard data</p>
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : (
        <>
          {/* Smart Nudges */}
          {dashboardData && (
            <SmartNudges dashboardData={dashboardData} onQuickAdd={() => setFormOpen(true)} />
          )}

          {/* Enhanced Unified Hero Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            {/* Card 1: Unified Total Spend */}
            <SummaryStatCard
              label="TOTAL SPEND"
              value={isLoading ? '...' : `₹${unifiedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              subLabel={isLoading ? undefined : `Personal ₹${personalTotal.toLocaleString('en-IN')} · Groups ₹${groupShareTotal.toLocaleString('en-IN')}`}
              icon={Receipt}
              iconColor="text-primary bg-primary/10"
              trend={
                monthOverMonthPct !== null
                  ? {
                      value: monthOverMonthPct,
                      label: 'vs last month',
                      isPositiveGood: false,
                    }
                  : undefined
              }
            />

            {/* Card 2: Net Balance */}
            <SummaryStatCard
              label="NET BALANCE"
              value={isLoading ? '...' : netBalanceValue}
              subLabel={isLoading ? undefined : netBalanceSubLabel}
              icon={Wallet}
              iconColor={netBalanceIconColor}
            />

            {/* Card 3: Activity This Month */}
            <SummaryStatCard
              label="THIS MONTH"
              value={isLoading ? '...' : monthlyTransactionCount}
              subLabel={isLoading ? undefined : `${personalExpenseCount} personal · ${monthlyTransactionCount - personalExpenseCount} group`}
              icon={Clock}
              iconColor="text-blue-500 bg-blue-500/10"
            />
          </div>

          {/* Active Groups Horizontal Strip */}
          <ActiveGroupsStrip groups={groupBalances} />

          {/* Settle Up List & Category Pie Chart Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Settle Up Quick List */}
            <SettleUpList groupBalances={groupBalances} friendBalances={friendBalances} />

            {/* Unified Category Pie Chart with Toggle */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="section-header flex items-center gap-1.5">
                  <PieChartIcon className="h-4 w-4 text-primary" /> Spending by Category
                </p>

                {/* View Mode Toggle Pill */}
                <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50">
                  <button
                    type="button"
                    onClick={() => setCategoryViewMode('all')}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${
                      categoryViewMode === 'all'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All Spending
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryViewMode('personal')}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${
                      categoryViewMode === 'personal'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Personal
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="h-[230px] flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : categoryData.length > 0 ? (
                <div className="h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {categoryData.map((entry) => (
                          <Cell key={entry.categoryId} fill={getChartColor(entry.categoryId)} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="glass-card p-2.5 text-xs">
                              <p className="font-semibold text-foreground">{data.name}</p>
                              <p className="font-mono-num text-primary">
                                ₹{data.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({data.percentage}%)
                              </p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[230px] flex items-center justify-center text-muted-foreground text-sm">
                  No expenses logged this month
                </div>
              )}

              {/* Legend */}
              {categoryData.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-border/40">
                  {categoryData.map((entry) => (
                    <div key={entry.categoryId} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getChartColor(entry.categoryId) }}
                      />
                      <span className="text-muted-foreground">{entry.name}:</span>
                      <span className="font-medium font-mono-num text-foreground">
                        ₹{entry.value.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">({entry.percentage}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 6-Month Stacked Spending Trend Chart */}
          <DashboardTrendChart
            personalExpenses={personalExpenses}
            groupUserSplits={groupUserSplits}
          />

          {/* Unified Activity Feed */}
          <UnifiedActivityFeed activities={recentActivity} />

          <ExpenseForm open={formOpen} onOpenChange={setFormOpen} />
        </>
      )}
    </div>
  );
};

export default Dashboard;
