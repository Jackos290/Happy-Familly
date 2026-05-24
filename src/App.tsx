import { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import { loadAppData, saveAppData } from "./utils/localStorage";
import type { AppData } from "./types";

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      window.location.reload();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <Dashboard data={data} onDataChange={setData} />
  );
}
