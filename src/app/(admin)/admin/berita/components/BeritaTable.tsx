"use client";

import { deleteBeritaForm, togglePublishBerita } from "@/actions/Berita";
import { Berita } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next-nprogress-bar";
import { toast } from "sonner";
import { formatTanggalBerita } from "@/lib/berita";

export default function BeritaTable({ data }: { data: Berita[] }) {
  const router = useRouter();

  async function handleToggle(id: string, publish: boolean) {
    const toastId = toast.loading("Memperbarui...");
    const result = await togglePublishBerita(id, !publish);
    if (result.success) {
      toast.success(publish ? "Berita disembunyikan" : "Berita diterbitkan", { id: toastId });
      router.refresh();
    } else {
      toast.error("Gagal memperbarui", { id: toastId });
    }
  }

  async function handleDelete(id: string, judul: string) {
    if (!confirm(`Hapus berita "${judul}"?`)) return;
    const toastId = toast.loading("Menghapus...");
    const result = await deleteBeritaForm(id);
    if (result.success) {
      toast.success("Berita dihapus", { id: toastId });
      router.refresh();
    } else {
      toast.error("Gagal menghapus", { id: toastId });
    }
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center text-gray-400">
        Belum ada berita. Klik &quot;Tulis Berita&quot; untuk membuat.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100 font-semibold">Daftar Berita ({data.length})</div>
      <div className="divide-y divide-neutral-100">
        {data.map((b) => (
          <div key={b.id} className="flex items-center gap-4 px-6 py-4 flex-wrap sm:flex-nowrap">
            <div className="relative w-24 h-16 bg-neutral-100 rounded-lg flex-shrink-0 overflow-hidden">
              {b.coverUrl && <Image src={b.coverUrl} alt={b.judul} fill sizes="96px" className="object-cover" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{b.judul}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-400">
                <span
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    b.publish ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {b.publish ? "Terbit" : "Draf"}
                </span>
                <span>{b.penulis}</span>
                <span>{formatTanggalBerita(b.publishedAt ?? b.createdAt, "short")}</span>
                {b.publish && (
                  <Link href={`/berita/${b.slug}`} target="_blank" className="text-blue-500 hover:underline">
                    Lihat
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={`/admin/berita/${b.id}`}
                className="px-3 py-1.5 text-xs rounded-lg font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={() => handleToggle(b.id, b.publish)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  b.publish
                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {b.publish ? "Sembunyikan" : "Terbitkan"}
              </button>
              <button
                onClick={() => handleDelete(b.id, b.judul)}
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
