import { findTikets, findKonfigTiket } from "@/queries/tiket.query";
import { getServerSession } from "@/lib/next-auth";
import BeliTiketForm from "./BeliTiketForm";

export default async function TiketPage() {
  const [tikets, session, konfig] = await Promise.all([
    findTikets(),
    getServerSession(),
    findKonfigTiket(),
  ]);

  return (
    <section className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">Beli Tiket</h1>
      <p className="text-gray-500 mb-8">
        Tiket LKBB Antareja 2026 — SMK Telkom Malang, 15 November 2026
      </p>

      {tikets.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400">
          Penjualan tiket belum dibuka. Pantau terus website ini.
        </div>
      ) : (
        <BeliTiketForm tikets={tikets} userId={session?.user?.id} konfig={konfig} />
      )}
    </section>
  );
}
