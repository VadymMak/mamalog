import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const CARDS = [
  { key: "totalUsers" as const, label: "Всего пользователей", icon: "👥" },
  { key: "activeToday" as const, label: "Активных сегодня", icon: "🟢" },
  { key: "pendingSpecialists" as const, label: "Ожидают одобрения", icon: "🩺" },
  { key: "totalLogEntries" as const, label: "Записей в дневнике", icon: "📔" },
];

interface Stats {
  totalUsers: number;
  activeToday: number;
  pendingSpecialists: number;
  totalLogEntries: number;
}

async function getStats(): Promise<Stats | null> {
  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [totalUsers, pendingSpecialists, totalLogEntries, activeTodayEntries] =
      await prisma.$transaction([
        prisma.user.count(),
        prisma.specialist.count({ where: { status: "PENDING" } }),
        prisma.logEntry.count(),
        prisma.logEntry.findMany({
          where: { createdAt: { gte: todayStart } },
          select: { userId: true },
          distinct: ["userId"],
        }),
      ]);

    return { totalUsers, activeToday: activeTodayEntries.length, pendingSpecialists, totalLogEntries };
  } catch {
    return null;
  }
}

export default async function AdminDashboard() {
  // Cookie check is handled by layout — we just load data here
  await cookies(); // ensure dynamic rendering
  const stats = await getStats();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">📊 Аналитика</h1>
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.key} className="bg-slate-800 rounded-xl p-6">
            <div className="text-3xl mb-2">{c.icon}</div>
            <div className="text-3xl font-bold text-white">
              {stats ? (stats[c.key] ?? "—") : "—"}
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
