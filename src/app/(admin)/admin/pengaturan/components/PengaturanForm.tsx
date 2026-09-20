"use client";

import { saveKonfigUmum } from "@/actions/KonfigUmum";
import type { TimelineItem } from "@/queries/konfigUmum.query";
import { toast } from "sonner";

type Konfig = {
  countdownTarget: Date;
  countdownAktif: boolean;
  pendaftaranDeadline: Date | null;
  biayaSD: number;
  biayaSDDP: number;
  biayaSMP: number;
  biayaSMPDP: number;
  biayaSMA: number;
  biayaSMADP: number;
  biayaPurna: number;
  biayaPurnaDP: number;
  sdAktif: boolean;
  smpAktif: boolean;
  smaAktif: boolean;
  purnaAktif: boolean;
  kuotaSD: number | null;
  kuotaSMP: number | null;
  kuotaSMA: number | null;
  kuotaPurna: number | null;
  bankNama: string | null;
  bankNoRek: string | null;
  bankAtasNama: string | null;
  timeline: TimelineItem[] | null;
  juklakUrl: string | null;
  videoUrl: string | null;
  bendaharaNama: string | null;
  bendaharaTtdUrl: string | null;
};

const defaultTimelineForForm: TimelineItem[] = [
  { title: "Pendaftaran Peserta", dateString: "", description: "", icon: "📋" },
  { title: "Technical Meeting", dateString: "", description: "", icon: "🤝" },
  { title: "Uji Coba Lapangan", dateString: "", description: "", icon: "🏃" },
  { title: "Pelaksanaan Lomba", dateString: "", description: "", icon: "🏆" },
];

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PengaturanForm({ konfig }: { konfig: Konfig }) {
  async function handleSubmit(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const result = await saveKonfigUmum(data);
    if (result.success) toast.success("Pengaturan disimpan!", { id: toastId });
    else toast.error(result.message ?? "Gagal menyimpan", { id: toastId });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-8 max-w-2xl">
      {/* Countdown / Coming Soon */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Countdown & Coming Soon</h2>
        <p className="text-sm text-gray-500">
          Selama belum diaktifkan, halaman utama akan menampilkan halaman{" "}
          <strong>Coming Soon</strong> untuk pengunjung (admin tetap bisa login &
          masuk ke dashboard seperti biasa). Setelah diaktifkan, halaman utama akan
          otomatis terbuka sendiri tepat saat waktu target tercapai.
        </p>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="countdownAktif"
            defaultChecked={konfig.countdownAktif}
            className="w-4 h-4"
          />
          Aktifkan countdown (buka situs otomatis pada waktu target)
        </label>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Target Waktu</label>
          <input
            type="datetime-local"
            name="countdownTarget"
            defaultValue={toDatetimeLocal(new Date(konfig.countdownTarget))}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>

      {/* Penutupan Pendaftaran */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Penutupan Pendaftaran</h2>
        <p className="text-sm text-gray-500">
          Tanggal ini yang ditampilkan sebagai countdown &quot;Penutupan Pendaftaran&quot; di
          Hero halaman utama — <strong>berbeda</strong> dari &quot;Target Waktu&quot; di atas
          (itu untuk gerbang peluncuran situs/Coming Soon). Kosongkan kalau belum
          mau menampilkan countdown pendaftaran.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Tutup Pendaftaran (opsional)</label>
          <input
            type="datetime-local"
            name="pendaftaranDeadline"
            defaultValue={konfig.pendaftaranDeadline ? toDatetimeLocal(new Date(konfig.pendaftaranDeadline)) : ""}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>

      {/* Timeline Perlombaan */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Timeline Perlombaan</h2>
        <p className="text-sm text-gray-500">
          4 tahap yang ditampilkan di section Timeline halaman utama. Judul & tanggal wajib diisi.
        </p>
        {(konfig.timeline && konfig.timeline.length === 4 ? konfig.timeline : defaultTimelineForForm).map(
          (item, idx) => (
            <div key={idx} className="border border-neutral-200 rounded-lg p-4 flex flex-col gap-3">
              <span className="text-xs font-bold text-primary-500">Tahap {idx + 1}</span>
              <div className="grid sm:grid-cols-[80px_1fr] gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">Ikon</label>
                  <input
                    name={`timelineIcon${idx + 1}`}
                    defaultValue={item.icon}
                    maxLength={4}
                    className="border border-neutral-300 rounded-lg px-3 py-2 text-sm text-center"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">Judul</label>
                  <input
                    name={`timelineTitle${idx + 1}`}
                    defaultValue={item.title}
                    placeholder="Pendaftaran Peserta"
                    required
                    className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Tanggal</label>
                <input
                  name={`timelineDate${idx + 1}`}
                  defaultValue={item.dateString}
                  placeholder="1 Sep – 8 Nov 2026"
                  required
                  className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Deskripsi</label>
                <input
                  name={`timelineDesc${idx + 1}`}
                  defaultValue={item.description}
                  placeholder="Dilaksanakan di SMK Telkom Malang"
                  className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          )
        )}
        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>

      {/* Juklak */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Juklak (Petunjuk Pelaksanaan)</h2>
        <p className="text-sm text-gray-500">
          File PDF yang muncul sebagai tombol download di halaman utama (Hero).
        </p>
        {konfig.juklakUrl && (
          <a
            href={konfig.juklakUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary-600 hover:underline w-fit"
          >
            Lihat file Juklak saat ini
          </a>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Upload File Juklak (PDF)</label>
          <input
            type="file"
            name="juklak"
            accept="application/pdf"
            className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
          />
          <span className="text-xs text-gray-400">Kosongkan jika tidak ingin mengubah file</span>
        </div>
        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>

      {/* Video Antareja */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Video Antareja</h2>
        <p className="text-sm text-gray-500">
          Video yang tampil di halaman utama (bagian Alur Pendaftaran). Bisa berupa link YouTube (biasa, youtu.be,
          atau Shorts), link berbagi file video Google Drive, atau link file video langsung (.mp4/.webm).
          Kosongkan untuk menyembunyikan video.
        </p>
        <div className="flex flex-col gap-1">
          <label htmlFor="videoUrl" className="text-sm font-medium">Link Video</label>
          <input
            id="videoUrl"
            type="url"
            name="videoUrl"
            defaultValue={konfig.videoUrl ?? ""}
            placeholder="https://www.youtube.com/watch?v=..."
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
          />
          <span className="text-xs text-gray-400">
            Untuk Google Drive, pastikan file dibagikan &ldquo;Siapa saja yang memiliki link&rdquo; agar bisa diputar pengunjung.
          </span>
        </div>
        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>

      {/* Tanda Tangan Bendahara (kuitansi) */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Tanda Tangan Bendahara</h2>
        <p className="text-sm text-gray-500">
          Ditampilkan di kuitansi PDF pembayaran pendaftaran (bersama logo Antareja).
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nama Bendahara</label>
          <input
            name="bendaharaNama"
            defaultValue={konfig.bendaharaNama ?? ""}
            placeholder="Nama lengkap bendahara"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {konfig.bendaharaTtdUrl && (
          <img
            // eslint-disable-next-line @next/next/no-img-element -- preview scan tanda tangan, ukuran kecil
            src={konfig.bendaharaTtdUrl}
            alt="Tanda tangan bendahara"
            className="h-16 object-contain border border-neutral-200 rounded-lg bg-white p-2 w-fit"
          />
        )}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Upload Scan/Foto Tanda Tangan</label>
          <input
            type="file"
            name="bendaharaTtd"
            accept="image/*"
            className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
          />
          <span className="text-xs text-gray-400">Kosongkan jika tidak ingin mengubah gambar</span>
        </div>
        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>

      {/* Rekening Pendaftaran */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Rekening Pendaftaran</h2>
        <p className="text-sm text-gray-500">
          Rekening yang ditampilkan di form pendaftaran tim (/form) untuk transfer biaya pendaftaran.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nama Bank</label>
          <input
            name="bankNama"
            defaultValue={konfig.bankNama ?? ""}
            placeholder="Bank Mandiri"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nomor Rekening</label>
          <input
            name="bankNoRek"
            defaultValue={konfig.bankNoRek ?? ""}
            placeholder="1440027643102"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Atas Nama</label>
          <input
            name="bankAtasNama"
            defaultValue={konfig.bankAtasNama ?? ""}
            placeholder="Nama Pemilik Rekening"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>

      {/* Jenjang Aktif */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Jenjang Aktif</h2>
        <p className="text-sm text-gray-500">
          Jenjang yang dimatikan disembunyikan dari kartu kategori di halaman utama & pilihan di
          form pendaftaran. Tim yang sudah terlanjur terdaftar di jenjang itu tidak terpengaruh —
          tetap tampil normal di semua halaman admin, penilaian, sertifikat, dan vote.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "SD", name: "sdAktif", checked: konfig.sdAktif },
            { label: "SMP", name: "smpAktif", checked: konfig.smpAktif },
            { label: "SMA", name: "smaAktif", checked: konfig.smaAktif },
            { label: "Purna", name: "purnaAktif", checked: konfig.purnaAktif },
          ].map(({ label, name, checked }) => (
            <label
              key={name}
              className="flex items-center gap-2 text-sm font-medium border border-neutral-200 rounded-lg px-3 py-2"
            >
              <input type="checkbox" name={name} defaultChecked={checked} className="w-4 h-4" />
              {label}
            </label>
          ))}
        </div>

        <h2 className="font-semibold text-lg mt-2">Kuota Pendaftaran per Jenjang</h2>
        <p className="text-sm text-gray-500">
          Batas maksimal jumlah tim yang boleh mendaftar di jenjang tersebut. Kosongkan (biarkan
          kosong) kalau tidak mau dibatasi. Begitu kuota tercapai, jenjang otomatis tidak bisa
          dipilih lagi di form pendaftaran meskipun statusnya masih Aktif.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "SD", name: "kuotaSD", value: konfig.kuotaSD },
            { label: "SMP", name: "kuotaSMP", value: konfig.kuotaSMP },
            { label: "SMA", name: "kuotaSMA", value: konfig.kuotaSMA },
            { label: "Purna", name: "kuotaPurna", value: konfig.kuotaPurna },
          ].map(({ label, name, value }) => (
            <label key={name} className="flex flex-col gap-1 text-sm font-medium">
              {label}
              <input
                type="number"
                min={0}
                name={name}
                defaultValue={value ?? ""}
                placeholder="Tanpa batas"
                className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
              />
            </label>
          ))}
        </div>

        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>

      {/* Biaya Pendaftaran */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-lg">Biaya Pendaftaran</h2>
        <p className="text-sm text-gray-500">
          Biaya pendaftaran per jenjang yang ditampilkan di halaman utama dan form pendaftaran.
        </p>

        {[
          { label: "SD / Sederajat – Full", name: "biayaSD", value: konfig.biayaSD },
          { label: "SD / Sederajat – DP 50%", name: "biayaSDDP", value: konfig.biayaSDDP },
          { label: "SMP / Sederajat – Full", name: "biayaSMP", value: konfig.biayaSMP },
          { label: "SMP / Sederajat – DP 50%", name: "biayaSMPDP", value: konfig.biayaSMPDP },
          { label: "SMA / Sederajat – Full", name: "biayaSMA", value: konfig.biayaSMA },
          { label: "SMA / Sederajat – DP 50%", name: "biayaSMADP", value: konfig.biayaSMADP },
          { label: "Purna – Full", name: "biayaPurna", value: konfig.biayaPurna },
          { label: "Purna – DP 50%", name: "biayaPurnaDP", value: konfig.biayaPurnaDP },
        ].map(({ label, name, value }) => (
          <div key={name} className="flex flex-col gap-1">
            <label className="text-sm font-medium">{label}</label>
            <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden">
              <span className="bg-neutral-100 px-3 py-2 text-sm text-gray-500 border-r border-neutral-300">
                Rp
              </span>
              <input
                type="number"
                name={name}
                defaultValue={value}
                min={0}
                step={1000}
                className="px-3 py-2 text-sm flex-1 outline-none"
                required
              />
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Simpan
        </button>
      </div>
    </form>
  );
}
