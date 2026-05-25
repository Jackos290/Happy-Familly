import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import AccessChooser, { type AccessChoice } from "./components/AccessChooser";
import Dashboard from "./components/Dashboard";
import type { AppData } from "./types";
import { loadGoogleCalendarEvents } from "./utils/googleCalendar";
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
  const localDataRef = useRef(data);

  useEffect(() => {
    localDataRef.current = data;
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

        if (error.toLowerCase().includes("statement timeout")) {
          const result = await saveRemoteAppData(localDataRef.current);
          if (result.updatedAt) {
            lastRemoteUpdatedAtRef.current = result.updatedAt;
          }
          setSyncStatus(result.error ? `Erreur Supabase: ${result.error}` : "Synchronisé");
        }
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
          setData(mergeLocalAssets(remoteData, localDataRef.current));
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

  useEffect(() => {
    let running = false;

    async function syncGoogleCalendars() {
      if (running) return;

      const membersWithCalendar = (localDataRef.current.familyMembers ?? []).filter((member) =>
        member.googleCalendarUrl?.trim(),
      );

      if (membersWithCalendar.length === 0) return;

      running = true;
      setSyncStatus("Sync Google...");

      try {
        const importedEvents = (
          await Promise.all(
            membersWithCalendar.map((member) =>
              loadGoogleCalendarEvents(member.googleCalendarUrl ?? "", member.id),
            ),
          )
        ).flat();
        const syncedMemberIds = new Set(membersWithCalendar.map((member) => member.id));
        const currentData = localDataRef.current;

        handleDataChange({
          ...currentData,
          calendarEvents: [
            ...(currentData.calendarEvents ?? []).filter(
              (event) => !(event.source === "google" && event.personId && syncedMemberIds.has(event.personId)),
            ),
            ...importedEvents,
          ],
        });
        setSyncStatus("Google synchronisé");
      } catch (error) {
        setSyncStatus(error instanceof Error ? `Erreur Google: ${error.message}` : "Erreur Google Calendar");
      } finally {
        running = false;
      }
    }

    const firstSync = window.setTimeout(() => {
      void syncGoogleCalendars();
    }, 10_000);
    const interval = window.setInterval(() => {
      void syncGoogleCalendars();
    }, 15 * 60_000);

    return () => {
      window.clearTimeout(firstSync);
      window.clearInterval(interval);
    };
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

function mergeLocalAssets(remoteData: AppData, localData: AppData): AppData {
  const localMembersById = new Map((localData.familyMembers ?? []).map((member) => [member.id, member]));
  const localShoppingById = new Map((localData.shoppingItems ?? []).map((item) => [item.id, item]));

  return {
    ...remoteData,
    familyMembers: (remoteData.familyMembers ?? []).map((member) => ({
      ...member,
      photoUrl: member.photoUrl ?? localMembersById.get(member.id)?.photoUrl,
    })),
    shoppingItems: (remoteData.shoppingItems ?? []).map((item) => ({
      ...item,
      photoUrl: item.photoUrl ?? localShoppingById.get(item.id)?.photoUrl,
    })),
  };
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
