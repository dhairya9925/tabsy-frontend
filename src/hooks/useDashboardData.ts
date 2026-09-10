import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { type FriendBalance } from '@/lib/friendExpensesApi';
import { type Expense } from '@/hooks/useExpenses';
import { type Group } from '@/hooks/useGroups';

export interface GroupBalanceSummary {
  groupId: string;
  groupName: string;
  groupType: string;
  memberCount: number;
  userNetBalance: number; // positive = user is owed, negative = user owes
}

export interface GroupUserSplitItem {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  group_id: string;
}

export interface DashboardActivityItem {
  id: string;
  type: 'personal_expense' | 'group_expense' | 'settlement';
  title: string;
  subText: string;
  amount: number;
  date: string;
  category: string;
  link: string;
}

export interface DashboardData {
  // Personal
  personalTotal: number;
  personalPrevMonthTotal: number;
  personalExpenseCount: number;
  personalExpenses: Expense[];

  // Groups
  groups: Group[];
  groupShareTotal: number;
  groupSharePrevMonthTotal: number;
  groupBalances: GroupBalanceSummary[];
  groupUserSplits: GroupUserSplitItem[];

  // Friends
  friendBalances: (FriendBalance & { friendName?: string })[];

  // Unified totals
  unifiedTotal: number;
  unifiedPrevMonthTotal: number;
  monthOverMonthPct: number | null;

  // Debt totals
  netOwed: number;      // Total owed TO current user
  netOwes: number;      // Total current user OWES
  netBalance: number;   // netOwed - netOwes
  unsettledCount: number; // count of groups/friends with active non-zero balance

  // Activity
  monthlyTransactionCount: number;
  recentActivity: DashboardActivityItem[];
  lastExpenseDate: string | null;
}

export function useDashboardData() {
  const { user } = useAuth();

  return useQuery<DashboardData>({
    queryKey: ['dashboard_data', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data } = await apiClient.get<DashboardData>('/api/v1/dashboard/summary');
      if (!data) throw new Error('Failed to load dashboard data');
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
