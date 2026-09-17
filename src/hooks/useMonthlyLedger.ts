import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import type {
  MonthlyLedgerResponse,
  MonthlyLedgerContributionPayload,
  MonthlyLedgerDisbursementPayload,
  MonthlyLedgerLockPayload,
} from '@/types/monthlyLedger';

export const useMonthlyLedger = (
  groupId: string | undefined,
  month: number,
  year: number
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monthly_ledger', groupId, month, year],
    queryFn: async () => {
      const res = await apiClient.get<MonthlyLedgerResponse>(
        `/api/v1/groups/${groupId}/monthly-ledger?month=${month}&year=${year}`
      );
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    enabled: !!user && !!groupId && !!month && !!year,
  });
};

export const useRecordMonthlyContribution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      month,
      year,
      payload,
    }: {
      groupId: string;
      month: number;
      year: number;
      payload: MonthlyLedgerContributionPayload;
    }) => {
      const res = await apiClient.post(
        `/api/v1/groups/${groupId}/monthly-ledger/contributions?month=${month}&year=${year}`,
        payload
      );
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['monthly_ledger', variables.groupId, variables.month, variables.year],
      });
      queryClient.invalidateQueries({
        queryKey: ['group_balances', variables.groupId],
      });
    },
  });
};

export const useRecordMonthlyDisbursement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      month,
      year,
      payload,
    }: {
      groupId: string;
      month: number;
      year: number;
      payload: MonthlyLedgerDisbursementPayload;
    }) => {
      const res = await apiClient.post(
        `/api/v1/groups/${groupId}/monthly-ledger/disbursements?month=${month}&year=${year}`,
        payload
      );
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['monthly_ledger', variables.groupId, variables.month, variables.year],
      });
      queryClient.invalidateQueries({
        queryKey: ['group_balances', variables.groupId],
      });
    },
  });
};

export const useLockMonthlyLedger = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      month,
      year,
      payload,
    }: {
      groupId: string;
      month: number;
      year: number;
      payload: MonthlyLedgerLockPayload;
    }) => {
      const res = await apiClient.post(
        `/api/v1/groups/${groupId}/monthly-ledger/lock?month=${month}&year=${year}`,
        payload
      );
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['monthly_ledger', variables.groupId, variables.month, variables.year],
      });
      queryClient.invalidateQueries({
        queryKey: ['monthly_settlement', variables.groupId, variables.month, variables.year],
      });
    },
  });
};
