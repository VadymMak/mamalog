import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function UserDetail({ user, onBack, showToast }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api
      .get(`/api/admin/users/${user.id}`)
      .then((r) => {
        setDetail(r.data.data);
        setError(null);
      })
      .catch(() => {
        // Fallback: use the data we already have from the list
        setDetail(user);
        setError(null);
      })
      .finally(() => setLoading(false));
  }, [user]);

  async function toggleSuperuser() {
    setTogglingId(true);
    try {
      await api.post(`/api/admin/users/${user.id}/superuser`);
      setDetail((prev) => ({ ...prev, isSuperUser: !prev.isSuperUser }));
      showToast(detail?.isSuperUser ? "Superuser снят" : "Пользователь стал Superuser");
    } catch {
      showToast("Не удалось изменить статус", "error");
    } finally {
      setTogglingId(false);
    }
  }

  const d = detail ?? user;
  const plan = d?.subscription?.plan ?? "FREE";
  const isPremium = plan === "MONTHLY" || plan === "YEARLY";

  return (
    <div className="screen">
      {/* Back */}
      <div className="screen-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-refresh" onClick={onBack}>← Назад</button>
          <h1 className="screen-title" style={{ marginBottom: 0 }}>
            {d?.name ?? d?.email ?? "Пользователь"}
          </h1>
          {d?.isSuperUser && <span className="badge badge-superuser">★ Superuser</span>}
        </div>
      </div>

      {loading && <div className="spinner-wrap"><div className="spinner" /></div>}
      {error && <p className="error">{error}</p>}

      {!loading && d && (
        <div className="ud-layout">
          {/* Left column */}
          <div className="ud-left">
            {/* Profile card */}
            <div className="ud-card">
              <h2 className="ud-card-title">Профиль</h2>
              <div className="ud-rows">
                <div className="ud-row"><span className="ud-label">Email</span><span>{d.email}</span></div>
                <div className="ud-row"><span className="ud-label">Имя</span><span>{d.name ?? "—"}</span></div>
                <div className="ud-row"><span className="ud-label">Язык</span><span>{(d.language ?? "ru").toUpperCase()}</span></div>
                <div className="ud-row">
                  <span className="ud-label">Тариф</span>
                  <span className={`badge ${isPremium ? (plan === "MONTHLY" ? "badge-monthly" : "badge-yearly") : "badge-free"}`}>
                    {plan}
                  </span>
                </div>
                <div className="ud-row">
                  <span className="ud-label">Регистрация</span>
                  <span>{d.createdAt ? new Date(d.createdAt).toLocaleDateString("ru-RU") : "—"}</span>
                </div>
                <div className="ud-row">
                  <span className="ud-label">Последняя активность</span>
                  <span>{d.lastActiveAt ? new Date(d.lastActiveAt).toLocaleDateString("ru-RU") : "—"}</span>
                </div>
              </div>
            </div>

            {/* Child info */}
            <div className="ud-card">
              <h2 className="ud-card-title">Ребёнок</h2>
              <div className="ud-rows">
                <div className="ud-row"><span className="ud-label">Имя</span><span>{d.childName ?? "—"}</span></div>
                <div className="ud-row"><span className="ud-label">Возраст</span><span>{d.childAge != null ? `${d.childAge} лет` : "—"}</span></div>
                <div className="ud-row"><span className="ud-label">Диагноз</span><span>{d.diagnosis ?? "—"}</span></div>
              </div>
            </div>

            {/* Actions */}
            <div className="ud-card">
              <h2 className="ud-card-title">Действия</h2>
              <div className="ud-action-btns">
                <button
                  className={`btn ${d.isSuperUser ? "btn-reject" : "btn-approve"}`}
                  onClick={toggleSuperuser}
                  disabled={togglingId}
                >
                  {togglingId ? "..." : d.isSuperUser ? "Снять Superuser" : "Сделать Superuser"}
                </button>
                <button
                  className="btn"
                  style={{ background: "#3182ce", color: "#fff" }}
                  onClick={() => showToast("Email — в разработке", "error")}
                >
                  ✉ Отправить email
                </button>
                <button
                  className="btn btn-reject"
                  onClick={() => showToast("Блокировка — в разработке", "error")}
                >
                  Заблокировать
                </button>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="ud-right">
            {/* Stats */}
            <div className="ud-card">
              <h2 className="ud-card-title">Статистика</h2>
              <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
                <div className="stat-card">
                  <span className="stat-value">{d.totalLogs ?? 0}</span>
                  <span className="stat-label">Записей в дневнике</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{d.totalBehaviors ?? 0}</span>
                  <span className="stat-label">Эпизодов поведения</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">—</span>
                  <span className="stat-label">AI запросов</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">—</span>
                  <span className="stat-label">Дней активности</span>
                </div>
              </div>
            </div>

            {/* Subscription history */}
            <div className="ud-card">
              <h2 className="ud-card-title">Подписка</h2>
              {d.subscription ? (
                <div className="ud-rows">
                  <div className="ud-row"><span className="ud-label">План</span><span>{d.subscription.plan}</span></div>
                  <div className="ud-row"><span className="ud-label">Статус</span><span>{d.subscription.status}</span></div>
                  <div className="ud-row">
                    <span className="ud-label">Истекает</span>
                    <span>{d.subscription.expiresAt ? new Date(d.subscription.expiresAt).toLocaleDateString("ru-RU") : "Бессрочно"}</span>
                  </div>
                </div>
              ) : (
                <p className="ud-empty">Нет активной подписки</p>
              )}
            </div>

            {/* Last diary entries */}
            {d.recentLogs && d.recentLogs.length > 0 && (
              <div className="ud-card">
                <h2 className="ud-card-title">Последние записи</h2>
                <ul className="ud-log-list">
                  {d.recentLogs.map((log, i) => (
                    <li key={i} className="ud-log-item">
                      <span className="ud-log-date">{new Date(log.date).toLocaleDateString("ru-RU")}</span>
                      <span className="ud-log-mood">Настроение: {log.moodScore}/10</span>
                      {log.notes && <span className="ud-log-notes">{log.notes.slice(0, 80)}{log.notes.length > 80 ? "…" : ""}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
