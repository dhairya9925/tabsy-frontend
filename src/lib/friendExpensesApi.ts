import { apiClient } from "@/lib/apiClient";
import { roundMoney } from "@/utils/money";

export interface FriendBalance {
  friendId: string;
  netBalance: number; // Positive = friend owes user, Negative = user owes friend
}

export interface FriendExpenseFeedItem {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string | null;
  expense_date: string;
  paid_by: string;
  created_at: string;
  edited_at: string | null;
  // Included splits for this specific expense
  expense_splits: {
    user_id: string;
    amount: number;
    is_settled: boolean;
  }[];
}

/**
 * Fetch the running balance current user has against every friend.
 * Returns an array of net balances.
 */
export async function getFriendBalances(): Promise<FriendBalance[]> {
  const res = await apiClient.get<FriendBalance[]>('/api/v1/friends/balances');
  if (res.error) {
    console.error("Error fetching friend balances:", res.error);
    throw new Error(res.error);
  }
  return res.data ?? [];
}

/**
 * Fetch the exact non-group expenses shared linearly between the user and a specific friend.
 */
export async function getFriendExpenses(friendId: string): Promise<FriendExpenseFeedItem[]> {
  const res = await apiClient.get<FriendExpenseFeedItem[]>(`/api/v1/friends/${friendId}/expenses`);
  if (res.error) {
    console.error("Error fetching friend expenses:", res.error);
    throw new Error(res.error);
  }
  return res.data ?? [];
}

/**
 * Helper to record a payment / settlement between 1-on-1 friends.
 * The SENDER pays SENDER (cost 0), RECEIVER owes SENDER the full amount.
 */
export async function recordFriendPayment(friendId: string, amount: number, payerId?: string) {
  if (amount <= 0) throw new Error("Payment amount must be greater than 0");

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;

  const res = await apiClient.post<FriendExpenseFeedItem>(`/api/v1/friends/${friendId}/expenses`, {
    amount,
    category: "payment",
    note: "Settlement payment",
    expense_date: formattedDate,
    paid_by: payerId || undefined,
    split_type: "full",
  });

  if (res.error) {
    console.error("Error generating settlement expense record:", res.error);
    throw new Error(res.error);
  }

  return res.data;
}
