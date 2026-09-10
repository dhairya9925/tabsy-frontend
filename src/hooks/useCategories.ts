import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import {
  CATEGORIES,
  DEFAULT_CATEGORY_IDS,
  buildCustomCategory,
  type Category,
} from '@/lib/categories';

/** Row shape returned from the user_categories table. */
interface UserCategoryRow {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  color_index: number;
  created_at: string;
}

/**
 * Hook that provides the merged list of default + custom categories,
 * plus mutations to add and delete custom categories.
 *
 * Categories are fetched per-user from FastAPI and cached via React Query.
 */
export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['user_categories', user?.id];

  // ── Fetch custom categories ──────────────────────────────────────────────

  const {
    data: customRows = [],
    isLoading,
  } = useQuery<UserCategoryRow[]>({
    queryKey,
    queryFn: async () => {
      if (!user) return [];
      const res = await apiClient.get<UserCategoryRow[]>('/api/v1/categories/');
      if (res.error) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: !!user,
  });

  // ── Merge defaults + custom ──────────────────────────────────────────────

  const customCategories: Category[] = customRows.map((row) =>
    buildCustomCategory(row.slug, row.name, row.color_index),
  );

  // All categories: defaults (excluding hidden "system") + custom
  const categories: Category[] = [
    ...CATEGORIES.filter((c) => c.id !== 'system'),
    ...customCategories,
  ];

  // ── Add a custom category ────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated');

      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

      if (!slug || slug.length < 2) {
        throw new Error('Category name is too short');
      }
      if (DEFAULT_CATEGORY_IDS.has(slug)) {
        throw new Error('Cannot use a default category name');
      }

      const res = await apiClient.post<UserCategoryRow>('/api/v1/categories/', { name: name.trim() });
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!user) throw new Error('Not authenticated');
      const res = await apiClient.patch<UserCategoryRow>(`/api/v1/categories/${id}`, { name });
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const res = await apiClient.delete(`/api/v1/categories/${id}`);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    /** Merged list of default + custom categories (system excluded). */
    categories,
    /** Raw custom category rows from the DB. */
    customRows,
    /** Whether the custom categories are still loading. */
    isLoading,
    /** Add a new custom category by name. */
    addCategory: addMutation.mutateAsync,
    /** Rename a category by ID, preserving its slug. */
    updateCategory: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    /** Delete a custom category by ID. */
    deleteCategory: deleteMutation.mutateAsync,
    /** Whether an add mutation is in progress. */
    isAdding: addMutation.isPending,
    /** Whether a delete mutation is in progress. */
    isDeleting: deleteMutation.isPending,
  };
}
