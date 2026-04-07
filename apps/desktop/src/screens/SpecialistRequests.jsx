import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function SpecialistRequests({ showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);

  function load() {
    setLoading(true);
    api
      .get("/api/admin/specialists/pending")
      .then((r) => {
        setRows(r.data.data ?? []);
        setError(null);
      })
      .catch(() => setError("Не удалось загрузить заявки"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleApprove(id, name) {
    setProcessing(id);
    try {
      await api.post(`/api/admin/specialists/${id}/approve`);
      setRows((prev) => prev.filter((r) => r.id !== id));
      showToast(`Специалист ${name} одобрен`, "success");
    } catch {
      showToast("Не удалось одобрить заявку", "error");
    } finally {
      setProcessing(null);
    }
  }

  function handleReject(id, name) {
    const confirmed = window.confirm(
      `Отклонить заявку специалиста "${name}"?\nЭто действие нельзя отменить.`
    );
    if (!confirmed) return;

    setProcessing(id);
    api
      .post(`/api/admin/specialists/${id}/reject`)
      .then(() => {
        setRows((prev) => prev.filter((r) => r.id !== id));
        showToast(`Заявка ${name} отклонена`, "success");
      })
      .catch(() => showToast("Не удалось отклонить заявку", "error"))
      .finally(() => setProcessing(null));
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Заявки специалистов</h1>
        <button className="btn-refresh" onClick={load}>↻ Обновить</button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">✓</span>
          <p>Нет заявок на рассмотрении</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Специализация</th>
              <th>Опыт (лет)</th>
              <th>Дата заявки</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.email}</td>
                <td>{row.specialty ?? "—"}</td>
                <td>{row.experience ?? "—"}</td>
                <td>{new Date(row.createdAt).toLocaleDateString("ru-RU")}</td>
                <td>
                  <button
                    className="btn btn-approve"
                    disabled={processing === row.id}
                    onClick={() => handleApprove(row.id, row.name)}
                  >
                    {processing === row.id ? "..." : "Одобрить"}
                  </button>
                  <button
                    className="btn btn-reject"
                    disabled={processing === row.id}
                    onClick={() => handleReject(row.id, row.name)}
                  >
                    Отклонить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
