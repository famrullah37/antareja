export const dynamic = "force-dynamic";
import { findJurisWithKategori } from "@/queries/juri.query";
import { PrimaryLinkButton } from "@/app/components/global/LinkButton";
import { H1 } from "@/app/components/global/Text";
import JuriTable from "./components/Table";

export default async function JuriPage() {
  const juris = await findJurisWithKategori();

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <H1>Juri</H1>
        <PrimaryLinkButton href="/admin/juri/new">New</PrimaryLinkButton>
      </div>
      <p className="mt-2 text-sm text-gray-500 max-w-2xl">
        Agar juri bisa memberi nilai dari HP/tablet: buat akun di menu <b>User</b> dengan role{" "}
        <b>JURI</b> dan <b>email yang sama</b> seperti di sini. Akun terhubung otomatis saat juri
        pertama kali membuka halaman Penilaian.
      </p>
      <div className="mt-4">
        <JuriTable data={juris} />
      </div>
    </div>
  );
}
