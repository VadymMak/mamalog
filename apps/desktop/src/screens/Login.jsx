import { useState } from "react";
import axios from "axios";
import { API_URL } from "../lib/api";

export default function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/admin/auth`, { password });
      if (res.data.success) {
        localStorage.setItem("adminToken", res.data.token);
        onLogin();
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Ошибка подключения";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>🌸</div>
        <h1 style={styles.title}>Mamalog Admin</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="Пароль администратора"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#0f172a",
  },
  card: {
    background: "#1e293b",
    borderRadius: 12,
    padding: "48px 40px",
    width: 360,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    textAlign: "center",
  },
  logo: { fontSize: 48, marginBottom: 12 },
  title: { color: "#f1f5f9", fontSize: 22, fontWeight: 700, marginBottom: 32, margin: "0 0 32px" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#f1f5f9",
    fontSize: 15,
    outline: "none",
  },
  error: { color: "#f87171", fontSize: 13, margin: 0 },
  btn: {
    padding: "12px 16px",
    borderRadius: 8,
    border: "none",
    background: "#6366f1",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
};
