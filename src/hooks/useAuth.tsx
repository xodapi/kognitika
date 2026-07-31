import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { z } from 'zod';
import { storageGateway } from '../lib/storage-gateway';
import { createSafeLogger, safeError } from '../lib/safe-logger';
import { identityVault } from '../lib/identity-vault';
import { apiUrl } from '../lib/runtime-platform';

const logger = createSafeLogger('auth-client');

interface User {
  id: string;
  name: string;
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
  isReady: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, 
  token: null, 
  isReady: false,
  login: async () => {},
  logout: async () => false,
  refreshUser: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const sessionEpochRef = useRef(0);
  const refreshAbortControllerRef = useRef<AbortController | null>(null);
  const identityQueueRef = useRef(Promise.resolve());

  const queueIdentityOperation = <T,>(operation: () => Promise<T>) => {
    const queued = identityQueueRef.current.then(operation, operation);
    identityQueueRef.current = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  };

  useEffect(() => {
    let active = true;

    const hydrateIdentity = async () => {
      const sessionEpoch = sessionEpochRef.current;
      storageGateway.ensureSchemaVersion();
      try {
        const stored = await identityVault.load();
        if (!stored || !active || sessionEpoch !== sessionEpochRef.current) return;

        const tokenResult = authTokenSchema.safeParse(stored.token);
        const userResult = userSchema.safeParse(stored.user);
        if (!tokenResult.success || !userResult.success) {
          await identityVault.clear();
          return;
        }

        if (sessionEpoch === sessionEpochRef.current) {
          setToken(tokenResult.data);
          setUser(userResult.data);
        }
      } catch (err) {
        logger.error('Identity hydration failed', { error: safeError(err) });
      } finally {
        if (active) setIsReady(true);
      }
    };

    void hydrateIdentity();
    return () => {
      active = false;
      refreshAbortControllerRef.current?.abort();
    };
  }, []);

  const refreshUser = async () => {
    if (!token) return;
    const sessionEpoch = sessionEpochRef.current;
    refreshAbortControllerRef.current?.abort();
    const controller = new AbortController();
    refreshAbortControllerRef.current = controller;

    try {
      const res = await fetch(apiUrl('/api/me'), {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        const result = userSchema.safeParse(data.user);
        if (!result.success) return;

        const committed = await queueIdentityOperation(async () => {
          if (sessionEpoch !== sessionEpochRef.current) return false;
          await identityVault.save({
            token,
            user: result.data,
            brainId: result.data.brainId,
          });
          return sessionEpoch === sessionEpochRef.current;
        });
        if (committed) setUser(result.data);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      logger.error('User refresh failed', { error: safeError(err) });
    } finally {
      if (refreshAbortControllerRef.current === controller) {
        refreshAbortControllerRef.current = null;
      }
    }
  };

  const login = async (t: string, u: User) => {
    const userResult = userSchema.safeParse(u);
    const tokenResult = authTokenSchema.safeParse(t);
    if (!userResult.success || !tokenResult.success) return;

    const sessionEpoch = ++sessionEpochRef.current;
    refreshAbortControllerRef.current?.abort();
    const committed = await queueIdentityOperation(async () => {
      if (sessionEpoch !== sessionEpochRef.current) return false;
      await identityVault.save({
        token: tokenResult.data,
        user: userResult.data,
        brainId: userResult.data.brainId,
      });
      return sessionEpoch === sessionEpochRef.current;
    });
    if (committed) {
      setToken(tokenResult.data);
      setUser(userResult.data);
    }
  };

  const logout = async () => {
    sessionEpochRef.current += 1;
    refreshAbortControllerRef.current?.abort();
    try {
      await queueIdentityOperation(() => identityVault.clear());
      setToken(null);
      setUser(null);
      return true;
    } catch (err) {
      logger.error('Identity logout failed', { error: safeError(err) });
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isReady, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
