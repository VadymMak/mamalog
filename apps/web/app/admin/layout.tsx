import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/admin", label: "📊 Dashboard" },
  { href: "/admin/users", label: "👥 Пользователи" },
  { href: "/admin/specialists", label: "🩺 Специалисты" },
  { href: "/admin/publications", label: "📝 Публикации" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("adminToken")?.value;
  const secret = process.env.ADMIN_SECRET_KEY;

  if (!token || token !== secret) {
    redirect("/admin-login");
  }

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-800 flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-slate-700">
          <span className="text-xl font-bold">🌸 Mamalog</span>
          <p className="text-xs text-slate-400 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/api/admin/logout" method="POST" className="p-3 border-t border-slate-700">
          <button
            type="submit"
            className="w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 text-left transition-colors"
          >
            Выйти
          </button>
        </form>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
