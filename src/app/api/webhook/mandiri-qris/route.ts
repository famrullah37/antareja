import { autoVerifikasiVotingByNominal } from "@/actions/Voting";
import { NextRequest, NextResponse } from "next/server";

// ─── Webhook callback QRIS Mandiri (KERANGKA — belum tersambung penuh) ───────
//
// Status: menunggu kredensial & dokumentasi payload dari
// developer.bankmandiri.co.id (portal sempat maintenance). Begini rencananya
// begitu kredensial API sudah ada:
//
// 1. Daftarkan URL endpoint ini sebagai "Callback URL" di dashboard Mandiri
//    API untuk produk QRIS/SNAP QRIS.
// 2. Set MANDIRI_WEBHOOK_SECRET di .env — nilainya HARUS sama dengan yang
//    dikonfigurasi di sisi Mandiri (atau ganti seluruh blok verifikasi di
//    bawah dengan skema signature resmi SNAP kalau Mandiri pakai HMAC/
//    asymmetric signature, bukan shared secret sederhana — cek dokumentasi
//    resminya, jangan asal tebak).
// 3. Sesuaikan `body.amount` di bawah dengan nama field asli dari payload
//    Mandiri (biasanya sesuatu seperti `data.paymentInfo.amount.value` pada
//    skema SNAP BI) — field ini masih placeholder.
//
// Sampai itu semua terisi, endpoint ini AMAN untuk di-deploy (menolak semua
// request karena MANDIRI_WEBHOOK_SECRET belum di-set), tapi belum benar-benar
// menerima apa pun dari Mandiri.
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.MANDIRI_WEBHOOK_SECRET;
  if (!expectedSecret) {
    // Belum dikonfigurasi sama sekali — tolak, jangan diam-diam "berhasil".
    return NextResponse.json({ error: "Webhook belum dikonfigurasi" }, { status: 503 });
  }

  // TODO: ganti dengan skema verifikasi resmi dari dokumentasi Mandiri
  // (banyak API SNAP pakai signature di header, bukan shared secret polos
  // di body/header sederhana seperti ini) begitu dokumentasinya didapat.
  const givenSecret = req.headers.get("x-webhook-secret");
  if (givenSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  }

  // TODO: sesuaikan path field ini dengan payload asli Mandiri.
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Field 'amount' tidak ditemukan/valid" }, { status: 400 });
  }

  const result = await autoVerifikasiVotingByNominal(amount);
  return NextResponse.json(result, { status: result.success ? 200 : 200 });
  // Catatan: tetap balas 200 meski `success: false` (mis. tidak ada
  // transaksi PENDING yang cocok) — itu bukan error di sisi kita, cuma
  // berarti mutasi ini bukan untuk pembayaran voting (mungkin transaksi
  // rekening lain). Balas non-200 hanya untuk kegagalan otentikasi/format
  // request, supaya Mandiri tidak retry sia-sia untuk kasus yang memang
  // tidak relevan.
}
