import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

export interface GroupExpense {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  expense_date: string;
  user_id: string;
  group_id: string;
  paid_by: string | null;
  status: string;
  receipt_url: string | null;
  created_at: string;
  edited_at: string | null;
  payer_name?: string;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  is_settled: boolean;
  member_name?: string;
}

export interface Balance {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  amount: number;
}

export const useGroupExpenses = (groupId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group_expenses', groupId],
    queryFn: async () => {
      const { data } = await apiClient.get<GroupExpense[]>(
        `/api/v1/groups/${groupId}/expenses`
      );
      return data ?? [];
    },
    enabled: !!user && !!groupId,
  });
};

export const useAddGroupExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      amount,
      category,
      note,
      expense_date,
      status,
      receipt_url,
      splits,
    }: {
      groupId: string;
      amount: number;
      category: string;
      note?: string;
      expense_date?: string;
      status?: string;
      receipt_url?: string;
      splits: { user_id: string; amount: number }[];
    }) => {
      const { data } = await apiClient.post<GroupExpense>(
        `/api/v1/groups/${groupId}/expenses`,
        {
          amount,
          category,
          note: note || null,
          expense_date: expense_date || new Date().toISOString().split('T')[0],
          status: status || 'submitted',
          receipt_url: receipt_url || null,
          splits,
        }
      );
      return data;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group_expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group_balances', groupId] });
    },
  });
};

export const useBulkAddGroupExpenses = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      expenses,
    }: {
      groupId: string;
      expenses: {
        amount: number;
        category: string;
        note?: string;
        expense_date?: string;
        status?: string;
        receipt_url?: string;
        paid_by?: string;
        splits: { user_id: string; amount: number }[];
      }[];
    }) => {
      if (expenses.length === 0) return [];

      const { data } = await apiClient.post<GroupExpense[]>(
        `/api/v1/groups/${groupId}/expenses/bulk`,
        {
          expenses: expenses.map(e => ({
            amount: e.amount,
            category: e.category,
            note: e.note || null,
            expense_date: e.expense_date || new Date().toISOString().split('T')[0],
            status: e.status || 'submitted',
            receipt_url: e.receipt_url || null,
            paid_by: e.paid_by,
            splits: e.splits,
          })),
        }
      );

      return data ?? [];
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group_expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group_balances', groupId] });
    },
  });
};

export const useSettleUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      fromUserId,
      toUserId,
    }: {
      groupId: string;
      fromUserId: string;
      toUserId: string;
    }) => {
      await apiClient.post(`/api/v1/groups/${groupId}/settle`, {
        from_user_id: fromUserId,
        to_user_id: toUserId,
      });
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group_expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group_balances', groupId] });
    },
  });
};

export const useUpdateExpenseStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expenseId,
      groupId,
      status,
    }: {
      expenseId: string;
      groupId: string;
      status: string;
    }) => {
      await apiClient.patch(`/api/v1/groups/${groupId}/expenses/${expenseId}`, { status });
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group_expenses', groupId] });
    },
  });
};

export const useUpdateGroupExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expenseId,
      groupId,
      amount,
      category,
      note,
      expense_date,
      receipt_url,
      splits,
    }: {
      expenseId: string;
      groupId: string;
      amount: number;
      category: string;
      note?: string;
      expense_date?: string;
      receipt_url?: string;
      splits: { user_id: string; amount: number }[];
    }) => {
      const { data } = await apiClient.patch<GroupExpense>(
        `/api/v1/groups/${groupId}/expenses/${expenseId}`,
        {
          amount,
          category,
          note: note || null,
          expense_date: expense_date || undefined,
          receipt_url: receipt_url || null,
          splits,
        }
      );
      return data;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group_expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group_balances', groupId] });
    },
  });
};

export const useDeleteGroupExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, groupId }: { expenseId: string; groupId: string }) => {
      await apiClient.delete(`/api/v1/groups/${groupId}/expenses/${expenseId}`);
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group_expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group_balances', groupId] });
    },
  });
};

export const useBulkSettle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId }: { groupId: string }) => {
      await apiClient.post(`/api/v1/groups/${groupId}/reimburse-bulk`);
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group_expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group_balances', groupId] });
    },
  });
};

export const useGroupBalances = (groupId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group_balances', groupId],
    queryFn: async () => {
      const { data } = await apiClient.get<Balance[]>(
        `/api/v1/groups/${groupId}/balances`
      );
      return data ?? [];
    },
    enabled: !!user && !!groupId,
  });
};
