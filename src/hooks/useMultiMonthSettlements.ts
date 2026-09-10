import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { MonthlySettlement } from './useSettlements';

export const useMultiMonthSettlements = (groupId: string | undefined, limit: number = 12) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['multi_month_settlements', groupId, limit],
    queryFn: async () => {
      const { data } = await apiClient.get<MonthlySettlement[]>(
        `/api/v1/groups/${groupId}/settlements/multi?limit=${limit}`
      );
      return data ?? [];
    },
    enabled: !!user && !!groupId,
  });
};
