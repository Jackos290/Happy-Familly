import { useEffect, useRef, useState } from "react";
import AccessChooser, { type AccessChoice } from "./components/AccessChooser";
import Dashboard from "./components/Dashboard";
import type { AppData } from "./types";
import { loadAppData, saveAppData } from "./utils/localStorage";
import { loadRemoteAppData, saveRemoteAppData } from "./utils/remoteData";

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncStatus, setSyncStatus] = useState("Connexion Supabase...");
  const remoteReadyRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const pendingLocalSaveRef = useRef(false);
  const [accessChoice, setAccessChoice] = useState<AccessChoice | null>(null);

  useEffect(() => {
    saveAppData(data);

    if (!remoteReadyRef.current || applyingRemoteRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveRemoteAppData(data).then((error) => {
        if (!error) {
          pendingLocalSaveRef.current = false;
        }
        setSyncStatus(error ? `Erreur Supabase: ${error}` : "Synchronisé");
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [data]);

  useEffect(() => {
    let mounted = true;

    async function applyRemoteData() {
      const { data: remoteData, error } = await loadRemoteAppData();
      if (!mounted) return;

      if (error) {
        setSyncStatus(`Erreur Supabase: ${error}`);
        return;
      }

      if (remoteData) {
        if (pendingLocalSaveRef.current) {
          return;
        }

        applyingRemoteRef.current = true;
        setData(remoteData);
        setSyncStatus("Synchronisé");
        window.setTimeout(() => {
          applyingRemoteRef.current = false;
        }, 0);
      } else {
        const saveError = await saveRemoteAppData(loadAppData());
        setSyncStatus(saveError ? `Erreur Supabase: ${saveError}` : "Synchronisé");
      }

      remoteReadyRef.current = true;
    }

    void applyRemoteData();

    const polling = window.setInterval(() => {
      void applyRemoteData();
    }, 5_000);

    return () => {
      mounted = false;
      window.clearInterval(polling);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshKey((key) => key + 1);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  function handleDataChange(nextData: AppData) {
    pendingLocalSaveRef.current = true;
    setData(nextData);
  }

  if (!accessChoice) {
    return <AccessChooser data={data} onChoose={setAccessChoice} syncStatus={syncStatus} />;
  }

  return (
    <Dashboard
      data={data}
      onDataChange={handleDataChange}
      refreshKey={refreshKey}
      syncStatus={syncStatus}
      accessMode={accessChoice.type}
      initialMemberId={accessChoice.type === "member" ? accessChoice.memberId : null}
      onBackToChooser={() => setAccessChoice(null)}
    />
  );
}
