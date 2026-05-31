"use client";

import { deleteUserForm, updateRoleUser } from "@/actions/User";
import { User } from "@prisma/client";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { FaRegTrashCan } from "react-icons/fa6";
import { toast } from "sonner";

const ROLE_COLORS: Record<string, string> = {
  USER: "bg-blue-100 text-blue-700",
  ADMIN: "bg-purple-100 text-purple-700",
  JURI: "bg-green-100 text-green-700",
  TIKET: "bg-cyan-100 text-cyan-700",
  BENDAHARA: "bg-yellow-100 text-yellow-700",
  FOTOGRAFER: "bg-orange-100 text-orange-700",
};

const PAGE_SIZE = 10;

export default function TimTable({ data }: { data: User[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<"nama" | "email" | "role">("nama");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = data
    .filter(
      (u) =>
        u.nama.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey] as string;
      const bv = b[sortKey] as string;
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  }

  function SortIcon({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>;
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Cari nama atau email..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="border border-neutral-300 rounded-xl px-4 py-2.5 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
      />

      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600 text-xs">
            <tr>
              <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("nama")}>
                Nama <SortIcon col="nama" />
              </th>
              <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("email")}>
                Email <SortIcon col="email" />
              </th>
              <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("role")}>
                Role <SortIcon col="role" />
              </th>
              <th className="px-4 py-3 text-left">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {paged.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Tidak ada data
                </td>
              </tr>
            )}
            {paged.map((user) => (
              <tr
                key={user.id}
                className="bg-white hover:bg-neutral-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/admin/user/${user.id}`)}
              >
                <td className="px-4 py-3 font-medium">{user.nama}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    defaultValue={user.role}
                    className={`text-xs font-semibold px-2 py-1 rounded-full border-none outline-none cursor-pointer ${ROLE_COLORS[user.role] ?? "bg-neutral-100"}`}
                    onChange={async (e) => {
                      const toastId = toast.loading("Mengubah role...");
                      const result = await updateRoleUser(user.id, e.target.value as any);
                      if (result.success) toast.success("Role diperbarui!", { id: toastId });
                      else toast.error("Gagal ubah role", { id: toastId });
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="JURI">JURI</option>
                    <option value="TIKET">TIKET</option>
                    <option value="BENDAHARA">BENDAHARA</option>
                    <option value="FOTOGRAFER">FOTOGRAFER</option>
                  </select>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={async () => {
                      if (!confirm("Hapus user ini?")) return;
                      const toastId = toast.loading("Menghapus...");
                      const result = await deleteUserForm(user.id);
                      if (result.success) toast.success("User dihapus!", { id: toastId });
                      else toast.error("Gagal menghapus!", { id: toastId });
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <FaRegTrashCan size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{filtered.length} user · halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1.5">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`px-3 py-1.5 rounded-lg border transition-colors ${page === p ? "bg-primary-500 text-white border-primary-500" : "border-neutral-200 hover:bg-neutral-100"}`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
