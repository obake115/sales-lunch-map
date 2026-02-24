import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { maybeRequestReview } from '../domain/review';
import { syncGeofencing } from '../geofencing';
import type { Store } from '../models';
import * as storage from '../storage';
import { pushWidgetData } from '../widgetData';

type StoresContextValue = {
  loading: boolean;
  stores: Store[];
  refresh: () => Promise<void>;
  addStore: (input: { name: string; placeId?: string; latitude: number; longitude: number; note?: string }) => Promise<Store>;
  updateStore: (storeId: string, patch: Partial<Omit<Store, 'id' | 'createdAt'>>) => Promise<Store | null>;
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
    if (stores.length > 0) return;
    (async () => {
      const created = await storage.ensureSampleStore();
      if (created) {
        await refresh();
      }
    })();
  }, [loading, stores.length, refresh]);

  useEffect(() => {
    if (loading) return;
    // keep geofencing regions in sync with enabled stores
    syncGeofencing(stores);
    // push data to iOS widget
    pushWidgetData(stores);
  }, [stores, loading]);

  const addStore = useCallback(
    async (input: { name: string; placeId?: string; latitude: number; longitude: number; note?: string }) => {
      const created = await storage.addStore(input);
      await refresh();
      const count = await storage.getStoreCount();
      maybeRequestReview(count).catch(() => {});
      return created;
    },
    [refresh]
  );

  const updateStore = useCallback(
    async (storeId: string, patch: Partial<Omit<Store, 'id' | 'createdAt'>>) => {
      const updated = await storage.updateStore(storeId, patch);
      await refresh();
      return updated;
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
      updateStore,
      setStoreEnabled,
      deleteStore,
    }),
    [loading, stores, refresh, addStore, updateStore, setStoreEnabled, deleteStore]
  );

  return <StoresContext value={value}>{children}</StoresContext>;
}

export function useStores() {
  const ctx = useContext(StoresContext);
  if (!ctx) throw new Error('useStores must be used within StoresProvider');
  return ctx;
}

