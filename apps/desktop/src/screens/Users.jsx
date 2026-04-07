import { useEffect, useState } from "react";
import { api } from "../lib/api";

const PAGE_SIZE = 20;

const PLAN_BADGE = {
  FREE: "badge-free",
  MONTHLY: "badge-monthly",
  YEARLY: "badge-yearly",
};

export default function Users({ showToast }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load(p = page) {
    setLoading(true);
    api
      .get("/api/admin/users", {
        params: { limit: PAGE_SIZE, offset: p * PAGE_SIZE },
      })
      .then((r) => {
        setRows(r.data.data ?? []);
        setTotal(r.data.total ?? 0);
        setError(null);
      })
      .catch(() => setError("Не удалось загрузить пользователей"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(page); }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">
          Пользователи
          {total > 0 && <span className="screen-count">{total}</span>}
        </h1>
        <button className="btn-refresh" onClick={() => load(page)}>↻ Обновить</button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <p>Нет пользователей</p>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>Тариф</th>
                <th>Язык</th>
                <th>Дата регистрации</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const plan = row.subscription?.plan ?? "FREE";
                return (
                  <tr key={row.id}>
                    <td>{row.name ?? "—"}</td>
                    <td>{row.email}</td>
                    <td>
                      <span className={`badge ${PLAN_BADGE[plan] ?? "badge-free"}`}>
                        {plan}
                      </span>
                    </td>
                    <td>{row.language?.toUpperCase() ?? "—"}</td>
                    <td>{new Date(row.createdAt).toLocaleDateString("ru-RU")}</td>
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
              <span className="page-info">
                Стр. {page + 1} / {totalPages}
              </span>
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
