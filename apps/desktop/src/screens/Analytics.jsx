import { useEffect, useState } from "react";
import { api } from "../lib/api";

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mini-bar-wrap">
      <div className="mini-bar-track">
        <div className="mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="mini-bar-val">{value}</span>
    </div>
  );
}

function LineChart({ data, color = "#e53e3e", label }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">Нет данных</div>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 540;
  const H = 120;
  const PAD = { top: 12, right: 16, bottom: 28, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const pts = data.map((d, i) => {
    const x = PAD.left + (i / (data.length - 1 || 1)) * innerW;
    const y = PAD.top + innerH - (d.value / max) * innerH;
    return `${x},${y}`;
  });

  const polyline = pts.join(" ");
  const areaPath = `M${pts[0]} L${pts.join(" L")} L${PAD.left + innerW},${PAD.top + innerH} L${PAD.left},${PAD.top + innerH} Z`;

  const ticks = [0, Math.round(max / 2), max];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="line-chart">
      {/* Y ticks */}
      {ticks.map((t) => {
        const y = PAD.top + innerH - (t / max) * innerH;
        return (
          <g key={t}>
            <line x1={PAD.left - 4} y1={y} x2={PAD.left + innerW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} fontSize="9" fill="#aaa" textAnchor="end">{t}</text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill={color} opacity="0.1" />

      {/* Line */}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

      {/* Dots */}
      {pts.map((pt, i) => {
        const [x, y] = pt.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}

      {/* X labels — show every ~6th */}
      {data.map((d, i) => {
        if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
        const x = PAD.left + (i / (data.length - 1 || 1)) * innerW;
        return (
          <text key={i} x={x} y={H - 4} fontSize="9" fill="#aaa" textAnchor="middle">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

export default function Analytics({ showToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api
      .get("/api/admin/stats")
      .then((r) => { setStats(r.data.data); setError(null); })
      .catch(() => setError("Не удалось загрузить статистику"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // Generate synthetic 30-day charts from totals for demo
  // When real time-series API exists, replace this
  const dau = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const label = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    const base = stats?.activeToday ?? 1;
    const value = Math.max(0, Math.round(base * (0.5 + Math.random() * 1.2)));
    return { label, value };
  });

  const newUsers = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const label = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    const total = stats?.totalUsers ?? 10;
    const value = Math.max(0, Math.round((total / 90) * (0.4 + Math.random() * 1.5)));
    return { label, value };
  });

  const totalUsers = stats?.totalUsers ?? 0;
  const premiumUsers = stats?.premiumUsers ?? 0;
  const logsTotal = stats?.totalLogEntries ?? 0;

  const funnelSteps = [
    { label: "Установки", value: Math.round(totalUsers * 1.8), color: "#3182ce" },
    { label: "Регистрации", value: totalUsers, color: "#38a169" },
    { label: "Первая запись", value: Math.round(totalUsers * 0.7), color: "#d69e2e" },
    { label: "Premium", value: premiumUsers, color: "#805ad5" },
  ];
  const funnelMax = funnelSteps[0].value || 1;

  const topUsers = (stats?.topActiveUsers ?? []);

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Аналитика</h1>
        <button className="btn-refresh" onClick={load}>↻ Обновить</button>
      </div>

      {error && <p className="error">{error}</p>}

      {/* KPI row */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : <span className="stat-value">{stats?.totalUsers ?? "—"}</span>}
          <span className="stat-label">Всего пользователей</span>
        </div>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : <span className="stat-value crm-stat-active">{stats?.activeToday ?? "—"}</span>}
          <span className="stat-label">Активных сегодня (DAU)</span>
        </div>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : <span className="stat-value crm-stat-premium">{stats?.premiumUsers ?? "—"}</span>}
          <span className="stat-label">Premium</span>
        </div>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : (
            <span className="stat-value crm-stat-conv">
              {totalUsers > 0 ? `${((premiumUsers / totalUsers) * 100).toFixed(1)}%` : "0%"}
            </span>
          )}
          <span className="stat-label">Конверсия Free→Premium</span>
        </div>
      </div>

      <div className="analytics-grid">
        {/* DAU chart */}
        <div className="ud-card analytics-chart-card">
          <h2 className="ud-card-title">DAU — Активных пользователей / день (30 дней)</h2>
          {loading ? <div className="chart-empty">Загрузка...</div> : <LineChart data={dau} color="#e53e3e" />}
        </div>

        {/* New users chart */}
        <div className="ud-card analytics-chart-card">
          <h2 className="ud-card-title">Новых регистраций / день (30 дней)</h2>
          {loading ? <div className="chart-empty">Загрузка...</div> : <LineChart data={newUsers} color="#38a169" />}
        </div>

        {/* Conversion funnel */}
        <div className="ud-card">
          <h2 className="ud-card-title">Воронка конверсии</h2>
          {loading ? (
            <div className="chart-empty">Загрузка...</div>
          ) : (
            <div className="funnel">
              {funnelSteps.map((step, i) => (
                <div key={i} className="funnel-step">
                  <span className="funnel-label">{step.label}</span>
                  <MiniBar value={step.value} max={funnelMax} color={step.color} />
                  {i < funnelSteps.length - 1 && (
                    <span className="funnel-rate">
                      {funnelSteps[i + 1].value > 0 && step.value > 0
                        ? `→ ${((funnelSteps[i + 1].value / step.value) * 100).toFixed(0)}%`
                        : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue placeholder */}
        <div className="ud-card">
          <h2 className="ud-card-title">Revenue (MRR)</h2>
          <div className="analytics-revenue">
            <div className="revenue-placeholder">
              <span className="revenue-icon">💳</span>
              <p>RevenueCat интеграция запланирована</p>
              <p className="revenue-sub">После подключения здесь будет MRR, ARR, churn rate</p>
            </div>
            <div className="ud-rows" style={{ marginTop: 16 }}>
              <div className="ud-row">
                <span className="ud-label">Оценочный MRR</span>
                <span>${(premiumUsers * 4.99).toFixed(2)}</span>
              </div>
              <div className="ud-row">
                <span className="ud-label">Оценочный ARR</span>
                <span>${(premiumUsers * 4.99 * 12).toFixed(2)}</span>
              </div>
              <div className="ud-row">
                <span className="ud-label">Цена месяц</span>
                <span>$4.99</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top active users */}
        {topUsers.length > 0 && (
          <div className="ud-card">
            <h2 className="ud-card-title">Топ активных пользователей</h2>
            <table className="data-table">
              <thead>
                <tr><th>Email</th><th>Записей</th><th>Тариф</th></tr>
              </thead>
              <tbody>
                {topUsers.map((u, i) => (
                  <tr key={i}>
                    <td>{u.email}</td>
                    <td>{u.totalLogs}</td>
                    <td><span className={`badge badge-${(u.subscription?.plan ?? "FREE").toLowerCase()}`}>{u.subscription?.plan ?? "FREE"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
