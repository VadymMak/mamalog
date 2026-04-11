import { useEffect, useState } from "react";
import { api } from "../lib/api";

const CARDS = [
  { key: "totalUsers", label: "Всего пользователей" },
  { key: "activeToday", label: "Активных сегодня" },
  { key: "premiumCount", label: "Premium подписок" },
  { key: "pendingSpecialists", label: "Ожидают одобрения" },
  { key: "totalLogEntries", label: "Записей в дневнике" },
  { key: "aiUsageToday", label: "AI запросов сегодня" },
  { key: "totalBookmarks", label: "Закладок всего" },
];

export default function Dashboard({ showToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    api
      .get("/api/admin/stats")
      .then((r) => {
        setStats(r.data.data);
        setError(null);
      })
      .catch(() => setError("Не удалось загрузить статистику"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Аналитика</h1>
        {!loading && (
          <button className="btn-refresh" onClick={() => { setLoading(true); load(); }}>
            ↻ Обновить
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="stats-grid">
        {CARDS.map((c) => (
          <div key={c.key} className="stat-card">
            {loading ? (
              <span className="stat-skeleton" />
            ) : (
              <span className="stat-value">{stats?.[c.key] ?? "—"}</span>
            )}
            <span className="stat-label">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
