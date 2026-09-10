import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient, getAuthToken, setAuthToken } from '@/lib/apiClient';

export interface User {
  id: string;
  email?: string | null;
  display_name?: string | null;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface AuthContextType {
  session: { access_token: string } | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null; needsVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (): Promise<Profile | null> => {
    const res = await apiClient.get<Profile>('/api/v1/users/me');
    if (res.data) {
      setProfile(res.data);
      setUser({
        id: res.data.user_id,
        email: res.data.email,
        display_name: res.data.display_name,
      });
      return res.data;
    }
    return null;
  };

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchProfile()
        .then((p) => {
          if (!p) {
            setAuthToken(null);
            setUser(null);
            setProfile(null);
          }
        })
        .catch(() => {
          setAuthToken(null);
          setUser(null);
          setProfile(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const res = await apiClient.post<{ access_token: string; user: Profile }>(
        '/api/v1/auth/signup',
        {
          email,
          password,
          display_name: displayName || undefined,
        }
      );

      if (res.error || !res.data) {
        return { error: new Error(res.error || 'Failed to sign up'), needsVerification: false };
      }

      setAuthToken(res.data.access_token);
      setProfile(res.data.user);
      setUser({
        id: res.data.user.user_id,
        email: res.data.user.email,
        display_name: res.data.user.display_name,
      });

      return { error: null, needsVerification: false };
    } catch (err: any) {
      return { error: err, needsVerification: false };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await apiClient.post<{ access_token: string; user: Profile }>(
        '/api/v1/auth/login',
        { email, password }
      );

      if (res.error || !res.data) {
        return { error: new Error(res.error || 'Invalid email or password') };
      }

      setAuthToken(res.data.access_token);
      setProfile(res.data.user);
      setUser({
        id: res.data.user.user_id,
        email: res.data.user.email,
        display_name: res.data.user.display_name,
      });

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch {
      // Ignore network failure on logout
    } finally {
      setAuthToken(null);
      setUser(null);
      setProfile(null);
    }
  };

  const deleteAccount = async () => {
    try {
      const res = await apiClient.delete('/api/v1/auth/account');
      if (res.error) {
        return { error: new Error(res.error) };
      }
      setAuthToken(null);
      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const refreshProfile = async () => {
    if (getAuthToken()) {
      await fetchProfile();
    }
  };

  const token = getAuthToken();
  const session = token ? { access_token: token } : null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        deleteAccount,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
