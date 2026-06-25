import { useState, useEffect, createContext, useContext } from 'react';
import { z } from 'zod';
import { storageGateway } from '../lib/storage-gateway';
import {
  AUTH_TOKEN_KEY,
  BRAIN_ID_KEY,
  LEGACY_AUTH_TOKEN_KEY,
  LEGACY_AUTH_USER_KEY,
} from '../lib/storage-keys';
import { createSafeLogger, safeError } from '../lib/safe-logger';

const logger = createSafeLogger('auth-client');

interface User {
  id: string;
  name: string;
  email?: string | null;
  pseudonym?: string | null;
  brainId?: string | null;
  level?: number;
  experience?: number;
  rating?: number;
  role?: string;
  streakDays?: number;
  _count?: {
    sessions: number;
  };
}

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  pseudonym: z.string().nullable().optional(),
  brainId: z.string().nullable().optional(),
  level: z.number().optional(),
  experience: z.number().optional(),
  rating: z.number().optional(),
  role: z.string().optional(),
  streakDays: z.number().optional(),
  _count: z.object({
    sessions: z.number(),
  }).optional(),
});

const authTokenSchema = z.string().min(1);

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, 
  token: null, 
  login: () => {}, 
  logout: () => {},
  refreshUser: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    storageGateway.ensureSchemaVersion();

    const canonicalToken = storageGateway.get(AUTH_TOKEN_KEY, authTokenSchema);
    const legacyToken = storageGateway.get(LEGACY_AUTH_TOKEN_KEY, authTokenSchema);
    const legacyUser = storageGateway.get(LEGACY_AUTH_USER_KEY, userSchema);

    const resolvedToken = canonicalToken.ok ? canonicalToken.value : legacyToken.ok ? legacyToken.value : null;
    const resolvedUser = legacyUser.ok ? legacyUser.value : null;

    if (legacyToken.ok && legacyToken.value && (!canonicalToken.ok || !canonicalToken.value)) {
      storageGateway.set(AUTH_TOKEN_KEY, legacyToken.value, authTokenSchema);
    }

    if (resolvedUser?.brainId) {
      storageGateway.set(BRAIN_ID_KEY, resolvedUser.brainId, authTokenSchema);
    }

    if (resolvedToken && resolvedUser) {
      setToken(resolvedToken);
      setUser(resolvedUser);
    } else if (!legacyUser.ok) {
      storageGateway.remove(LEGACY_AUTH_USER_KEY);
    }
  }, []);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const result = userSchema.safeParse(data.user);
        if (!result.success) return;

        setUser(result.data);
        storageGateway.set(LEGACY_AUTH_USER_KEY, result.data, userSchema);
      }
    } catch (err) {
      logger.error('User refresh failed', { error: safeError(err) });
    }
  };

  const login = (t: string, u: User) => {
    const userResult = userSchema.safeParse(u);
    const tokenResult = authTokenSchema.safeParse(t);
    if (!userResult.success || !tokenResult.success) return;

    setToken(t);
    setUser(userResult.data);
    storageGateway.set(AUTH_TOKEN_KEY, tokenResult.data, authTokenSchema);
    storageGateway.set(LEGACY_AUTH_TOKEN_KEY, tokenResult.data, authTokenSchema);
    storageGateway.set(LEGACY_AUTH_USER_KEY, userResult.data, userSchema);
    if (userResult.data.brainId) {
      storageGateway.set(BRAIN_ID_KEY, userResult.data.brainId, authTokenSchema);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    storageGateway.remove(AUTH_TOKEN_KEY);
    storageGateway.remove(LEGACY_AUTH_TOKEN_KEY);
    storageGateway.remove(LEGACY_AUTH_USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
