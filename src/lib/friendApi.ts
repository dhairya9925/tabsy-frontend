import { apiClient } from "@/lib/apiClient";
import type { Database } from "@/integrations/supabase/types";

// =============================================
// Email Search (FastAPI endpoint)
// =============================================

export interface ProfileSearchResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export async function searchUserByEmail(email: string): Promise<ProfileSearchResult | null> {
  const res = await apiClient.get<ProfileSearchResult>(
    `/api/v1/users/lookup?email=${encodeURIComponent(email.trim().toLowerCase())}`
  );

  if (res.error) {
    console.error("Email search error:", res.error);
    throw new Error(res.error);
  }

  return res.data ?? null;
}

// =============================================
// Shadow Profile Creation
// =============================================

export interface CreateShadowProfileParams {
  displayName: string;
  email: string;
}

export async function createShadowProfile({ displayName, email }: CreateShadowProfileParams) {
  const res = await apiClient.post<{ profile: any; shadow_user_id: string }>(
    "/api/v1/friends/shadow",
    {
      display_name: displayName,
      email: email.trim(),
    }
  );

  if (res.error) {
    console.error("Create shadow profile error:", res.error);
    throw new Error(res.error);
  }

  return { profile: res.data?.profile, shadowUserId: res.data?.shadow_user_id };
}

// =============================================
// Friend Requests
// =============================================

export async function sendFriendRequest(friendUserId: string): Promise<FriendRecord> {
  const res = await apiClient.post<FriendRecord>('/api/v1/friends/request', {
    user_id: friendUserId,
  });

  if (res.error) {
    console.error("Send friend request error:", res.error);
    throw new Error(res.error);
  }

  return res.data as FriendRecord;
}

export async function acceptFriendRequest(friendshipId: string): Promise<FriendRecord> {
  const res = await apiClient.post<FriendRecord>(`/api/v1/friends/${friendshipId}/accept`);

  if (res.error) {
    console.error("Accept friend request error:", res.error);
    throw new Error(res.error);
  }

  return res.data as FriendRecord;
}

export async function rejectFriendRequest(friendshipId: string): Promise<FriendRecord> {
  const res = await apiClient.post<FriendRecord>(`/api/v1/friends/${friendshipId}/reject`);

  if (res.error) {
    console.error("Reject friend request error:", res.error);
    throw new Error(res.error);
  }

  return res.data as FriendRecord;
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const res = await apiClient.delete(`/api/v1/friends/${friendshipId}`);

  if (res.error) {
    console.error("Remove friend error:", res.error);
    throw new Error(res.error);
  }
}

// =============================================
// Friend Lists
// =============================================

export type FriendStatus = "pending" | "accepted" | "rejected";

export interface FriendRecord {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  created_at: string;
  updated_at: string;
  profile?: {
    user_id: string;
    display_name: string | null;
    email: string | null;
    avatar_url?: string | null;
    is_shadow: boolean;
  };
}

export async function getFriends(): Promise<FriendRecord[]> {
  const res = await apiClient.get<FriendRecord[]>('/api/v1/friends/?status=accepted');
  if (res.error) {
    console.error("Get friends error:", res.error);
    throw new Error(res.error);
  }
  return res.data ?? [];
}

export async function getPendingRequests(): Promise<FriendRecord[]> {
  const res = await apiClient.get<FriendRecord[]>('/api/v1/friends/?status=pending');
  if (res.error) {
    console.error("Get pending requests error:", res.error);
    throw new Error(res.error);
  }
  return res.data ?? [];
}

export async function getSentRequests(): Promise<FriendRecord[]> {
  const res = await apiClient.get<FriendRecord[]>('/api/v1/friends/?status=sent');
  if (res.error) {
    console.error("Get sent requests error:", res.error);
    throw new Error(res.error);
  }
  return res.data ?? [];
}

// =============================================
// Merge Shadow Profile (called after signup)
// =============================================

export async function mergeShadowProfile(shadowUserId: string) {
  const res = await apiClient.post("/api/v1/friends/shadow/merge", {
    shadow_user_id: shadowUserId,
  });

  if (res.error) {
    console.error("Merge shadow profile error:", res.error);
    throw new Error(res.error);
  }
}

// =============================================
// Check for pending shadow profiles (on login)
// =============================================

export interface PendingShadowProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  shadow_created_by: string | null;
}

export async function checkPendingShadowProfiles(): Promise<PendingShadowProfile[]> {
  const res = await apiClient.get<PendingShadowProfile[]>('/api/v1/friends/shadow/pending');

  if (res.error) {
    console.error("Check pending shadows error:", res.error);
    return [];
  }

  return res.data || [];
}
