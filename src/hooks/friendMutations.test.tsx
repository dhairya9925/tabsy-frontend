import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/apiClient';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from '@/lib/friendApi';
import { recordFriendPayment } from '@/lib/friendExpensesApi';
import {
  useUpdateFriendExpense,
  useDeleteFriendExpense,
  useRecordFriendPayment,
} from './useFriendExpenses';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id', email: 'test@example.com' } }),
}));

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, invalidate, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockResolvedValue({ data: [], error: null });
  vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'friend-123' }, error: null });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 'exp-123' }, error: null });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: null, error: null });
});

describe('friendApi write migrations', () => {
  it('sendFriendRequest calls POST /api/v1/friends/request', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'req-1', user_id: 'test-user-id', friend_id: 'target-user', status: 'pending' },
      error: null,
    });

    const res = await sendFriendRequest('target-user');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/friends/request', {
      user_id: 'target-user',
    });
    expect(res.status).toBe('pending');
  });

  it('acceptFriendRequest calls POST /api/v1/friends/{id}/accept', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'f-1', user_id: 'target-user', friend_id: 'test-user-id', status: 'accepted' },
      error: null,
    });

    const res = await acceptFriendRequest('f-1');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/friends/f-1/accept');
    expect(res.status).toBe('accepted');
  });

  it('rejectFriendRequest calls POST /api/v1/friends/{id}/reject', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'f-1', user_id: 'target-user', friend_id: 'test-user-id', status: 'rejected' },
      error: null,
    });

    const res = await rejectFriendRequest('f-1');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/friends/f-1/reject');
    expect(res.status).toBe('rejected');
  });

  it('removeFriend calls DELETE /api/v1/friends/{id}', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { id: 'f-1' }, error: null });

    await removeFriend('f-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/friends/f-1');
  });

  it('throws error when friendApi calls return an error', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: null, error: 'A friend request is already pending' });

    await expect(sendFriendRequest('target-user')).rejects.toThrow('A friend request is already pending');
  });
});

describe('1-on-1 friend expense writes', () => {
  it('recordFriendPayment calls POST /api/v1/friends/{friendId}/expenses with payment details', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'pay-exp-1', category: 'payment', amount: 50 },
      error: null,
    });

    const res = await recordFriendPayment('friend-456', 50);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/friends/friend-456/expenses',
      expect.objectContaining({
        amount: 50,
        category: 'payment',
        note: 'Settlement payment',
        split_type: 'full',
      })
    );
    expect(res).toEqual({ id: 'pay-exp-1', category: 'payment', amount: 50 });
  });

  it('useUpdateFriendExpense calls PATCH /api/v1/friends/{friendId}/expenses/{expenseId} and invalidates queries', async () => {
    const { wrapper, invalidate, client } = setup();
    const { result } = renderHook(() => useUpdateFriendExpense(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        expenseId: 'exp-123',
        friendId: 'friend-456',
        amount: 120,
        category: 'food',
        note: 'Team lunch',
        expense_date: '2026-09-10',
        paidBy: 'me',
        splitType: 'equal',
      });
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/friends/friend-456/expenses/exp-123', {
      amount: 120,
      category: 'food',
      note: 'Team lunch',
      expense_date: '2026-09-10',
      paid_by: 'test-user-id',
      split_type: 'equal',
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friend-balances', 'test-user-id'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friend-expenses', 'test-user-id', 'friend-456'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard_data'] });
    client.clear();
  });

  it('useDeleteFriendExpense calls DELETE /api/v1/friends/{friendId}/expenses/{expenseId} and invalidates queries', async () => {
    const { wrapper, invalidate, client } = setup();
    const { result } = renderHook(() => useDeleteFriendExpense(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        expenseId: 'exp-123',
        friendId: 'friend-456',
      });
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/friends/friend-456/expenses/exp-123');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friend-balances', 'test-user-id'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friend-expenses', 'test-user-id', 'friend-456'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard_data'] });
    client.clear();
  });

  it('useRecordFriendPayment calls recordFriendPayment and invalidates queries', async () => {
    const { wrapper, invalidate, client } = setup();
    const { result } = renderHook(() => useRecordFriendPayment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        friendId: 'friend-456',
        amount: 80,
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/friends/friend-456/expenses',
      expect.objectContaining({
        amount: 80,
        category: 'payment',
      })
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friend-balances', 'test-user-id'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friend-expenses', 'test-user-id', 'friend-456'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['expenses', 'test-user-id'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard_data'] });
    client.clear();
  });

  it('propagates errors without updating cache', async () => {
    const { wrapper, invalidate, client } = setup();
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: null,
      error: 'Shared expense not found',
    });

    const { result } = renderHook(() => useUpdateFriendExpense(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          expenseId: 'bad-id',
          friendId: 'friend-456',
          amount: 50,
          category: 'food',
          expense_date: '2026-09-10',
          paidBy: 'me',
          splitType: 'equal',
        })
      ).rejects.toThrow('Shared expense not found');
    });

    expect(invalidate).not.toHaveBeenCalled();
    client.clear();
  });
});
