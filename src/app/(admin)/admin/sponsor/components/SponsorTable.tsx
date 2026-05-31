"use client";

import { deleteSponsorForm, toggleAktifSponsor } from "@/actions/Sponsor";
import { Sponsor } from "@prisma/client";
import Image from "next/image";
import { useRouter } from "next-nprogress-bar";
import { toast } from "sonner";

const TIPE_LABEL: Record<string, string> = {
  SPONSOR: "Sponsor",
  MEDIA_PARTNER: "Media Partner",
  SUPPORT_BY: "Support By",
};

const TIPE_COLOR: Record<string, string> = {
  SPONSOR: "bg-blue-100 text-blue-700",
  MEDIA_PARTNER: "bg-purple-100 text-purple-700",
  SUPPORT_BY: "bg-green-100 text-green-700",
};

export default function SponsorTable({ data }: { data: Sponsor[] }) {
  const router = useRouter();

  async function handleToggle(id: string, aktif: boolean) {
    const toastId = toast.loading("Memperbarui...");
    const result = await toggleAktifSponsor(id, !aktif);
    if (result.success) {
      toast.success(aktif ? "Disembunyikan dari halaman" : "Ditampilkan di halaman", { id: toastId });
      router.refresh();
    } else {
      toast.error("Gagal memperbarui", { id: toastId });
    }
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus sponsor "${nama}"?`)) return;
    const toastId = toast.loading("Menghapus...");
    const result = await deleteSponsorForm(id);
    if (result.success) {
      toast.success("Sponsor dihapus", { id: toastId });
      router.refresh();
    } else {
      toast.error("Gagal menghapus", { id: toastId });
    }
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center text-gray-400">
        Belum ada sponsor. Tambahkan melalui form di atas.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100 font-semibold">
        Daftar Sponsor ({data.length})
      </div>
      <div className="divide-y divide-neutral-100">
        {data.map((s) => (
          <div
            key={s.id}
            className={`flex items-center gap-4 px-6 py-4 transition-colors ${!s.aktif ? "opacity-50 bg-neutral-50" : ""}`}
          >
            {/* Logo */}
            <div className="w-24 h-14 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              <Image
                src={s.logoUrl}
                alt={s.nama}
                width={96}
                height={56}
                unoptimized
                className="object-contain max-h-full max-w-full p-1"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{s.nama}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPE_COLOR[s.tipe] ?? "bg-neutral-100 text-neutral-600"}`}
                >
                  {TIPE_LABEL[s.tipe] ?? s.tipe}
                </span>
                <span className="text-xs text-gray-400">Urutan: {s.urutan}</span>
                {s.linkUrl && (
                  <a
                    href={s.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline truncate max-w-[200px]"
                  >
                    {s.linkUrl}
                  </a>
                )}
              </div>
            </div>

            {/* Aksi */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleToggle(s.id, s.aktif)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  s.aktif
                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {s.aktif ? "Sembunyikan" : "Tampilkan"}
              </button>
              <button
                onClick={() => handleDelete(s.id, s.nama)}
                className="px-3 py-1.5 text-xs rounded-lg font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
