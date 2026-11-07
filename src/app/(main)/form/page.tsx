import { getServerSession } from "@/lib/next-auth";
import { redirect } from "next/navigation";
import FormComponent from "./components/Form";
import { findUser } from "@/queries/user.query";
import { findTimsByUser, findDistinctAsalSekolah } from "@/queries/tim.query";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import prisma from "@/lib/prisma";

export default async function Form() {
  const session = await getServerSession();
  if (!session) return redirect("/auth/login");

  const user = await findUser({ id: session.user?.id });
  if (!user?.verified) return redirect("/confirmation");

  const tims = await findTimsByUser(session.user!.id);
  if (tims.length > 0) return redirect("/dashboard");

  const [konfigUmum, sekolahTim, sekolahVoucher] = await Promise.all([
    getKonfigUmum(),
    findDistinctAsalSekolah(),
    // Data tim direset tiap kegiatan — nama sekolah pemilik voucher ikut jadi
    // saran autocomplete supaya ejaannya sama dan voucher otomatis terpasang.
    prisma.voucher.findMany({
      where: { aktif: true, asalSekolah: { not: null } },
      select: { asalSekolah: true },
      distinct: ["asalSekolah"],
    }),
  ]);
  const daftarSekolah = Array.from(
    new Set([...sekolahTim, ...sekolahVoucher.map((v) => v.asalSekolah!)])
  ).sort((a, b) => a.localeCompare(b, "id"));

  return (
    <div className="my-16">
      <FormComponent konfigUmum={konfigUmum} daftarSekolah={daftarSekolah} />
    </div>
  );
}
