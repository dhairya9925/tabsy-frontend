import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  type: string;
  monthly_rent?: number | null;
  sponsor_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export const useGroups = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async () => {
      const res = await apiClient.get<Group[]>('/api/v1/groups/');
      if (res.error) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: !!user,
  });
};

export const useGroup = (groupId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['groups', groupId],
    queryFn: async () => {
      const res = await apiClient.get<Group>(`/api/v1/groups/${groupId}`);
      if (res.error) throw new Error(res.error);
      return res.data as Group;
    },
    enabled: !!user && !!groupId,
  });
};

export const useGroupMembers = (groupId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group_members', groupId],
    queryFn: async () => {
      const res = await apiClient.get<GroupMember[]>(`/api/v1/groups/${groupId}/members`);
      if (res.error) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: !!user && !!groupId,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      type: string;
      sponsor_id?: string;
      monthly_rent?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const res = await apiClient.post<Group>('/api/v1/groups/', payload);
      if (res.error) throw new Error(res.error);
      return res.data as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Group> }) => {
      const res = await apiClient.patch<Group>(`/api/v1/groups/${id}`, updates);
      if (res.error) throw new Error(res.error);
      return res.data as Group;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', data.id] });
      queryClient.invalidateQueries({ queryKey: ['group_expenses', data.id] });
      queryClient.invalidateQueries({ queryKey: ['group_balances', data.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const res = await apiClient.delete(`/api/v1/groups/${groupId}`);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
    },
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      email,
      userId,
      role,
    }: {
      groupId: string;
      email?: string;
      userId?: string;
      role?: 'admin' | 'member';
    }) => {
      const res = await apiClient.post<GroupMember>(`/api/v1/groups/${groupId}/members`, {
        email: email || undefined,
        user_id: userId || undefined,
        role: role || 'member',
      });
      if (res.error) throw new Error(res.error);
      return res.data as GroupMember;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group_members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group_balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const res = await apiClient.delete(`/api/v1/groups/${groupId}/members/${userId}`);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group_members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group_balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
    },
  });
};

export const useJoinGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('You must be logged in to join a group');

      const res = await apiClient.post<GroupMember>(`/api/v1/groups/${groupId}/join`);
      if (res.error) throw new Error(res.error);

      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group_members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      role,
    }: {
      groupId: string;
      userId: string;
      role: 'admin' | 'member';
    }) => {
      const res = await apiClient.patch<GroupMember>(
        `/api/v1/groups/${groupId}/members/${userId}`,
        { role }
      );
      if (res.error) throw new Error(res.error);
      return res.data as GroupMember;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group_members', groupId] });
    },
  });
};

