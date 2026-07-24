export const dynamic = "force-dynamic";
import { findKonfigVoting, findTimsForVoting, findTransaksiVotings } from "@/queries/voting.query";
import { H1 } from "@/app/components/global/Text";
import KonfigVotingForm from "./components/KonfigVotingForm";
import TransaksiVotingTable from "./components/TransaksiVotingTable";

export default async function AdminVotingPage() {
  const [konfig, transaksis, tims] = await Promise.all([
    findKonfigVoting(),
    findTransaksiVotings(),
    findTimsForVoting(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <H1 className="mb-0">Manajemen Voting Dukungan</H1>

      <div className="grid lg:grid-cols-2 gap-6">
        <KonfigVotingForm konfig={konfig} />

        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h3 className="font-semibold text-lg mb-3">Papan Dukungan</h3>
          <div className="flex flex-col divide-y divide-neutral-100">
            {tims.length === 0 && (
              <p className="text-gray-400 text-sm">Belum ada tim terkonfirmasi.</p>
            )}
            {tims.map((t, i) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-mono w-5">{i + 1}</span>
                  <div>
                    <div className="font-medium">{t.nama_tim}</div>
                    <div className="text-xs text-gray-400">{t.asal_sekolah} — {t.jenjang}</div>
                  </div>
                </div>
                <span className="font-bold text-primary-600">{t.totalVote} suara</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Transaksi Dukungan</h2>
        <TransaksiVotingTable transaksis={transaksis as any} />
      </div>
    </div>
  );
}
