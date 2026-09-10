import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFriendBalances, getFriendExpenses, recordFriendPayment } from "@/lib/friendExpensesApi";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/apiClient";

/**
 * Hook to fetch the net balances between the current user and all their friends.
 */
export function useFriendBalances() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friend-balances", user?.id],
    queryFn: getFriendBalances,
    enabled: !!user,
  });
}

/**
 * Hook to fetch the feed of shared non-group expenses with a specific friend.
 */
export function useFriendExpenses(friendId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friend-expenses", user?.id, friendId],
    queryFn: () => getFriendExpenses(friendId!),
    enabled: !!user && !!friendId,
  });
}

/**
 * Mutation hook to record a 1-on-1 payment and invalidate relevant queries.
 */
export function useRecordFriendPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ friendId, amount, payerId }: { friendId: string; amount: number; payerId?: string }) =>
      recordFriendPayment(friendId, amount, payerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["friend-balances", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["friend-expenses", user?.id, variables.friendId] });
      queryClient.invalidateQueries({ queryKey: ["expenses", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_data"] });
    },
  });
}

/**
 * Mutation hook to update a 1-on-1 friend expense and its splits.
 */
export function useUpdateFriendExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      expenseId,
      friendId,
      amount,
      category,
      note,
      expense_date,
      paidBy,
      splitType,
    }: {
      expenseId: string;
      friendId: string;
      amount: number;
      category: string;
      note?: string;
      expense_date: string;
      paidBy: 'me' | 'them';
      splitType: 'equal' | 'full';
    }) => {
      if (!user) throw new Error('Not authenticated');
      const payerId = paidBy === 'me' ? user.id : friendId;

      const res = await apiClient.patch(`/api/v1/friends/${friendId}/expenses/${expenseId}`, {
        amount,
        category,
        note: note || undefined,
        expense_date,
        paid_by: payerId,
        split_type: splitType,
      });

      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["friend-balances", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["friend-expenses", user?.id, variables.friendId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_data"] });
    },
  });
}

/**
 * Mutation hook to delete a 1-on-1 friend expense.
 */
export function useDeleteFriendExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ expenseId, friendId }: { expenseId: string; friendId: string }) => {
      const res = await apiClient.delete(`/api/v1/friends/${friendId}/expenses/${expenseId}`);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["friend-balances", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["friend-expenses", user?.id, variables.friendId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_data"] });
    },
  });
}
