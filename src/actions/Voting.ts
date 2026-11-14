"use server";
import { batasiAksi } from "@/lib/rateLimit";

import { cekDataPemesan } from "@/lib/validasi";
import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { imageUploader, validateUploadFile } from "./fileUploader";
import { buildDynamicQrisImage } from "@/lib/qris";
import { parseWibDatetimeLocal } from "@/lib/datetime";
import { findKonfigTiket } from "@/queries/tiket.query";
import { catatLog } from "@/lib/activityLog";
import { sendMailTo } from "@/lib/mailer";
import { notifPembayaranMasuk } from "@/lib/emailPembayaran";
import { markVotingVerified } from "@/lib/votingVerifikasi";
import { cekTokenKode, terbitkanTokenKode } from "@/lib/kodeUnikToken";
import { buildVotingWorkbook } from "@/lib/exportVoting";
import {
  findDantonMap,
  findKonfigVoting,
  findTransaksiVoting,
  findVotingTallyMap,
  getKategoriList,
  updateTransaksiVoting,
  upsertKonfigVoting,
  type KategoriVoting,
} from "@/queries/voting.query";

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "kategori";
}

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

async function requireAdminOrBendahara() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

// Voting dianggap buka kalau: toggle aktif ON, dan (kalau diisi) waktu sekarang
// berada di antara mulaiPada..tutupPada. mulaiPada/tutupPada opsional — kalau
// tidak diisi, admin cukup andalkan toggle aktif seperti sebelumnya.
// Diekspor (bukan cuma dipakai reserveKodeVoting/submitVote) supaya
// src/app/(main)/vote/page.tsx pakai fungsi yang sama persis untuk
// menentukan banner apa yang ditampilkan — dulu logikanya diduplikasi
// di sana, gampang beda sendiri kalau salah satu diubah tanpa yang lain.
export async function cekJendelaVoting(
  konfig: { aktif: boolean; mulaiPada: Date | null; tutupPada: Date | null } | null
) {
  if (!konfig || !konfig.aktif) return { open: false, belumMulai: false, sudahTutup: false, message: "Voting dukungan belum/tidak dibuka" };
  const now = new Date();
  if (konfig.mulaiPada && now < konfig.mulaiPada) return { open: false, belumMulai: true, sudahTutup: false, message: "Voting belum dibuka" };
  if (konfig.tutupPada && now > konfig.tutupPada) return { open: false, belumMulai: false, sudahTutup: true, message: "Voting sudah ditutup, terima kasih atas dukungannya!" };
  return { open: true, belumMulai: false, sudahTutup: false, message: undefined as string | undefined };
}

// ─── Admin: Konfigurasi Voting ────────────────────────────────────────────────

