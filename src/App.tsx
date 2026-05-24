import { useEffect, useRef, useState } from "react";
import Dashboard from "./components/Dashboard";
import type { AppData } from "./types";
import { loadAppData, saveAppData } from "./utils/localStorage";
import {
  loadRemoteAppData,
  saveRemoteAppData,
  subscribeToRemoteAppData,
} from "./utils/remoteData";
import { isSupabaseConfigured } from "./utils/supabase";

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncStatus, setSyncStatus] = useState(
    isSupabaseConfigured ? "Connexion Supabase..." : "Mode local",
  );
  const remoteReadyRef = useRef(!isSupabaseConfigured);
  const applyingRemoteRef = useRef(false);

  useEffect(() => {
    saveAppData(data);

    if (!isSupabaseConfigured || !remoteReadyRef.current || applyingRemoteRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveRemoteAppData(data).then(() => setSyncStatus("Synchronisé"));
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [data]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let mounted = true;

    async function hydrateRemoteData() {
      const remoteData = await loadRemoteAppData();
      if (!mounted) return;

      if (remoteData) {
        applyingRemoteRef.current = true;
        setData(remoteData);
        setSyncStatus("Synchronisé");
        window.setTimeout(() => {
          applyingRemoteRef.current = false;
        }, 0);
      } else {
        await saveRemoteAppData(loadAppData());
        setSyncStatus("Synchronisé");
      }

      remoteReadyRef.current = true;
    }

    void hydrateRemoteData();

    const unsubscribe = subscribeToRemoteAppData((remoteData) => {
      applyingRemoteRef.current = true;
      setData(remoteData);
      setSyncStatus("Mis à jour");
      window.setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 0);
    });

    const polling = window.setInterval(async () => {
      const remoteData = await loadRemoteAppData();
      if (!remoteData) return;

      applyingRemoteRef.current = true;
      setData(remoteData);
      setSyncStatus("Synchronisé");
      window.setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 0);
    }, 5_000);

    return () => {
      mounted = false;
      window.clearInterval(polling);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshKey((key) => key + 1);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <Dashboard
      data={data}
      onDataChange={setData}
      refreshKey={refreshKey}
      syncStatus={syncStatus}
    />
  );
}
