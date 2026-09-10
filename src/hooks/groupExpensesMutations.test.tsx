import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/apiClient';
import {
  useAddGroupExpense,
  useBulkAddGroupExpenses,
  useSettleUp,
  useUpdateExpenseStatus,
  useUpdateGroupExpense,
  useDeleteGroupExpense,
  useBulkSettle,
} from './useGroupExpenses';
import {
  useCreateMonthlySettlement,
  useMarkExpensesComplete,
  useLockSettlement,
  useSetMemberExclusion,
} from './useSettlements';

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
  vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'test-id' }, error: null });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 'test-id' }, error: null });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: null, error: null });
});

describe('useGroupExpenses and useSettlements mutations migration', () => {
  it('useAddGroupExpense calls POST /api/v1/groups/:id/expenses and invalidates queries', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useAddGroupExpense(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        groupId: 'group-123',
        amount: 150,
        category: 'food',
        note: 'Team dinner',
        splits: [
          { user_id: 'user-1', amount: 75 },
          { user_id: 'user-2', amount: 75 },
        ],
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/groups/group-123/expenses',
      expect.objectContaining({
        amount: 150,
        category: 'food',
        note: 'Team dinner',
        splits: [
          { user_id: 'user-1', amount: 75 },
          { user_id: 'user-2', amount: 75 },
        ],
      })
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_expenses', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_balances', 'group-123'] });
  });

  it('useBulkAddGroupExpenses calls POST /api/v1/groups/:id/expenses/bulk', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useBulkAddGroupExpenses(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        groupId: 'group-123',
        expenses: [
          { amount: 50, category: 'food', splits: [{ user_id: 'user-1', amount: 50 }] },
          { amount: 30, category: 'bills', splits: [{ user_id: 'user-2', amount: 30 }] },
        ],
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/groups/group-123/expenses/bulk',
      expect.objectContaining({
        expenses: expect.arrayContaining([
          expect.objectContaining({ amount: 50, category: 'food' }),
          expect.objectContaining({ amount: 30, category: 'bills' }),
        ]),
      })
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_expenses', 'group-123'] });
  });

  it('useSettleUp calls POST /api/v1/groups/:id/settle', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useSettleUp(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        groupId: 'group-123',
        fromUserId: 'user-1',
        toUserId: 'user-2',
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/groups/group-123/settle', {
      from_user_id: 'user-1',
      to_user_id: 'user-2',
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_expenses', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_balances', 'group-123'] });
  });

  it('useUpdateExpenseStatus calls PATCH /api/v1/groups/:id/expenses/:expenseId', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useUpdateExpenseStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        expenseId: 'exp-123',
        groupId: 'group-123',
        status: 'approved',
      });
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/v1/groups/group-123/expenses/exp-123',
      { status: 'approved' }
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_expenses', 'group-123'] });
  });

  it('useUpdateGroupExpense calls PATCH /api/v1/groups/:id/expenses/:expenseId', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useUpdateGroupExpense(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        expenseId: 'exp-123',
        groupId: 'group-123',
        amount: 200,
        category: 'food',
        note: 'Updated dinner',
        splits: [{ user_id: 'user-1', amount: 200 }],
      });
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/v1/groups/group-123/expenses/exp-123',
      expect.objectContaining({
        amount: 200,
        category: 'food',
        note: 'Updated dinner',
        splits: [{ user_id: 'user-1', amount: 200 }],
      })
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_expenses', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_balances', 'group-123'] });
  });

  it('useDeleteGroupExpense calls DELETE /api/v1/groups/:id/expenses/:expenseId', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useDeleteGroupExpense(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        expenseId: 'exp-123',
        groupId: 'group-123',
      });
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/groups/group-123/expenses/exp-123');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_expenses', 'group-123'] });
  });

  it('useBulkSettle calls POST /api/v1/groups/:id/reimburse-bulk', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useBulkSettle(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        groupId: 'group-123',
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/groups/group-123/reimburse-bulk');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_expenses', 'group-123'] });
  });

  it('useCreateMonthlySettlement calls POST /api/v1/groups/:id/settlements/:month/:year', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useCreateMonthlySettlement(), { wrapper });

    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'settle-1', group_id: 'group-123', month: 3, year: 2026, status: 'open' },
      error: null,
    });

    await act(async () => {
      await result.current.mutateAsync({
        groupId: 'group-123',
        month: 3,
        year: 2026,
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/groups/group-123/settlements/3/2026',
      { status: 'open' }
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['monthly_settlement', 'group-123', 3, 2026],
    });
  });

  it('useMarkExpensesComplete calls POST /api/v1/groups/:id/settlements/:settlementId/member-status', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useMarkExpensesComplete(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        settlementId: 'settle-1',
        groupId: 'group-123',
        month: 3,
        year: 2026,
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/groups/group-123/settlements/settle-1/member-status',
      { user_id: 'test-user-id', status: 'complete' }
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['member_monthly_status', 'group-123', 'settle-1'],
    });
  });

  it('useLockSettlement calls POST /api/v1/groups/:id/settlements/:month/:year/finalize', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useLockSettlement(), { wrapper });

    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'settle-1', group_id: 'group-123', month: 3, year: 2026, status: 'locked' },
      error: null,
    });

    await act(async () => {
      await result.current.mutateAsync({
        settlementId: 'settle-1',
        groupId: 'group-123',
        month: 3,
        year: 2026,
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/groups/group-123/settlements/3/2026/finalize'
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['monthly_settlement', 'group-123', 3, 2026],
    });
  });

  it('useSetMemberExclusion calls POST /api/v1/groups/:id/exclusions/:month/:year', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useSetMemberExclusion(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        groupId: 'group-123',
        userId: 'user-1',
        month: 3,
        year: 2026,
        targetType: 'partial',
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/groups/group-123/exclusions/3/2026',
      { user_id: 'user-1', exclusion_type: 'partial' }
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['member_exclusions', 'group-123', 3, 2026],
    });
  });
});
