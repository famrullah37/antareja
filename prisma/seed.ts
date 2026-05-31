import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  // ── Peserta demo (menunggu konfirmasi) ───────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: "peserta@demo.com" },
    update: {},
    create: {
      nama: "Demo Peserta",
      email: "peserta@demo.com",
      password,
      role: "USER",
      verified: true,
    },
  });

  const tim = await prisma.tim.upsert({
    where: { id: "seed-tim-001" },
    update: { confirmed: false },
    create: {
      id: "seed-tim-001",
      nama_tim: "Tim Demo Antareja",
      asal_sekolah: "SMKN 1 Demo",
      jenjang: "SMA",
      pelatih: "Bapak Demo",
      no_pelatih: "081234567890",
      tipe_tim: "NORMAL",
      confirmed: false,
      userId: user.id,
    },
  });

  await prisma.pembayaran.upsert({
    where: { tim_id: tim.id },
    update: {},
    create: {
      tim_id: tim.id,
      bukti_tf: "https://placehold.co/400x600/png",
      bank: "BCA",
      nama_rek: "Demo Peserta",
      isDP: false,
    },
  });

  // ── 3 Peserta SMA (sudah dikonfirmasi + sudah dinilai) ───────────────────────
  const smaTims = [
    {
      userId: "seed-user-sma-1",
      timId: "seed-tim-sma-1",
      penilaianId: "seed-penilaian-sma-1",
      user: { nama: "Ketua Tim Garuda", email: "garuda@sma.demo.com" },
      tim: {
        nama_tim: "Tim Garuda",
        asal_sekolah: "SMAN 1 Malang",
        pelatih: "Pak Budi Santoso",
        no_pelatih: "082111111111",
      },
      pembayaran: { bank: "BRI", nama_rek: "Ketua Tim Garuda" },
      penilaian: { nilaiKotor: 870, totalPengurang: 20, nilaiAkhir: 850 },
    },
    {
      userId: "seed-user-sma-2",
      timId: "seed-tim-sma-2",
      penilaianId: "seed-penilaian-sma-2",
      user: { nama: "Ketua Tim Rajawali", email: "rajawali@sma.demo.com" },
      tim: {
        nama_tim: "Tim Rajawali",
        asal_sekolah: "SMAN 2 Malang",
        pelatih: "Ibu Sari Dewi",
        no_pelatih: "082222222222",
      },
      pembayaran: { bank: "Mandiri", nama_rek: "Ketua Tim Rajawali" },
      penilaian: { nilaiKotor: 800, totalPengurang: 20, nilaiAkhir: 780 },
    },
    {
      userId: "seed-user-sma-3",
      timId: "seed-tim-sma-3",
      penilaianId: "seed-penilaian-sma-3",
      user: { nama: "Ketua Tim Elang", email: "elang@sma.demo.com" },
      tim: {
        nama_tim: "Tim Elang",
        asal_sekolah: "SMK Telkom Malang",
        pelatih: "Pak Agus Wijaya",
        no_pelatih: "082333333333",
      },
      pembayaran: { bank: "BCA", nama_rek: "Ketua Tim Elang" },
      penilaian: { nilaiKotor: 740, totalPengurang: 20, nilaiAkhir: 720 },
    },
  ];

  for (const data of smaTims) {
    const smaUser = await prisma.user.upsert({
      where: { email: data.user.email },
      update: {},
      create: {
        id: data.userId,
        nama: data.user.nama,
        email: data.user.email,
        password,
        role: "USER",
        verified: true,
      },
    });

    const smaTim = await prisma.tim.upsert({
      where: { id: data.timId },
      update: { confirmed: true },
      create: {
        id: data.timId,
        nama_tim: data.tim.nama_tim,
        asal_sekolah: data.tim.asal_sekolah,
        jenjang: "SMA",
        pelatih: data.tim.pelatih,
        no_pelatih: data.tim.no_pelatih,
        tipe_tim: "NORMAL",
        confirmed: true,
        userId: smaUser.id,
      },
    });

    await prisma.pembayaran.upsert({
      where: { tim_id: smaTim.id },
      update: {},
      create: {
        tim_id: smaTim.id,
        bukti_tf: "https://placehold.co/400x600/png",
        bank: data.pembayaran.bank,
        nama_rek: data.pembayaran.nama_rek,
        isDP: false,
      },
    });

    await prisma.penilaianBaru.upsert({
      where: { id: data.penilaianId },
      update: {
        nilaiKotor: data.penilaian.nilaiKotor,
        totalPengurang: data.penilaian.totalPengurang,
        nilaiAkhir: data.penilaian.nilaiAkhir,
      },
      create: {
        id: data.penilaianId,
        timId: smaTim.id,
        nilaiKotor: data.penilaian.nilaiKotor,
        totalPengurang: data.penilaian.totalPengurang,
        nilaiAkhir: data.penilaian.nilaiAkhir,
        status: "SELESAI",
        published: true,
      },
    });

    console.log(`  Tim SMA: ${smaTim.nama_tim} (${smaTim.asal_sekolah}) — nilai akhir: ${data.penilaian.nilaiAkhir}`);
  }

  console.log("\nSeed selesai:");
  console.log(`  User demo: ${user.email} / password123`);
  console.log(`  Tim demo:  ${tim.nama_tim} (menunggu konfirmasi)`);
  console.log("  3 tim SMA sudah dikonfirmasi dan dinilai (garuda/rajawali/elang @sma.demo.com / password123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
