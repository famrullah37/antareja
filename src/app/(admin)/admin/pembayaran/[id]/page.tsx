import { findTim, findTimByParam } from "@/queries/tim.query";
import { notFound, redirect } from "next/navigation";
import PembayaranForm from "./components/Form";
import { TimWithPembayaran } from "@/types/entityRelations";
import { biayaPendaftaran } from "@/actions/pembayaran";
import { isUuid, timSlug } from "@/lib/timSlug";

export default async function PembayaranEdit({
  params,
}: {
  params: { id: string };
}) {
  const found = await findTimByParam(params.id);
  if (!found) return notFound();

  // URL kanonis = slug (sama dengan halaman tim); UUID lama di-redirect.
  if (isUuid(params.id)) redirect(`/admin/pembayaran/${timSlug(found)}`);

  const tim = (await findTim({ id: found.id }, { pembayaran: true })) as TimWithPembayaran;

  // Fallback untuk tim lama yang belum punya totalBayar: biaya jenjang saat ini dari Pengaturan.
  const biayaDasar = await biayaPendaftaran(tim.jenjang, tim.pembayaran?.isDP ?? false);
  return <PembayaranForm data={tim} id={tim.id} biayaDasar={biayaDasar} />;
}
