import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const PAGE_SIZE = 30;

const PLAN_BADGE = {
  FREE: "badge-free",
  MONTHLY: "badge-monthly",
  YEARLY: "badge-yearly",
};

const FILTERS = [
  { id: "all", label: "Все" },
  { id: "free", label: "Free" },
  { id: "premium", label: "Premium" },
  { id: "superuser", label: "Superuser" },
  { id: "new", label: "Новые" },
];

export default function CRM({ showToast, onUserClick }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [togglingId, setTogglingId] = useState(null);
  const [notifyModal, setNotifyModal] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [notifySegment, setNotifySegment] = useState("all");
  const [notifySending, setNotifySending] = useState(false);

  const load = useCallback((p = 0) => {
    setLoading(true);
    api
      .get("/api/admin/users", { params: { limit: PAGE_SIZE, offset: p * PAGE_SIZE } })
      .then((r) => {
        setRows(r.data.data ?? []);
        setTotal(r.data.total ?? 0);
        setError(null);
      })
      .catch(() => setError("Не удалось загрузить пользователей"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const filtered = rows.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (u.name ?? "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);

    const plan = u.subscription?.plan ?? "FREE";
    const isPremium = plan === "MONTHLY" || plan === "YEARLY";
    const isNew = new Date(u.createdAt) > sevenDaysAgo;

    const matchFilter =
      filter === "all" ||
      (filter === "free" && !isPremium && !u.isSuperUser) ||
      (filter === "premium" && isPremium) ||
      (filter === "superuser" && u.isSuperUser) ||
      (filter === "new" && isNew);

    return matchSearch && matchFilter;
  });

  // Compute stats
  const premiumCount = rows.filter((u) => {
    const p = u.subscription?.plan ?? "FREE";
    return p === "MONTHLY" || p === "YEARLY";
  }).length;
  const superCount = rows.filter((u) => u.isSuperUser).length;
  const conversion = total > 0 ? ((premiumCount / total) * 100).toFixed(1) : "0.0";

  async function sendNotification() {
    if (!notifyTitle.trim() || !notifyBody.trim()) return;
    setNotifySending(true);
    try {
      const res = await api.post("/api/admin/notify", {
        title: notifyTitle.trim(),
        body: notifyBody.trim(),
        segment: notifySegment,
      });
      showToast(`Отправлено: ${res.data.data?.sent ?? 0} устройств`);
      setNotifyModal(false);
      setNotifyTitle("");
      setNotifyBody("");
    } catch {
      showToast("Не удалось отправить уведомление", "error");
    } finally {
      setNotifySending(false);
    }
  }

  async function toggleSuperuser(user) {
    setTogglingId(user.id);
    try {
      await api.post(`/api/admin/users/${user.id}/superuser`);
      setRows((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isSuperUser: !u.isSuperUser } : u))
      );
      showToast(
        user.isSuperUser
          ? `${user.email} снят с Superuser`
          : `${user.email} — теперь Superuser`
      );
    } catch {
      showToast("Не удалось изменить статус", "error");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header">
        <h1 className="screen-title">
          CRM — Управление клиентами
          {total > 0 && <span className="screen-count">{total}</span>}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-refresh" onClick={() => load(page)}>↻ Обновить</button>
          <button
            className="btn btn-approve"
            style={{ padding: "6px 14px", fontSize: 13 }}
            onClick={() => setNotifyModal(true)}
          >
            🔔 Уведомление
          </button>
        </div>
      </div>

      {/* Notify modal */}
      {notifyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1a1a2e", borderRadius: 12, padding: 28, width: 420, display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 16 }}>🔔 Отправить уведомление</h2>
            <select
              value={notifySegment}
              onChange={(e) => setNotifySegment(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #333", background: "#0d1117", color: "#fff", fontSize: 13 }}
            >
              <option value="all">Все пользователи</option>
              <option value="premium">Только Premium</option>
              <option value="free">Только Free</option>
            </select>
            <input
              placeholder="Заголовок"
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #333", background: "#0d1117", color: "#fff", fontSize: 13 }}
            />
            <textarea
              placeholder="Текст уведомления"
              value={notifyBody}
              onChange={(e) => setNotifyBody(e.target.value)}
              rows={3}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #333", background: "#0d1117", color: "#fff", fontSize: 13, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setNotifyModal(false)}>Отмена</button>
              <button
                className="btn btn-approve"
                onClick={sendNotification}
                disabled={notifySending || !notifyTitle.trim() || !notifyBody.trim()}
              >
                {notifySending ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : <span className="stat-value">{total}</span>}
          <span className="stat-label">Всего пользователей</span>
        </div>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : <span className="stat-value crm-stat-active">{superCount}</span>}
          <span className="stat-label">Superuser аккаунтов</span>
        </div>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : <span className="stat-value crm-stat-premium">{premiumCount}</span>}
          <span className="stat-label">Premium подписок</span>
        </div>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : <span className="stat-value crm-stat-conv">{conversion}%</span>}
          <span className="stat-label">Конверсия</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="crm-filters">
        <input
          className="crm-search"
          type="text"
          placeholder="Поиск по email / имени..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="crm-filter-btns">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`crm-filter-btn ${filter === f.id ? "crm-filter-btn--active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">👤</span>
          <p>Нет пользователей по фильтру</p>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>План</th>
                <th>Регистрация</th>
                <th>Последняя активность</th>
                <th>Записей</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const plan = u.subscription?.plan ?? "FREE";
                const isPremium = plan === "MONTHLY" || plan === "YEARLY";
                return (
                  <tr key={u.id}>
                    <td>
                      <span className="crm-name">
                        {u.name ?? "—"}
                        {u.isSuperUser && <span className="badge badge-superuser" style={{ marginLeft: 6 }}>★ SU</span>}
                      </span>
                    </td>
                    <td className="crm-email">{u.email}</td>
                    <td>
                      <span className={`badge ${isPremium ? PLAN_BADGE[plan] : "badge-free"}`}>
                        {plan}
                      </span>
                    </td>
                    <td className="crm-date">{new Date(u.createdAt).toLocaleDateString("ru-RU")}</td>
                    <td className="crm-date">
                      {u.lastActiveAt
                        ? new Date(u.lastActiveAt).toLocaleDateString("ru-RU")
                        : "—"}
                    </td>
                    <td className="crm-num">{u.totalLogs ?? 0}</td>
                    <td>
                      <div className="crm-actions">
                        <button
                          className={`btn crm-btn-su ${u.isSuperUser ? "crm-btn-su--active" : ""}`}
                          onClick={() => toggleSuperuser(u)}
                          disabled={togglingId === u.id}
                          title={u.isSuperUser ? "Снять Superuser" : "Сделать Superuser"}
                        >
                          {togglingId === u.id ? "..." : u.isSuperUser ? "★ SU" : "☆ SU"}
                        </button>
                        <button
                          className="btn crm-btn-detail"
                          onClick={() => onUserClick?.(u)}
                          title="Детали пользователя"
                        >
                          →
                        </button>
                        <button
                          className="btn crm-btn-email"
                          title="Отправить email (скоро)"
                          onClick={() => showToast("Email рассылка — в разработке", "error")}
                        >
                          ✉
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-page"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Назад
              </button>
              <span className="page-info">Стр. {page + 1} / {totalPages}</span>
              <button
                className="btn-page"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
