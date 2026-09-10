import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/types/database';

export interface PersonalExpenseSplit {
  user_id: string;
  amount: number;
}

export type Expense = Tables<'expenses'> & {
  expense_splits?: (PersonalExpenseSplit & { id: string; is_settled: boolean; created_at: string })[];
};
export interface ExpenseInsert {
  amount: number;
  category: string;
  note?: string | null;
  expense_date?: string;
  paid_by?: string | null;
  splits?: PersonalExpenseSplit[];
}
export type ExpenseUpdate = Partial<ExpenseInsert>;

function invalidateExpenseViews(queryClient: QueryClient) {
  return Promise.all(
    [['expenses'], ['friend-balances'], ['friend-expenses'], ['dashboard_data']].map(queryKey =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

export const useExpenses = (filters?: {
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expenses', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];
      const res = await apiClient.get<Expense[]>('/api/v1/expenses/personal', {
        params: {
          category: filters?.category,
          startDate: filters?.startDate,
          endDate: filters?.endDate,
          search: filters?.search,
        },
      });
      if (res.error) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: !!user,
  });
};

export const useAddExpense = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (expense: ExpenseInsert) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await apiClient.post<Expense>('/api/v1/expenses/personal', expense);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => invalidateExpenseViews(queryClient),
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ExpenseUpdate & { id: string }) => {
      const { data, error } = await apiClient.patch<Expense>(`/api/v1/expenses/${id}`, updates);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => invalidateExpenseViews(queryClient),
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.delete(`/api/v1/expenses/${id}`);
      if (error) throw new Error(error);
    },
    onSuccess: () => invalidateExpenseViews(queryClient),
  });
};
