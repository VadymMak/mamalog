import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUPERUSERS = [
  { email: "admin1@mamalog.app", name: "Admin 1" },
  { email: "admin2@mamalog.app", name: "Admin 2" },
  { email: "admin3@mamalog.app", name: "Admin 3" },
];

async function main() {
  console.log("Seeding superuser accounts...");

  for (const su of SUPERUSERS) {
    const user = await prisma.user.upsert({
      where: { email: su.email },
      update: { isSuperUser: true },
      create: {
        email: su.email,
        name: su.name,
        isSuperUser: true,
        role: "MAMA",
      },
    });
    console.log(`  ✓ ${user.email} (id: ${user.id}) isSuperUser=${user.isSuperUser}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
