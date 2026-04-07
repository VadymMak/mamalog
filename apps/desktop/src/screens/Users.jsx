import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Users() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/api/admin/users")
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setError("Не удалось загрузить пользователей"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <h1 className="screen-title">Пользователи</h1>
      {loading && <p className="loading">Загрузка...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Тариф</th>
              <th>Дата регистрации</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "#888" }}>
                  Нет пользователей
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name ?? "—"}</td>
                  <td>{row.email}</td>
                  <td>
                    <span
                      className={`badge ${row.subscription?.plan === "FREE" ? "badge-free" : "badge-premium"}`}
                    >
                      {row.subscription?.plan ?? "FREE"}
                    </span>
                  </td>
                  <td>{new Date(row.createdAt).toLocaleDateString("ru-RU")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
