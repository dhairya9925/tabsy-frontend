import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/apiClient';
import {
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useAddGroupMember,
  useRemoveGroupMember,
  useJoinGroup,
  useUpdateMemberRole,
} from './useGroups';

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
  vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'group-123', name: 'Apartment' }, error: null });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 'group-123', name: 'Updated Apartment' }, error: null });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: null, error: null });
});

describe('useGroups mutations migration', () => {
  it('useCreateGroup calls POST /api/v1/groups/ and invalidates queries', async () => {
    const { wrapper, invalidate, client } = setup();
    const { result } = renderHook(() => useCreateGroup(), { wrapper });

    const payload = {
      name: 'Flat 402',
      description: 'Roommates expenses',
      type: 'home',
      monthly_rent: 1200,
    };

    let res: unknown;
    await act(async () => {
      res = await result.current.mutateAsync(payload);
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/groups/', payload);
    expect(res).toEqual({ id: 'group-123', name: 'Apartment' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard_data'] });
    client.clear();
  });

  it('useUpdateGroup calls PATCH /api/v1/groups/{id} and invalidates group & expense queries', async () => {
    const { wrapper, invalidate, client } = setup();
    const { result } = renderHook(() => useUpdateGroup(), { wrapper });

    const updates = { name: 'Flat 402 Renovated', monthly_rent: 1300 };
    await act(async () => {
      await result.current.mutateAsync({ id: 'group-123', updates });
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/groups/group-123', updates);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['groups', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_expenses', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_balances', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard_data'] });
    client.clear();
  });

  it('useDeleteGroup calls DELETE /api/v1/groups/{id} and invalidates group & dashboard queries', async () => {
    const { wrapper, invalidate, client } = setup();
    const { result } = renderHook(() => useDeleteGroup(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('group-123');
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/groups/group-123');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard_data'] });
    client.clear();
  });

  it('useAddGroupMember calls POST /api/v1/groups/{groupId}/members and invalidates queries', async () => {
    const { wrapper, invalidate, client } = setup();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'member-1', group_id: 'group-123', user_id: 'user-456', role: 'member' },
      error: null,
    });

    const { result } = renderHook(() => useAddGroupMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        groupId: 'group-123',
        email: 'roommate@example.com',
        role: 'member',
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/groups/group-123/members', {
      email: 'roommate@example.com',
      user_id: undefined,
      role: 'member',
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_members', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['groups', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_balances', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard_data'] });
    client.clear();
  });

  it('useRemoveGroupMember calls DELETE /api/v1/groups/{groupId}/members/{userId} and invalidates queries', async () => {
    const { wrapper, invalidate, client } = setup();
    const { result } = renderHook(() => useRemoveGroupMember(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ groupId: 'group-123', userId: 'user-456' });
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/groups/group-123/members/user-456');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_members', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['groups', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_balances', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard_data'] });
    client.clear();
  });

  it('useJoinGroup calls POST /api/v1/groups/{groupId}/join and invalidates queries', async () => {
    const { wrapper, invalidate, client } = setup();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'member-new', group_id: 'group-123', user_id: 'test-user-id', role: 'member' },
      error: null,
    });

    const { result } = renderHook(() => useJoinGroup(), { wrapper });

    let joinedId: unknown;
    await act(async () => {
      joinedId = await result.current.mutateAsync('group-123');
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/groups/group-123/join');
    expect(joinedId).toBe('group-123');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_members', 'group-123'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard_data'] });
    client.clear();
  });

  it('useUpdateMemberRole calls PATCH /api/v1/groups/{groupId}/members/{userId} and invalidates queries', async () => {
    const { wrapper, invalidate, client } = setup();
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { id: 'member-1', group_id: 'group-123', user_id: 'user-456', role: 'admin' },
      error: null,
    });

    const { result } = renderHook(() => useUpdateMemberRole(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ groupId: 'group-123', userId: 'user-456', role: 'admin' });
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/groups/group-123/members/user-456', {
      role: 'admin',
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group_members', 'group-123'] });
    client.clear();
  });

  it('handles backend error responses and rejects mutation without invalidating', async () => {
    const { wrapper, invalidate, client } = setup();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: null,
      error: 'Only group admins can add members',
    });

    const { result } = renderHook(() => useAddGroupMember(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ groupId: 'group-123', email: 'intruder@example.com' })
      ).rejects.toThrow('Only group admins can add members');
    });

    expect(invalidate).not.toHaveBeenCalled();
    client.clear();
  });
});
