export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";
import { H1 } from "@/app/components/global/Text";
import SaranClient from "./SaranClient";

export default async function AdminSaranPage() {
  const [saran, session] = await Promise.all([
    prisma.saranTim.findMany({ orderBy: { createdAt: "desc" } }),
    getServerSession(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <H1 className="mb-0">Saran & Masukan Tim</H1>
      <SaranClient
        saran={saran.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))}
        bolehHapus={session?.user?.role === "ADMIN"}
      />
    </div>
  );
}
