import prisma from "@/lib/prisma";

const SINGLETON_ID = "singleton";

export async function getKonfigUmum() {
  const config = await prisma.konfigUmum.findUnique({ where: { id: SINGLETON_ID } });
  if (config) return config;
  return prisma.konfigUmum.create({ data: { id: SINGLETON_ID } });
}

export async function upsertKonfigUmum(data: {
  countdownTarget?: Date;
  countdownAktif?: boolean;
  biayaSD?: number;
  biayaSDDP?: number;
  biayaSMP?: number;
  biayaSMPDP?: number;
  biayaSMA?: number;
  biayaSMADP?: number;
}) {
  return prisma.konfigUmum.upsert({
    where: { id: SINGLETON_ID },
    update: data,
    create: { id: SINGLETON_ID, ...data },
  });
}
