"use client";

import { useEffect, useState, useCallback } from "react";

interface User {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  isSuperUser?: boolean;
  totalLogs: number;
  lastActiveAt: string | null;
  subscription: { plan: string } | null;
}

const PAGE_SIZE = 30;

function getAdminToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/adminToken=([^;]+)/);
  return match ? match[1] : "";
}

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?limit=${PAGE_SIZE}&offset=${p * PAGE_SIZE}`, {
        headers: { "x-admin-key": getAdminToken() },
      });
      const json = await res.json();
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
      setError(null);
    } catch {
      setError("Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const filtered = rows.filter((u) => {
    const q = search.toLowerCase();
    return !q || (u.name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  async function toggleSuperuser(user: User) {
    setTogglingId(user.id);
    try {
      await fetch(`/api/admin/users/${user.id}/superuser`, {
        method: "POST",
        headers: { "x-admin-key": getAdminToken() },
      });
      setRows((prev) =>
        prev.map((u) => u.id === user.id ? { ...u, isSuperUser: !u.isSuperUser } : u)
      );
    } catch {
      alert("Не удалось изменить статус");
    } finally {
      setTogglingId(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">👥 Пользователи <span className="text-slate-400 text-lg">({total})</span></h1>
        <button onClick={() => load(page)} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">
          ↻ Обновить
        </button>
      </div>

      <input
        type="text"
        placeholder="Поиск по email / имени..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
      />

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="text-slate-400 py-12 text-center">Загрузка...</div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3">Имя</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">План</th>
                  <th className="text-left px-4 py-3">Записей</th>
                  <th className="text-left px-4 py-3">Регистрация</th>
                  <th className="text-left px-4 py-3">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map((u) => {
                  const plan = u.subscription?.plan ?? "FREE";
                  const isPremium = plan === "MONTHLY" || plan === "YEARLY";
                  return (
                    <tr key={u.id} className="hover:bg-slate-750">
                      <td className="px-4 py-3 text-white">
                        {u.name ?? "—"}
                        {u.isSuperUser && <span className="ml-2 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded font-semibold">★ SU</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${isPremium ? "bg-indigo-500 text-white" : "bg-slate-600 text-slate-300"}`}>
                          {plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{u.totalLogs}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(u.createdAt).toLocaleDateString("ru-RU")}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSuperuser(u)}
                          disabled={togglingId === u.id}
                          className={`text-xs px-2 py-1 rounded transition-colors ${u.isSuperUser ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-slate-600 text-slate-300 hover:bg-slate-500"}`}
                        >
                          {togglingId === u.id ? "..." : u.isSuperUser ? "★ SU" : "☆ SU"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-3 mt-4">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 disabled:opacity-40 transition-colors">← Назад</button>
              <span className="text-slate-400 text-sm">Стр. {page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 disabled:opacity-40 transition-colors">Вперёд →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
