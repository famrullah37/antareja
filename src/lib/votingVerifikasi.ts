import "server-only";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { catatLog } from "@/lib/activityLog";
import { sendMailTo } from "@/lib/mailer";
import { findTransaksiVoting, updateTransaksiVoting } from "@/queries/voting.query";
import { escapeHtml } from "@/lib/escapeHtml";

// Dipisah dari src/actions/Voting.ts: semua export di file "use server"
// otomatis menjadi server action yang bisa dipanggil siapa saja dari
// browser. autoVerifikasiVotingByNominal dulu ada di sana tanpa cek login,
// sehingga pengunjung bisa menandai dukungannya "terverifikasi" tanpa bayar.

// Inti proses verifikasi — dipakai baik oleh admin (klik manual di
// /admin/voting) maupun oleh pencocokan otomatis dari webhook pembayaran
// (lihat autoVerifikasiVotingByNominal). Sengaja TIDAK requireAdmin di sini;
// pemanggil masing-masing yang menegakkan otorisasinya sendiri.
export async function markVotingVerified(transaksiId: string) {
  const transaksi = await findTransaksiVoting({ id: transaksiId });
  if (!transaksi) return { success: false };
  if (transaksi.status === "VERIFIED") return { success: false, message: "Dukungan sudah diverifikasi sebelumnya" };

  await updateTransaksiVoting({ id: transaksiId }, { status: "VERIFIED" });

  // "tim_favorit" tetap lewat Tim.totalVote (leaderboard lama, tidak
  // diubah) — kategori tambahan dihitung lewat VotingTally per kategori.
  if (transaksi.kategori === "tim_favorit") {
    await prisma.tim.update({
      where: { id: transaksi.timId },
      data: { totalVote: { increment: transaksi.jumlahVote } },
    });
  } else {
    await prisma.votingTally.upsert({
      where: { timId_kategori: { timId: transaksi.timId, kategori: transaksi.kategori } },
      update: { total: { increment: transaksi.jumlahVote } },
      create: { timId: transaksi.timId, kategori: transaksi.kategori, total: transaksi.jumlahVote },
    });
  }

  // Tidak ada sesi untuk jalur webhook (autoVerifikasiVotingByNominal) —
  // catatLog no-op kalau tidak ada sesi login, jadi aman dipanggil di sini
  // tanpa cabang khusus per pemanggil.
  await catatLog(
    "VERIFIKASI_VOTING",
    `Dukungan ${transaksi.jumlahVote}x untuk ${transaksi.tim.nama_tim} (${transaksi.nama}) — Rp${transaksi.totalBayar}`
  );

  await prisma.kasTransaksi.create({
    data: {
      tipe: "PEMASUKAN",
      keterangan: `Dukungan Voting ${transaksi.jumlahVote}x untuk ${transaksi.tim.nama_tim} (${transaksi.nama}) [#${transaksi.kodeUnik}]`,
      // Catat totalBayar (bukan hargaSatuan x jumlahVote) — itulah uang yang benar-benar masuk ke rekening/QRIS,
      // termasuk kode unik, jadi kas tetap cocok dengan mutasi nyata.
      jumlah: transaksi.totalBayar,
      kategori: "VOTING",
      sumber: "VOTING",
      referensiId: transaksiId,
    },
  });

  // Bukti/konfirmasi dukungan ke email pendukung — sebelumnya tidak pernah
  // dikirim sama sekali (beda dengan Tiket/Foto yang sudah kirim email
  // begitu diverifikasi), padahal email wajib diisi di form. Kegagalan
  // kirim tidak boleh menggagalkan verifikasi itu sendiri.
  const kategoriLabel =
    transaksi.kategori === "tim_favorit" ? "Tim Favorit" : transaksi.kategori.replace(/_/g, " ");
  try {
    await sendMailTo({
      to: transaksi.email,
      subject: `✅ Dukungan LKBB Antareja 2026 — ${transaksi.tim.nama_tim}`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:auto"><h2 style="color:#F70048">Dukunganmu Terverifikasi!</h2><p>Halo <b>${escapeHtml(transaksi.nama)}</b>,</p><p>Terima kasih! Pembayaran dukunganmu untuk <b>${escapeHtml(transaksi.tim.nama_tim)}</b> (${escapeHtml(transaksi.tim.asal_sekolah)}) sudah diverifikasi dan dihitung.</p><div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;font-size:14px"><p style="margin:0 0 4px"><b>Kategori:</b> ${escapeHtml(kategoriLabel)}</p><p style="margin:0 0 4px"><b>Jumlah vote:</b> ${transaksi.jumlahVote}x</p><p style="margin:0 0 4px"><b>Kode unik:</b> ${transaksi.kodeUnik}</p><p style="margin:0"><b>Total bayar:</b> Rp${transaksi.totalBayar.toLocaleString("id-ID")}</p></div><p>Ini adalah bukti pembayaran dukunganmu — simpan email ini sebagai referensi.</p><p style="font-size:12px;color:#aaa">LKBB Antareja 2026 — SMK Telkom Malang</p></div>`,
    });
  } catch (e) {
    console.error("Gagal kirim email bukti dukungan voting:", e);
  }

  revalidatePath("/admin/voting");
  revalidatePath("/admin/kas");
  revalidatePath("/vote");
  return { success: true };
}

// Dipanggil dari webhook pembayaran otomatis (mis. callback QRIS Mandiri),
// BUKAN dari sesi admin — endpoint webhook-nya sendiri (src/app/api/webhook/...)
// yang wajib pastikan requestnya benar-benar dari bank (signature/secret)
// SEBELUM memanggil fungsi ini. Di sini kita cuma percaya nominal yang
// dikasih, jadi jangan pernah expose fungsi ini ke client langsung.
//
// Pakai kodeUnik (harga × jumlah + kode unik 3 digit) sebagai kunci
// pencocokan — nominal transfer sengaja dibikin presisi unik per transaksi
// PENDING, jadi cocok 1:1 tanpa perlu tahu siapa pengirimnya.
export async function autoVerifikasiVotingByNominal(nominal: number) {
  try {
    const transaksi = await prisma.transaksiVoting.findFirst({
      where: { totalBayar: nominal, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    if (!transaksi) {
      return { success: false, message: `Tidak ada dukungan PENDING dengan nominal Rp${nominal}` };
    }
    return await markVotingVerified(transaksi.id);
  } catch (e) {
    console.error("autoVerifikasiVotingByNominal error:", e);
    return { success: false };
  }
}

