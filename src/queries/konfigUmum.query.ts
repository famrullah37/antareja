import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const SINGLETON_ID = "singleton";

export type TimelineItem = {
  title: string;
  dateString: string;
  description: string;
  icon: string;
};

export async function getKonfigUmum() {
  const config = await prisma.konfigUmum.findUnique({ where: { id: SINGLETON_ID } });
  if (config) return config;
  return prisma.konfigUmum.create({ data: { id: SINGLETON_ID } });
}

export async function upsertKonfigUmum(data: {
  countdownTarget?: Date;
  countdownAktif?: boolean;
  pendaftaranDeadline?: Date | null;
  biayaSD?: number;
  biayaSDDP?: number;
  biayaSMP?: number;
  biayaSMPDP?: number;
  biayaSMA?: number;
  biayaSMADP?: number;
  bankNama?: string;
  bankNoRek?: string;
  bankAtasNama?: string;
  timeline?: TimelineItem[] | Prisma.NullTypes.JsonNull;
}) {
  return prisma.konfigUmum.upsert({
    where: { id: SINGLETON_ID },
    update: data,
    create: { id: SINGLETON_ID, ...data },
  });
}
