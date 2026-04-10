import { cookies } from "next/headers";

interface Stats {
  totalUsers: number;
  activeToday: number;
  pendingSpecialists: number;
  totalLogEntries: number;
}

const CARDS = [
  { key: "totalUsers" as const, label: "Всего пользователей", icon: "👥" },
  { key: "activeToday" as const, label: "Активных сегодня", icon: "🟢" },
  { key: "pendingSpecialists" as const, label: "Ожидают одобрения", icon: "🩺" },
  { key: "totalLogEntries" as const, label: "Записей в дневнике", icon: "📔" },
];

async function getStats(token: string): Promise<Stats | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { "x-admin-key": token },
      cache: "no-store",
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get("adminToken")?.value ?? "";
  const stats = await getStats(token);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">📊 Аналитика</h1>
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.key} className="bg-slate-800 rounded-xl p-6">
            <div className="text-3xl mb-2">{c.icon}</div>
            <div className="text-3xl font-bold text-white">
              {stats ? (stats[c.key] ?? "—") : "…"}
            </div>
            <div className="text-sm text-slate-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      {!stats && (
        <p className="text-red-400 text-sm">Не удалось загрузить статистику</p>
      )}
    </div>
  );
}