export async function saveKonfigVoting(data: FormData) {
  await requireAdmin();
  const aktif = data.get("aktif") === "on";
  const nominalVote = parseInt(data.get("nominalVote") as string);
  const bankNama = data.get("bankNama") as string;
  const bankNoRek = data.get("bankNoRek") as string;
  const bankAtasNama = data.get("bankAtasNama") as string;
  const mulaiPadaRaw = data.get("mulaiPada") as string;
  const tutupPadaRaw = data.get("tutupPada") as string;

  const mulaiPada = parseWibDatetimeLocal(mulaiPadaRaw);
  const tutupPada = parseWibDatetimeLocal(tutupPadaRaw);
  if ((mulaiPadaRaw && !mulaiPada) || (tutupPadaRaw && !tutupPada)) {
    return { success: false, message: "Format tanggal tidak valid" };
  }
  if (mulaiPada && tutupPada && mulaiPada >= tutupPada) {
    return { success: false, message: "Waktu mulai harus sebelum waktu tutup" };
  }

  // Kategori tambahan (di luar "Tim Favorit" bawaan) — dikirim sebagai
  // pasangan array kategoriLabel[]/kategoriUnit[] dengan indeks yang sama.
  const labels = data.getAll("kategoriLabel") as string[];
  const units = data.getAll("kategoriUnit") as string[];
  const usedKeys = new Set<string>();
  const kategoriList: KategoriVoting[] = [];
  for (let i = 0; i < labels.length; i++) {
    const label = (labels[i] || "").trim();
    if (!label) continue;
    const unit: KategoriVoting["unit"] =
      units[i] === "PELATIH" ? "PELATIH" : units[i] === "DANTON" ? "DANTON" : "TIM";
    let key = slugify(label);
    while (usedKeys.has(key) || key === "tim_favorit") key = `${key}_2`;
    usedKeys.add(key);
    kategoriList.push({ key, label, unit });
  }

  try {
    const update: Parameters<typeof upsertKonfigVoting>[0] = {
      aktif,
      nominalVote,
      bankNama,
      bankNoRek,
      bankAtasNama,
      mulaiPada,
      tutupPada,
      kategoriList,
    };
    await upsertKonfigVoting(update);
    revalidatePath("/admin/voting");
    revalidatePath("/vote");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Publik: QRIS Dinamis ─────────────────────────────────────────────────────

// Bangun QRIS dinamis (nominal sudah terisi) dari QRIS statis yang diupload
// admin di /admin/tiket — Voting sengaja pakai QRIS yang sama dengan Tiket/
// Galeri Foto Premium, lihat komentar di KonfigTiket (schema.prisma).
export async function getDynamicQrisVoting(amount: number) {
  const dibatasi = await batasiAksi("qris", 200, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  if (!Number.isFinite(amount) || amount <= 0) return { success: false };
  try {
    const konfig = await findKonfigTiket();
    const dataUrl = await buildDynamicQrisImage(konfig?.qrisPayload, amount);
    if (!dataUrl) return { success: false };
    return { success: true, dataUrl };
  } catch {
    return { success: false };
  }
}

// ─── Publik: Kirim Dukungan (Vote Berbayar) ──────────────────────────────────

// Kode unik pembayaran vote: 0–499 (permintaan panitia), ditambahkan ke nominal transfer.
// Transaksi diproses otomatis hanya bila ada bukti DAN nominal masuk tepat
// sama dengan totalBayar (harga × jumlah + kode unik); selain itu diproses
// manual oleh admin — lihat autoVerifikasiVotingByNominal.
const KODE_VOTE_MIN = 0;
const KODE_VOTE_MAX = 499;
const RENTANG_KODE_VOTE = KODE_VOTE_MAX - KODE_VOTE_MIN + 1;

// Memesan nomor urut (kode unik) pembayaran secara atomik, dipanggil saat user
// memilih tim — sebelum mengisi form & mengunggah bukti transfer QRIS.
export async function reserveKodeVoting() {
  const dibatasi = await batasiAksi("kode", 120, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  try {
    const konfig = await prisma.konfigVoting.findUnique({ where: { id: "singleton" } });
    if (!konfig) return { success: false, message: "Voting dukungan belum/tidak dibuka" };
    const status = await cekJendelaVoting(konfig);
    if (!status.open) return { success: false, message: status.message };
    // Kode unik berputar di 0–499 (KODE_VOTE_MIN..MAX) dari counter berurutan;
    // kode yang masih dipakai transaksi PENDING dilewati supaya nominal transfer
    // yang sedang menunggu verifikasi tidak kembar.
    let kodeUnik: string | null = null;
    for (let i = 0; i < RENTANG_KODE_VOTE && !kodeUnik; i++) {
      const updated = await prisma.konfigVoting.update({
        where: { id: "singleton" },
        data: { counterUrut: { increment: 1 } },
      });
      const calon = String(KODE_VOTE_MIN + ((updated.counterUrut - 1) % RENTANG_KODE_VOTE));
      const dipakai = await prisma.transaksiVoting.findFirst({ where: { kodeUnik: calon, status: "PENDING" }, select: { id: true } });
      if (!dipakai) kodeUnik = calon;
    }
    if (!kodeUnik)
      return { success: false, message: "Antrean pembayaran sedang penuh, coba lagi beberapa menit lagi" };
    return { success: true, kodeUnik, hargaSatuan: konfig.nominalVote, ...terbitkanTokenKode(kodeUnik) };
  } catch (e) {
    console.error("reserveKodeVoting error:", e);
    return { success: false };
  }
}

export async function submitVote(data: FormData) {
  const dibatasi = await batasiAksi("beli", 40, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  // userId dari sesi, bukan dari klien — kalau dari klien, siapa pun bisa
  // menempelkan transaksinya ke akun orang lain.
  const userId = (await getServerSession())?.user?.id;
  const timId = data.get("timId") as string;
  const nama = data.get("nama") as string;
  const email = data.get("email") as string;
  const noHp = data.get("noHp") as string;
  const kodeUnik = data.get("kodeUnik") as string;
  const kategoriRaw = (data.get("kategori") as string) || "tim_favorit";
  const jumlahVote = parseInt(data.get("jumlahVote") as string) || 1;
  const bukti = data.get("bukti") as File | null;

  // Kategori wajib salah satu dari "tim_favorit" atau yang terdaftar di
  // KonfigVoting.kategoriList — cegah klien mengarang key kategori sendiri
  // (nanti dukungannya tidak ke-hitung di leaderboard manapun).
  const konfigKategori = await prisma.konfigVoting.findUnique({ where: { id: "singleton" } });
  const kategoriValid = getKategoriList(konfigKategori).some((k) => k.key === kategoriRaw);
  if (!kategoriValid) {
    return { success: false, message: "Kategori dukungan tidak valid, silakan ulangi dari pemilihan tim" };
  }
  const kategori = kategoriRaw;

  // Bukti WAJIB (aturan panitia: yang diproses hanya yang ada bukti). Bayar
  // selalu via QRIS, dan semua aplikasi pembayaran menyimpan riwayat transaksi,
  // jadi pendukung selalu bisa screenshot dari sana.
  const buktiAda = !!bukti && bukti.size > 0;
  if (!buktiAda) {
    return {
      success: false,
      message: "Bukti pembayaran wajib diunggah — bisa screenshot dari riwayat transaksi di aplikasi pembayaranmu",
    };
  }
  const fileCheck = await validateUploadFile(bukti as File);
  if (!fileCheck.valid) return { success: false, message: fileCheck.message };
  if (!kodeUnik || !/^\d+$/.test(kodeUnik)) {
    return { success: false, message: "Kode pembayaran tidak valid, silakan ulangi dari pemilihan tim" };
  }
  const salahKode = cekTokenKode(data.get("kodeToken"), kodeUnik);
  if (salahKode) return { success: false, message: salahKode };
  if (!Number.isInteger(jumlahVote) || jumlahVote < 1 || jumlahVote > 10000) {
    return { success: false, message: "Jumlah vote tidak valid (1–10.000)" };
  }
  const salahData = cekDataPemesan({ nama, email, noHp });
  if (salahData) return { success: false, message: salahData };

  // Pastikan kodeUnik benar-benar pernah di-reserve (bukan dikarang klien) dan
  // belum dipakai transaksi lain — mencegah dua transaksi bertabrakan nominal
  // transfernya, yang akan membingungkan admin saat rekonsiliasi manual.
  // Asal kode sudah dijamin token bertanda tangan (cekTokenKode di atas); di sini
  // cukup rentang 0–499. Kode berputar, jadi yang dicek hanya transaksi PENDING
  // (yang VERIFIED sudah selesai dicocokkan admin, kodenya boleh dipakai lagi).
  const kodeAngka = parseInt(kodeUnik);
  if (kodeAngka < KODE_VOTE_MIN || kodeAngka > KODE_VOTE_MAX) {
    return { success: false, message: "Kode pembayaran tidak valid, silakan ulangi dari pemilihan tim" };
  }
  const kodeDipakai = await prisma.transaksiVoting.findFirst({
    where: { kodeUnik, status: "PENDING" },
  });
  if (kodeDipakai) {
    return { success: false, message: "Kode pembayaran sudah terpakai, silakan ulangi dari pemilihan tim untuk mendapat kode baru" };
  }

  try {
    const konfig = await prisma.konfigVoting.findUnique({ where: { id: "singleton" } });
    if (!konfig) return { success: false, message: "Voting dukungan belum/tidak dibuka" };
    const status = await cekJendelaVoting(konfig);
    if (!status.open) return { success: false, message: status.message };

    const tim = await prisma.tim.findUnique({ where: { id: timId } });
    if (!tim || !tim.confirmed || tim.gugurTanpaVote) return { success: false, message: "Tim tidak ditemukan" };

    let buktiUrl: string | undefined;
    if (buktiAda) {
      const upload = await imageUploader(Buffer.from(await (bukti as File).arrayBuffer()));
      if (upload.error) {
        console.error("Upload bukti vote gagal:", upload.message);
        return { success: false, message: upload.message };
      }
      buktiUrl = upload.data?.url;
    }

    const totalBayar = konfig.nominalVote * jumlahVote + parseInt(kodeUnik);

    const vote = await prisma.transaksiVoting.create({
      select: { tim: { select: { nama_tim: true } } },
      data: {
        tim: { connect: { id: timId } },
        nama,
        email,
        noHp,
        kategori,
        jumlahVote,
        hargaSatuan: konfig.nominalVote,
        kodeUnik,
        totalBayar,
        ...(buktiUrl ? { bukti: buktiUrl } : {}),
        status: "PENDING",
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });
    notifPembayaranMasuk({
      jenis: "Dukungan",
      pathAdmin: "/admin/voting",
      nama,
      kontak: `${email} · ${noHp}`,
      totalBayar,
      kodeUnik,
      metodePembayaran: "QRIS",
      buktiUrl,
      detail: `${jumlahVote} dukungan untuk ${vote.tim.nama_tim} (${kategori})`,
    });

    revalidatePath("/vote");
    return { success: true };
  } catch (e) {
    console.error("submitVote error:", e);
    return { success: false };
  }
}

// ─── Admin: Verifikasi Dukungan ──────────────────────────────────────────────

export async function verifikasiVoting(transaksiId: string) {
  await requireAdminOrBendahara();
  try {
    return await markVotingVerified(transaksiId);
  } catch (e) {
    console.error("verifikasiVoting error:", e);
    return { success: false };
  }
}

// ─── Admin: Pencocokan Nominal (semi-otomatis) ───────────────────────────────
//
// Admin menyalin daftar nominal masuk dari riwayat QRIS di aplikasi merchant,
// sistem mencocokkan ke transaksi PENDING yang nominalnya TEPAT sama. Sesuai
// aturan panitia, hanya transaksi yang ada bukti yang boleh diverifikasi lewat
// jalur ini; yang cocok tapi tanpa bukti ditampilkan terpisah untuk manual.

// "Rp 10.123", "10123", "10.123,00" → 10123. Format Indonesia: titik = ribuan,
// koma = desimal (sen dibuang).
function parseNominal(token: string): number | null {
  let t = token.replace(/rp\.?/gi, "").trim();
  if (!t) return null;
  t = t.replace(/,\d{1,2}$/, "");
  const digit = t.replace(/\D/g, "");
  if (!digit) return null;
  const n = parseInt(digit, 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export type HasilCocokVoting = {
  cocok: {
    nominal: number;
    id: string;
    nama: string;
    tim: string;
    kategori: string;
    jumlahVote: number;
    kodeUnik: string;
    bukti: string;
  }[];
  tanpaBukti: { nominal: number; nama: string; tim: string; kodeUnik: string }[];
  tidakCocok: number[];
};

export async function cocokkanNominalVoting(
  teks: string
): Promise<{ success: true; hasil: HasilCocokVoting } | { success: false; message: string }> {
  await requireAdminOrBendahara();
  // Satu nominal per baris (atau dipisah titik koma / tab). Koma TIDAK dipakai
  // sebagai pemisah karena di format Indonesia koma adalah desimal.
  const nominals = (teks || "")
    .split(/[\n;\t]+/)
    .map(parseNominal)
    .filter((n): n is number => n !== null);
  if (nominals.length === 0) return { success: false, message: "Tidak ada nominal yang terbaca" };
  if (nominals.length > 1000) return { success: false, message: "Maksimal 1.000 nominal sekali cocok" };

  const kandidat = await prisma.transaksiVoting.findMany({
    where: { status: "PENDING", totalBayar: { in: Array.from(new Set(nominals)) } },
    orderBy: { createdAt: "asc" },
    include: { tim: { select: { nama_tim: true } } },
  });

  // Satu nominal masuk = satu transaksi. Kalau nominal yang sama muncul dua
  // kali di riwayat, dua transaksi (tertua dulu) ikut dicocokkan.
  const terpakai = new Set<string>();
  const hasil: HasilCocokVoting = { cocok: [], tanpaBukti: [], tidakCocok: [] };
  for (const nominal of nominals) {
    const tr = kandidat.find((k) => k.totalBayar === nominal && !terpakai.has(k.id));
    if (!tr) {
      hasil.tidakCocok.push(nominal);
      continue;
    }
    terpakai.add(tr.id);
    if (tr.bukti) {
      hasil.cocok.push({
        nominal,
        id: tr.id,
        nama: tr.nama,
        tim: tr.tim.nama_tim,
        kategori: tr.kategori,
        jumlahVote: tr.jumlahVote,
        kodeUnik: tr.kodeUnik,
        bukti: tr.bukti,
      });
    } else {
      hasil.tanpaBukti.push({ nominal, nama: tr.nama, tim: tr.tim.nama_tim, kodeUnik: tr.kodeUnik });
    }
  }
  return { success: true, hasil };
}

export async function verifikasiVotingMassal(ids: string[]) {
  await requireAdminOrBendahara();
  if (!Array.isArray(ids) || ids.length === 0) return { success: false, message: "Tidak ada transaksi dipilih" };
  if (ids.length > 1000) return { success: false, message: "Maksimal 1.000 transaksi sekali verifikasi" };
  // Cek ulang di server: hanya PENDING yang ada bukti (aturan panitia).
  const layak = await prisma.transaksiVoting.findMany({
    where: { id: { in: ids }, status: "PENDING", bukti: { not: null } },
    select: { id: true },
  });
  let berhasil = 0;
  for (const { id } of layak) {
    try {
      const r = await markVotingVerified(id);
      if (r.success) berhasil++;
    } catch (e) {
      console.error("verifikasiVotingMassal error:", id, e);
    }
  }
  revalidatePath("/admin/voting");
  return { success: true, berhasil, gagal: ids.length - berhasil };
}

export async function rejectVoting(transaksiId: string) {
  await requireAdminOrBendahara();
  try {
    const transaksi = await findTransaksiVoting({ id: transaksiId });
    // Hanya yang masih PENDING — menolak transaksi yang sudah VERIFIED akan
    // meninggalkan entri kas/suara/QR yang sudah tercatat.
    const tolak = await prisma.transaksiVoting.updateMany({ where: { id: transaksiId, status: "PENDING" }, data: { status: "REJECTED" } });
    if (tolak.count === 0) return { success: false, message: "Transaksi sudah diproses sebelumnya" };
    if (transaksi) {
      await catatLog("TOLAK_VOTING", `Dukungan ${transaksi.jumlahVote}x untuk ${transaksi.tim.nama_tim} (${transaksi.nama})`);
    }
    revalidatePath("/admin/voting");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// Export Excel detail voting: ringkasan, rekap per tim tiap kategori, dan
// seluruh transaksi (data pendukung didekripsi otomatis oleh Prisma).
// jenjang kosong = semua jenjang; diisi = hanya tim & transaksi jenjang itu.
export async function exportDataVoting(jenjang?: string) {
  try {
    await requireAdminOrBendahara();
  } catch {
    return { success: false, message: "Forbidden" };
  }
  const JENJANG = ["SD", "SMP", "SMA", "PURNA"] as const;
  const filterJenjang = JENJANG.find((j) => j === jenjang);
  if (jenjang && !filterJenjang) return { success: false, message: "Jenjang tidak valid" };
  try {
    const [konfig, tims, transaksis, tallyAll, dantonMap] = await Promise.all([
      findKonfigVoting(),
      prisma.tim.findMany({
        where: { confirmed: true, gugurTanpaVote: false, ...(filterJenjang && { jenjang: filterJenjang }) },
        select: { id: true, nama_tim: true, asal_sekolah: true, jenjang: true, noUrut: true, pelatih: true, totalVote: true },
      }),
      prisma.transaksiVoting.findMany({
        where: filterJenjang ? { tim: { jenjang: filterJenjang } } : undefined,
        include: { tim: { select: { nama_tim: true, asal_sekolah: true, jenjang: true } } },
        orderBy: { createdAt: "asc" },
      }),
      findVotingTallyMap(),
      findDantonMap(),
    ]);
    const timIds = new Set([...tims.map((t) => t.id), ...transaksis.map((t) => t.timId)]);
    const tallyMap = filterJenjang
      ? Object.fromEntries(Object.entries(tallyAll).filter(([id]) => timIds.has(id)))
      : tallyAll;
    const tanggal = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
    return {
      success: true,
      base64: buildVotingWorkbook(tims, transaksis, getKategoriList(konfig), tallyMap, dantonMap),
      filename: `Rekap-Voting-${filterJenjang ?? "Semua"}-${tanggal}.xlsx`,
    };
  } catch (e) {
    console.error("exportDataVoting error:", e);
    return { success: false, message: "Gagal membuat file Excel" };
  }
}
