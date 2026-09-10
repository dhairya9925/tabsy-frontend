import { useMemo } from 'react';
import { useMonthlyGroupExpenses, useMemberExclusions } from '@/hooks/useSettlements';
import { useGroupMembers, useGroup } from '@/hooks/useGroups';
import { calculateSettlement, type SettlementResult } from '@/utils/settlementCalculation';

/**
 * Composite hook that fetches the monthly expenses, group members, and exclusions,
 * then runs the settlement calculation and returns the result.
 */
export const useSettlementCalculation = (
  groupId: string | undefined,
  month: number,
  year: number,
) => {
  const { data: expenses, isLoading: expensesLoading } = useMonthlyGroupExpenses(groupId, month, year);
  const { data: members, isLoading: membersLoading } = useGroupMembers(groupId);
  const { data: exclusions, isLoading: exclusionsLoading } = useMemberExclusions(groupId, month, year);
  const { data: group, isLoading: groupLoading } = useGroup(groupId);

  const isLoading = expensesLoading || membersLoading || exclusionsLoading || groupLoading;

  const result: SettlementResult | null = useMemo(() => {
    if (!expenses || !members || !group) return null;

    const memberList = members.map((m) => ({
      userId: m.user_id,
      name: m.profile?.display_name || m.profile?.email || 'Unknown',
    }));

    const memberExclusions = (exclusions ?? []).map((e) => ({
      userId: e.user_id,
      type: e.exclusion_type as 'partial' | 'full',
    }));

    // Pass group's monthly rent as the fourth argument to calculateSettlement
    const monthlyRent = Number(group.monthly_rent) || 0;
    return calculateSettlement(expenses, memberList, memberExclusions, monthlyRent);
  }, [expenses, members, exclusions, group]);

  return { data: result, isLoading };
};
