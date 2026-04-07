import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function SpecialistRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api
      .get("/api/specialist/pending")
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setError("Не удалось загрузить заявки"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleApprove(id) {
    await api.patch(`/api/specialist/${id}/approve`);
    load();
  }

  async function handleReject(id) {
    await api.patch(`/api/specialist/${id}/reject`);
    load();
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Заявки специалистов</h1>
      {loading && <p className="loading">Загрузка...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Специализация</th>
              <th>Дата заявки</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "#888" }}>
                  Нет ожидающих заявок
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name ?? "—"}</td>
                  <td>{row.email}</td>
                  <td>{row.specialization ?? "—"}</td>
                  <td>{new Date(row.createdAt).toLocaleDateString("ru-RU")}</td>
                  <td>
                    <button
                      className="btn btn-approve"
                      onClick={() => handleApprove(row.id)}
                    >
                      Одобрить
                    </button>
                    <button
                      className="btn btn-reject"
                      onClick={() => handleReject(row.id)}
                    >
                      Отклонить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
