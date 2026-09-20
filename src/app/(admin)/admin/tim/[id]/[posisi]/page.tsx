import { findAnggota } from "@/queries/anggota.query";
import { findTimByParam } from "@/queries/tim.query";
import { Anggota, Posisi } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { isUuid, timSlug } from "@/lib/timSlug";
import DisplayAnggota from "./components/Form";

export default async function EditAnggota({
  params,
}: Readonly<{ params: { posisi: string; id: string } }>) {
  if (Object.keys(Posisi).indexOf(params.posisi.toUpperCase()) === -1)
    return redirect("/dashboard");

  const tim = await findTimByParam(params.id);
  if (!tim) return notFound();
  if (isUuid(params.id)) redirect(`/admin/tim/${timSlug(tim)}/${params.posisi}`);

  const anggota =
    (await findAnggota({
      posisi_timId: {
        posisi: params.posisi.toUpperCase() as Posisi,
        timId: tim.id,
      },
    })) ??
    ({
      id: "",
      email: "",
      nama: "",
      foto: "",
      kelas: "",
      nisn: "",
      posisi: params.posisi.toUpperCase(),
      telp: "",
      timId: "",
    } as unknown as Anggota);

  return (
    <div className="my-16">
      <DisplayAnggota anggota={anggota} />
    </div>
  );
}
