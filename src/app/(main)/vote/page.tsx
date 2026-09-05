export const dynamic = "force-dynamic";
import { findKonfigVoting, findTimsForVoting } from "@/queries/voting.query";
import { getServerSession } from "@/lib/next-auth";
import VoteForm from "./VoteForm";
import VotingCountdownBanner from "./VotingCountdownBanner";

export default async function VotePage() {
  const [tims, session, konfig] = await Promise.all([
    findTimsForVoting(),
    getServerSession(),
    findKonfigVoting(),
  ]);

  const now = new Date();
  const belumMulai = !!konfig?.mulaiPada && now < konfig.mulaiPada;
  const sudahTutup = !!konfig?.tutupPada && now > konfig.tutupPada;

  return (
    <section className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">Dukung Tim Favoritmu</h1>
      <p className="text-gray-500 mb-8">
        Berikan dukungan berbayar untuk tim LKBB Antareja 2026 favoritmu. Setiap dukungan yang terverifikasi dihitung sebagai 1 suara.
      </p>

      {!konfig?.aktif ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400">
          Voting dukungan belum dibuka. Pantau terus website ini.
        </div>
      ) : belumMulai ? (
        <VotingCountdownBanner target={konfig.mulaiPada!} label="Voting dibuka dalam" tone="buka" />
      ) : sudahTutup ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400">
          Voting dukungan sudah ditutup. Terima kasih atas partisipasinya!
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {konfig.tutupPada && (
            <VotingCountdownBanner target={konfig.tutupPada} label="Voting ditutup dalam" tone="tutup" />
          )}
          <VoteForm tims={tims} userId={session?.user?.id} konfig={konfig} />
        </div>
      )}
    </section>
  );
}
