import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/apiClient';
import { useAddExpense, useUpdateExpense, useDeleteExpense } from './useExpenses';
import { useCategories } from './useCategories';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'current-user' } }) }));
vi.mock('@/lib/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, invalidate, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockResolvedValue({ data: [], error: null });
  for (const method of ['post', 'patch', 'delete'] as const) {
    vi.mocked(apiClient[method]).mockResolvedValue({ data: { id: 'saved' }, error: null });
  }
});

describe('personal write migration', () => {
  it.each(['create', 'update', 'delete'] as const)('%s refreshes personal, friend and dashboard projections', async operation => {
    const { wrapper, invalidate, client } = setup();
    const { result } = renderHook(() => ({ add: useAddExpense(), update: useUpdateExpense(), remove: useDeleteExpense() }), { wrapper });
    const payload = { amount: 100, category: 'food', splits: [{ user_id: 'current-user', amount: 50 }, { user_id: 'friend', amount: 50 }] };
    await act(async () => {
      if (operation === 'create') await result.current.add.mutateAsync(payload);
      if (operation === 'update') await result.current.update.mutateAsync({ id: 'expense', ...payload });
      if (operation === 'delete') await result.current.remove.mutateAsync('expense');
    });
    if (operation === 'create') expect(apiClient.post).toHaveBeenCalledWith('/api/v1/expenses/personal', payload);
    if (operation === 'update') expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/expenses/expense', payload);
    if (operation === 'delete') expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/expenses/expense');
    for (const key of ['expenses', 'friend-balances', 'friend-expenses', 'dashboard_data']) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] });
    }
    client.clear();
  });

  it('propagates ownership failures without reporting mutation success', async () => {
    const { wrapper, invalidate, client } = setup();
    vi.mocked(apiClient.patch).mockResolvedValue({ data: null, error: 'Personal expense not found' });
    const { result } = renderHook(useUpdateExpense, { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ id: 'someone-elses-expense', note: 'Bad' })).rejects.toThrow('Personal expense not found');
    });
    expect(invalidate).not.toHaveBeenCalled();
    client.clear();
  });
});

it('creates, renames and deletes categories through owned API routes', async () => {
  const { wrapper, client } = setup();
  const { result } = renderHook(useCategories, { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => { await result.current.addCategory('My Hobby'); });
  expect(apiClient.post).toHaveBeenCalledWith('/api/v1/categories/', { name: 'My Hobby' });
  await act(async () => { await result.current.updateCategory({ id: 'category-id', name: 'Leisure' }); });
  expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/categories/category-id', { name: 'Leisure' });
  await act(async () => { await result.current.deleteCategory('category-id'); });
  expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/categories/category-id');
  client.clear();
});
