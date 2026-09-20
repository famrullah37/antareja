import prisma from "@/lib/prisma";
import { resolveSlugId } from "@/lib/timSlug";

// Param URL admin (UUID atau slug "nama-<8 hex id>") → id asli.
export const resolveJuriId = (param: string) =>
  resolveSlugId(param, (p) => prisma.juri.findMany({ where: { id: { startsWith: p } }, select: { id: true }, take: 2 }));

export const resolveUserId = (param: string) =>
  resolveSlugId(param, (p) => prisma.user.findMany({ where: { id: { startsWith: p } }, select: { id: true }, take: 2 }));

export const resolvePenilaianId = (param: string) =>
  resolveSlugId(param, (p) => prisma.penilaian.findMany({ where: { id: { startsWith: p } }, select: { id: true }, take: 2 }));
