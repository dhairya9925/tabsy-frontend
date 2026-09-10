import { useMemo } from 'react';
import { GroupExpense, Balance } from '@/hooks/useGroupExpenses';
import { GroupMember, Group } from '@/hooks/useGroups';
import { sumMoney, roundMoney } from '@/utils/money';
import { getCategoryById } from '@/lib/categories';
import { subDays, parseISO } from 'date-fns';

export interface Insight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'highlight';
  title: string;
  description: string;
  icon?: string;
}

export function useInsightEngine(
  expenses: GroupExpense[] | undefined,
  balances: Balance[] | undefined,
  members: GroupMember[] | undefined,
  group: Group | undefined,
  currentUserId: string | undefined
): Insight[] {
  return useMemo(() => {
    const insights: Insight[] = [];
    const validExpenses = (expenses ?? []).filter((e) => e.category !== 'system');
    if (!validExpenses.length) return insights;

    const totalSpent = sumMoney(validExpenses.map((e) => e.amount));
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    // 1. Recent vs Previous 30 Days Trend Insight
    const recentExpenses = validExpenses.filter((e) => new Date(e.expense_date) >= thirtyDaysAgo);
    const previousExpenses = validExpenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    });

    const recentTotal = sumMoney(recentExpenses.map((e) => e.amount));
    const previousTotal = sumMoney(previousExpenses.map((e) => e.amount));

    if (previousTotal > 0 && recentTotal > 0) {
      const diff = recentTotal - previousTotal;
      const pct = Math.round(Math.abs(diff / previousTotal) * 100);
      if (diff > 0 && pct >= 15) {
        insights.push({
          id: 'spend-up-trend',
          type: 'warning',
          title: `Spending up ${pct}% in last 30 days`,
          description: `Group spent ₹${recentTotal.toFixed(2)} compared to ₹${previousTotal.toFixed(2)} in the prior 30-day period.`,
        });
      } else if (diff < 0 && pct >= 15) {
        insights.push({
          id: 'spend-down-trend',
          type: 'success',
          title: `Group spend decreased ${pct}%`,
          description: `Spending dropped to ₹${recentTotal.toFixed(2)} in the last 30 days. Great budgeting!`,
        });
      }
    }

    // 2. Top Contributor Insight
    const payerMap = new Map<string, { name: string; total: number }>();
    validExpenses.forEach((e) => {
      const uid = e.paid_by || e.user_id;
      const name = e.payer_name || 'Unknown';
      const curr = payerMap.get(uid) || { name, total: 0 };
      curr.total += e.amount;
      payerMap.set(uid, curr);
    });

    const sortedPayers = Array.from(payerMap.values()).sort((a, b) => b.total - a.total);
    if (sortedPayers.length > 0 && totalSpent > 0) {
      const topPayer = sortedPayers[0];
      const topPct = Math.round((topPayer.total / totalSpent) * 100);
      if (topPct >= 40 && sortedPayers.length > 1) {
        insights.push({
          id: 'top-contributor',
          type: 'highlight',
          title: `${topPayer.name} is top payer (${topPct}%)`,
          description: `Has covered ₹${topPayer.total.toFixed(2)} out of ₹${totalSpent.toFixed(2)} total group spending.`,
        });
      }
    }

    // 3. Settlement Status Insight
    const openDebtsCount = (balances ?? []).length;
    if (openDebtsCount === 0 && validExpenses.length > 0) {
      insights.push({
        id: 'fully-settled',
        type: 'success',
        title: 'All member balances settled',
        description: 'No outstanding debts exist between any group members.',
      });
    } else if (openDebtsCount > 0) {
      const totalUnsettledDebt = sumMoney((balances ?? []).map((b) => b.amount));
      insights.push({
        id: 'open-debts',
        type: 'info',
        title: `${openDebtsCount} open debt link(s)`,
        description: `₹${totalUnsettledDebt.toFixed(2)} total remains unsettled across members. Check Balances tab to settle up.`,
      });
    }

    // 4. Group-Type Specific Insights
    const groupType = group?.type;
    if (groupType === 'reimbursable') {
      const submittedCount = validExpenses.filter((e) => e.status === 'submitted').length;
      if (submittedCount > 0) {
        insights.push({
          id: 'reimbursable-pending',
          type: 'warning',
          title: `${submittedCount} claim(s) awaiting review`,
          description: 'Sponsor needs to approve or reimburse pending claims in the Settlement tab.',
        });
      }
    } else if (groupType === 'trip') {
      const sortedByAmount = [...validExpenses].sort((a, b) => b.amount - a.amount);
      if (sortedByAmount.length > 0) {
        const biggest = sortedByAmount[0];
        insights.push({
          id: 'trip-biggest',
          type: 'highlight',
          title: `Major Trip Spend: ₹${biggest.amount.toFixed(2)}`,
          description: `${biggest.note || getCategoryById(biggest.category).label} paid by ${biggest.payer_name}.`,
        });
      }
    } else if (groupType === 'day_to_day') {
      const avgSession = roundMoney(totalSpent / validExpenses.length);
      insights.push({
        id: 'day-to-day-avg',
        type: 'info',
        title: `Average Outing: ₹${avgSession.toFixed(2)}`,
        description: `Based on ${validExpenses.length} logged hangout sessions.`,
      });
    }

    return insights;
  }, [expenses, balances, members, group, currentUserId]);
}
