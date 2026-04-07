import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/admin/stats")
      .then((r) => setStats(r.data.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Всего пользователей", value: stats?.totalUsers ?? "—" },
    { label: "Активных сегодня", value: stats?.activeToday ?? "—" },
    { label: "Ожидают одобрения", value: stats?.pendingSpecialists ?? "—" },
    { label: "Доход MRR", value: stats?.mrr ? `$${stats.mrr}` : "—" },
  ];

  return (
    <div className="screen">
      <h1 className="screen-title">Аналитика</h1>
      {loading ? (
        <p className="loading">Загрузка...</p>
      ) : (
        <div className="stats-grid">
          {cards.map((c) => (
            <div key={c.label} className="stat-card">
              <span className="stat-value">{c.value}</span>
              <span className="stat-label">{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
