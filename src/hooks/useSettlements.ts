import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

export interface MonthlySettlement {
  id: string;
  group_id: string;
  month: number;
  year: number;
  status: 'open' | 'locked';
  created_at: string;
  updated_at: string;
}

export interface MemberMonthlyStatus {
  id: string;
  settlement_id: string;
  user_id: string;
  status: 'complete';
  created_at: string;
}

export interface MemberMonthlyExclusion {
  id: string;
  group_id: string;
  user_id: string;
  month: number;
  year: number;
  exclusion_type: string;
  created_at: string;
}

// 1. Fetch the settlement record for a specific month
export const useMonthlySettlement = (groupId: string | undefined, month: number, year: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monthly_settlement', groupId, month, year],
    queryFn: async () => {
      const { data } = await apiClient.get<MonthlySettlement | null>(
        `/api/v1/groups/${groupId}/settlements/${month}/${year}`
      );
      return data;
    },
    enabled: !!user && !!groupId && !!month && !!year,
  });
};

// 2. Fetch the "mark as complete" status of all members for a specific settlement
export const useMemberMonthlyStatus = (groupId: string | undefined, settlementId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['member_monthly_status', groupId, settlementId],
    queryFn: async () => {
      const { data } = await apiClient.get<MemberMonthlyStatus[]>(
        `/api/v1/groups/${groupId}/settlements/${settlementId}/member-status`
      );
      return data ?? [];
    },
    enabled: !!user && !!groupId && !!settlementId,
  });
};

// 3. Fetch expenses specifically for a given month and year
export const useMonthlyGroupExpenses = (groupId: string | undefined, month: number, year: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monthly_group_expenses', groupId, month, year],
    queryFn: async () => {
      const { data } = await apiClient.get<any[]>(
        `/api/v1/groups/${groupId}/settlements/${month}/${year}/expenses`
      );
      return data ?? [];
    },
    enabled: !!user && !!groupId && !!month && !!year,
  });
};

// 4. Mutation to create a monthly settlement record if it doesn't exist
export const useCreateMonthlySettlement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, month, year }: { groupId: string; month: number; year: number }) => {
      const { data } = await apiClient.post<MonthlySettlement>(
        `/api/v1/groups/${groupId}/settlements/${month}/${year}`,
        { status: 'open' }
      );
      return data as MonthlySettlement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monthly_settlement', data.group_id, data.month, data.year] });
    },
  });
};

// 5. Mutation to mark expenses as complete
export const useMarkExpensesComplete = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ settlementId, groupId, month, year }: { settlementId: string; groupId: string; month: number; year: number }) => {
      const { data } = await apiClient.post<MemberMonthlyStatus>(
        `/api/v1/groups/${groupId}/settlements/${settlementId}/member-status`,
        { user_id: user?.id, status: 'complete' }
      );
      return data as MemberMonthlyStatus;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member_monthly_status', variables.groupId, variables.settlementId] });
    },
  });
};

// 6. Mutation to lock a settlement (all members have finalized)
export const useLockSettlement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ settlementId, groupId, month, year }: { settlementId: string; groupId: string; month: number; year: number }) => {
      const { data } = await apiClient.post<MonthlySettlement>(
        `/api/v1/groups/${groupId}/settlements/${month}/${year}/finalize`
      );
      return data as MonthlySettlement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monthly_settlement', data.group_id, data.month, data.year] });
    },
  });
};

// 7. Fetch member exclusions for a specific month
export const useMemberExclusions = (groupId: string | undefined, month: number, year: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['member_exclusions', groupId, month, year],
    queryFn: async () => {
      const { data } = await apiClient.get<MemberMonthlyExclusion[]>(
        `/api/v1/groups/${groupId}/exclusions/${month}/${year}`
      );
      return data ?? [];
    },
    enabled: !!user && !!groupId && !!month && !!year,
  });
};

// 8. Set member exclusion explicitly
export const useSetMemberExclusion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId, userId, month, year, targetType,
    }: {
      groupId: string; userId: string; month: number; year: number; targetType: 'none' | 'partial' | 'full';
    }) => {
      const { data } = await apiClient.post<MemberMonthlyExclusion | null>(
        `/api/v1/groups/${groupId}/exclusions/${month}/${year}`,
        { user_id: userId, exclusion_type: targetType }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member_exclusions', variables.groupId, variables.month, variables.year] });
    },
  });
};
