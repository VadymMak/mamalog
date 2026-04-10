"use client";

import { useEffect, useState } from "react";

interface ModerationItem {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  authorName: string | null;
  authorRole: string | null;
  tags: string[];
  status: string;
  aiScore: number | null;
  aiReason: string | null;
  trustIndex: number;
  createdAt: string;
}

function getAdminToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/adminToken=([^;]+)/);
  return match ? match[1] : "";
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-500 text-xs">—</span>;
  const color =
    score >= 80 ? "bg-green-600" :
    score >= 40 ? "bg-yellow-600" : "bg-red-600";
  return (
    <span className={`inline-block text-xs font-bold text-white px-2 py-0.5 rounded ${color}`}>
      {score}/100
    </span>
  );
}

export default function ModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(status: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/moderation?status=${status}`, {
        headers: { "x-admin-key": getAdminToken() },
      });
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      setError("Не удалось загрузить статьи");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(activeTab); }, [activeTab]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActioning(id);
    try {
      await fetch("/api/admin/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // silently keep item
    } finally {
      setActioning(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить статью навсегда?")) return;
    setActioning(id);
    try {
      await fetch("/api/admin/moderation", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // silently keep item
    } finally {
      setActioning(null);
    }
  }

  const tabs: Array<{ key: "pending" | "approved" | "rejected"; label: string }> = [
    { key: "pending", label: "⏳ На проверке" },
    { key: "approved", label: "✅ Одобрено" },
    { key: "rejected", label: "❌ Отклонено" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">🔍 Модерация статей</h1>
        <button
          onClick={() => load(activeTab)}
          className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
        >
          ↻ Обновить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="text-slate-400 py-12 text-center">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📭</div>
          <p>Нет статей в этом разделе</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
              {/* Header row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <ScoreBadge score={item.aiScore} />
                    <span className="text-xs text-slate-400 font-mono">
                      {item.tags[0] ?? item.sourceType}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <p className="text-white font-semibold truncate">{item.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {item.authorName ?? "Аноним"}{item.authorRole ? ` · ${item.authorRole}` : ""}
                  </p>
                  {item.aiReason && (
                    <p className="text-slate-500 text-xs mt-1 italic">ИИ: {item.aiReason}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                  >
                    {expanded === item.id ? "Скрыть" : "Читать"}
                  </button>
                  {activeTab === "pending" && (
                    <>
                      <button
                        disabled={actioning === item.id}
                        onClick={() => handleAction(item.id, "approve")}
                        className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
                      >
                        ✓ Одобрить
                      </button>
                      <button
                        disabled={actioning === item.id}
                        onClick={() => handleAction(item.id, "reject")}
                        className="px-3 py-1.5 text-xs bg-red-800 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
                      >
                        ✕ Отклонить
                      </button>
                    </>
                  )}
                  <button
                    disabled={actioning === item.id}
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-60"
                    title="Удалить навсегда"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {expanded === item.id && (
                <div className="px-5 pb-5 border-t border-slate-700">
                  <div className="mt-4 bg-slate-900 rounded-lg p-4 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed max-h-80 overflow-auto">
                    {item.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
