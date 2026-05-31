import { getServerSession } from "@/lib/next-auth";
import { findAnggota } from "@/queries/anggota.query";
import { findTim, findTimsByUser } from "@/queries/tim.query";
import { Anggota, Posisi, Tim } from "@prisma/client";
import { redirect } from "next/navigation";
import EditAnggotaForm from "./components/Form";

export default async function EditAnggota({
  params,
  searchParams,
}: Readonly<{ params: { posisi: string }; searchParams?: { timId?: string } }>) {
  if (Object.keys(Posisi).indexOf(params.posisi.toUpperCase()) === -1)
    return redirect("/dashboard");

  const session = await getServerSession();

  let tim: Tim | null = null;
  if (searchParams?.timId) {
    const found = await findTim({ id: searchParams.timId });
    if (found?.userId === session?.user?.id) tim = found as Tim;
  }
  if (!tim) {
    const tims = await findTimsByUser(session?.user?.id ?? "");
    tim = (tims[0] ?? null) as Tim | null;
  }
  if (!tim) return redirect("/dashboard");

  const timId = tim.id;

  const anggota =
    (await findAnggota({
      posisi_timId: {
        posisi: params.posisi.toUpperCase() as Posisi,
        timId,
      },
    })) ??
    ({
      id: "",
      email: "",
      nama: "",
      foto: "",
      kelas: "VII",
      nisn: "",
      posisi: params.posisi.toUpperCase(),
      telp: "",
      timId,
    } as unknown as Anggota);

  return (
    <div className="my-16">
      <EditAnggotaForm anggota={anggota} tim={tim} />
    </div>
  );
}
