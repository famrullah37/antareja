export const dynamic = "force-dynamic";
import {
  findDantonMap,
  findKonfigVoting,
  findTimsForVoting,
  findVotingTallyMap,
  getKategoriList,
} from "@/queries/voting.query";
import { findKonfigTiket } from "@/queries/tiket.query";
import { getServerSession } from "@/lib/next-auth";
import { cekJendelaVoting } from "@/actions/Voting";
import VoteForm from "./VoteForm";
import VotingCountdownBanner from "./VotingCountdownBanner";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dukung Tim Favorit",
  description: "Berikan dukunganmu untuk tim favorit di LKBB Antareja 2026 dan pantau papan peringkat dukungan secara langsung.",
};

export default async function VotePage() {
  const [tims, session, konfigVoting, dantonMap, tallyMap, konfigTiket] = await Promise.all([
    findTimsForVoting(),
    getServerSession(),
    findKonfigVoting(),
    findDantonMap(),
    findVotingTallyMap(),
    findKonfigTiket(),
  ]);
  const kategoriList = getKategoriList(konfigVoting);
  // QRIS voting sengaja ikut punya Tiket/Galeri Foto Premium (satu sumber),
  // lihat komentar di schema.prisma model KonfigTiket.
  const konfig = konfigVoting ? { ...konfigVoting, qrisUrl: konfigTiket?.qrisUrl ?? null } : null;

  // Pakai fungsi yang sama persis dengan yang menegakkan aturan di server
  // (reserveKodeVoting/submitVote) — supaya banner yang ditampilkan tidak
  // pernah beda dari status yang sesungguhnya ditegakkan.
  const status = await cekJendelaVoting(konfig);

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
      ) : status.belumMulai ? (
        <VotingCountdownBanner target={konfig.mulaiPada!} label="Voting dibuka dalam" tone="buka" />
      ) : status.sudahTutup ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400">
          Voting dukungan sudah ditutup. Terima kasih atas partisipasinya!
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {konfig?.tutupPada && (
            <VotingCountdownBanner target={konfig.tutupPada} label="Voting ditutup dalam" tone="tutup" />
          )}
          <VoteForm
            tims={tims}
            userId={session?.user?.id}
            konfig={konfig}
            kategoriList={kategoriList}
            dantonMap={dantonMap}
            tallyMap={tallyMap}
          />
        </div>
      )}
    </section>
  );
}
