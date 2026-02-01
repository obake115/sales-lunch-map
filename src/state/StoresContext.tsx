import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import type { Store } from '../models';
import * as storage from '../storage';
import { syncGeofencing } from '../geofencing';

type StoresContextValue = {
  loading: boolean;
  stores: Store[];
  refresh: () => Promise<void>;
  addStore: (input: { name: string; latitude: number; longitude: number }) => Promise<Store>;
  setStoreEnabled: (storeId: string, enabled: boolean) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
};

const StoresContext = createContext<StoresContextValue | null>(null);

export function StoresProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);

  const refresh = useCallback(async () => {
    const next = await storage.getStores();
    setStores(next);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    // keep geofencing regions in sync with enabled stores
    syncGeofencing(stores);
  }, [stores, loading]);

  const addStore = useCallback(
    async (input: { name: string; latitude: number; longitude: number }) => {
      const created = await storage.addStore(input);
      await refresh();
      return created;
    },
    [refresh]
  );

  const setStoreEnabled = useCallback(
    async (storeId: string, enabled: boolean) => {
      await storage.setStoreEnabled(storeId, enabled);
      await refresh();
    },
    [refresh]
  );

  const deleteStore = useCallback(
    async (storeId: string) => {
      await storage.deleteStore(storeId);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      loading,
      stores,
      refresh,
      addStore,
      setStoreEnabled,
      deleteStore,
    }),
    [loading, stores, refresh, addStore, setStoreEnabled, deleteStore]
  );

  return <StoresContext value={value}>{children}</StoresContext>;
}

export function useStores() {
  const ctx = useContext(StoresContext);
  if (!ctx) throw new Error('useStores must be used within StoresProvider');
  return ctx;
}

