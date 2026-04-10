"use client";

import { useEffect, useState } from "react";

interface Specialist {
  id: string;
  name: string;
  email: string;
  specialty: string | null;
  experience: number | null;
  createdAt: string;
}

function getAdminToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/adminToken=([^;]+)/);
  return match ? match[1] : "";
}

export default function SpecialistsPage() {
  const [rows, setRows] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/specialists/pending", {
        headers: { "x-admin-key": getAdminToken() },
      });
      const json = await res.json();
      setRows(json.data ?? []);
      setError(null);
    } catch {
      setError("Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(id: string, name: string) {
    setProcessing(id);
    try {
      await fetch(`/api/admin/specialists/${id}/approve`, {
        method: "POST",
        headers: { "x-admin-key": getAdminToken() },
      });
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert(`Не удалось одобрить заявку ${name}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(id: string, name: string) {
    if (!confirm(`Отклонить заявку "${name}"?`)) return;
    setProcessing(id);
    try {
      await fetch(`/api/admin/specialists/${id}/reject`, {
        method: "POST",
        headers: { "x-admin-key": getAdminToken() },
      });
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Не удалось отклонить заявку");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">🩺 Заявки специалистов</h1>
        <button onClick={load} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">
          ↻ Обновить
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="text-slate-400 py-12 text-center">Загрузка...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">✓</div>
          <p>Нет заявок на рассмотрении</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-slate-300">
              <tr>
                <th className="text-left px-4 py-3">Имя</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Специализация</th>
                <th className="text-left px-4 py-3">Опыт (лет)</th>
                <th className="text-left px-4 py-3">Дата заявки</th>
                <th className="text-left px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-750">
                  <td className="px-4 py-3 text-white">{row.name}</td>
                  <td className="px-4 py-3 text-slate-300">{row.email}</td>
                  <td className="px-4 py-3 text-slate-300">{row.specialty ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{row.experience ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(row.createdAt).toLocaleDateString("ru-RU")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        disabled={processing === row.id}
                        onClick={() => handleApprove(row.id, row.name)}
                        className="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors disabled:opacity-50"
                      >
                        {processing === row.id ? "..." : "Одобрить"}
                      </button>
                      <button
                        disabled={processing === row.id}
                        onClick={() => handleReject(row.id, row.name)}
                        className="px-3 py-1 text-xs rounded bg-red-700 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50"
                      >
                        Отклонить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
