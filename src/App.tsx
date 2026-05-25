import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import AccessChooser, { type AccessChoice } from "./components/AccessChooser";
import Dashboard from "./components/Dashboard";
import type { AppData } from "./types";
import { loadAppData, saveAppData } from "./utils/localStorage";
import { loadRemoteAppData, saveRemoteAppData } from "./utils/remoteData";

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncStatus, setSyncStatus] = useState("Connexion Supabase...");
  const [accessChoice, setAccessChoice] = useState<AccessChoice | null>(null);
  const remoteReadyRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const pendingLocalSaveRef = useRef(false);
  const savingRemoteRef = useRef(false);
  const lastRemoteUpdatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    saveAppData(data);

    if (!remoteReadyRef.current || applyingRemoteRef.current || !pendingLocalSaveRef.current) {
      return;
    }

    setSyncStatus("Sauvegarde...");
    const timeout = window.setTimeout(() => {
      savingRemoteRef.current = true;

      void saveRemoteAppData(data).then((result) => {
        savingRemoteRef.current = false;
        pendingLocalSaveRef.current = false;

        if (result.updatedAt) {
          lastRemoteUpdatedAtRef.current = result.updatedAt;
        }

        setSyncStatus(result.error ? `Erreur Supabase: ${result.error}` : "Synchronisé");
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [data]);

  useEffect(() => {
    let mounted = true;

    async function applyRemoteData() {
      const { data: remoteData, updatedAt, error } = await loadRemoteAppData();
      if (!mounted) return;

      if (error) {
        remoteReadyRef.current = true;
        setSyncStatus(`Erreur Supabase: ${error}`);
        return;
      }

      if (remoteData) {
        if (savingRemoteRef.current) {
          return;
        }

        const hasNewRemoteData = !updatedAt || updatedAt !== lastRemoteUpdatedAtRef.current;
        if (hasNewRemoteData) {
          applyingRemoteRef.current = true;
          lastRemoteUpdatedAtRef.current = updatedAt;
          setData(remoteData);
          setSyncStatus("Synchronisé");
          window.setTimeout(() => {
            applyingRemoteRef.current = false;
          }, 0);
        } else {
          setSyncStatus("Synchronisé");
        }
      } else {
        const result = await saveRemoteAppData(loadAppData());
        if (result.updatedAt) {
          lastRemoteUpdatedAtRef.current = result.updatedAt;
        }
        setSyncStatus(result.error ? `Erreur Supabase: ${result.error}` : "Synchronisé");
      }

      remoteReadyRef.current = true;
    }

    void applyRemoteData();

    const polling = window.setInterval(() => {
      void applyRemoteData();
    }, 2_500);

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
    return (
      <AppErrorBoundary>
        <AccessChooser data={data} onChoose={setAccessChoice} syncStatus={syncStatus} />
      </AppErrorBoundary>
    );
  }

  return (
    <AppErrorBoundary>
      <Dashboard
        data={data}
        onDataChange={handleDataChange}
        refreshKey={refreshKey}
        syncStatus={syncStatus}
        accessMode={accessChoice.type}
        initialMemberId={accessChoice.type === "member" ? accessChoice.memberId : null}
        onBackToChooser={() => setAccessChoice(null)}
      />
    </AppErrorBoundary>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue" };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950">
          <section className="max-w-lg rounded-[2rem] bg-white p-6 shadow-glass">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-rose-600">Erreur affichage</p>
            <h1 className="mt-2 text-2xl font-black">L'application a évité l'écran blanc.</h1>
            <p className="mt-3 font-semibold text-slate-600">{this.state.error}</p>
            <button
              className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white"
              onClick={() => window.location.reload()}
            >
              Recharger
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
