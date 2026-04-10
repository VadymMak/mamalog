import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      isSuperUser: true,
      subscription: { select: { plan: true } },
      _count: { select: { logEntries: true } },
    },
  });
}

async function toggleSuperuser(userId: string, current: boolean) {
  "use server";
  const { prisma: db } = await import("@/lib/prisma");
  await db.user.update({ where: { id: userId }, data: { isSuperUser: !current } });
}

export default async function UsersPage() {
  await cookies(); // ensure dynamic rendering
  const users = await getUsers();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          👥 Пользователи <span className="text-slate-400 text-lg">({users.length})</span>
        </h1>
      </div>

      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-slate-300">
            <tr>
              <th className="text-left px-4 py-3">Имя</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">План</th>
              <th className="text-left px-4 py-3">Записей</th>
              <th className="text-left px-4 py-3">Регистрация</th>
              <th className="text-left px-4 py-3">SU</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {users.map((u) => {
              const plan = u.subscription?.plan ?? "FREE";
              const isPremium = plan === "MONTHLY" || plan === "YEARLY";
              return (
                <tr key={u.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-4 py-3 text-white">
                    {u.name ?? "—"}
                    {u.isSuperUser && (
                      <span className="ml-2 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded font-semibold">★ SU</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${isPremium ? "bg-indigo-500 text-white" : "bg-slate-600 text-slate-300"}`}>
                      {plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{u._count.logEntries}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleSuperuser.bind(null, u.id, u.isSuperUser ?? false)}>
                      <button
                        type="submit"
                        className={`text-xs px-2 py-1 rounded transition-colors ${u.isSuperUser ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-slate-600 text-slate-300 hover:bg-slate-500"}`}
                      >
                        {u.isSuperUser ? "★ SU" : "☆ SU"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
