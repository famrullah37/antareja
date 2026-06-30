"use client";

import { updateProfileUser } from "@/actions/User";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, string> = {
  USER: "Peserta",
  ADMIN: "Admin",
  JURI: "Juri",
  FOTOGRAFER: "Fotografer",
};

const ROLE_COLORS: Record<string, string> = {
  USER: "bg-blue-100 text-blue-700",
  ADMIN: "bg-purple-100 text-purple-700",
  JURI: "bg-green-100 text-green-700",
  FOTOGRAFER: "bg-orange-100 text-orange-700",
};

export default function ProfileForm({
  user,
}: {
  user: { id: string; nama: string; email: string; role: string };
}) {
  async function handleSubmit(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const result = await updateProfileUser(data);
    if (result.success) toast.success("Profil berhasil diperbarui!", { id: toastId });
    else toast.error("Gagal menyimpan perubahan", { id: toastId });
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Role badge */}
      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${ROLE_COLORS[user.role] ?? "bg-neutral-100 text-neutral-600"}`}
        >
          {ROLE_LABEL[user.role] ?? user.role}
        </span>
        <span className="text-gray-400 text-sm">{user.email}</span>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Nama Lengkap</label>
          <input
            name="nama"
            type="text"
            defaultValue={user.nama}
            required
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="border border-neutral-100 rounded-lg px-3 py-2 text-sm bg-neutral-50 text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400">Email tidak dapat diubah.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">
            Password Baru <span className="text-gray-400 font-normal">(kosongkan jika tidak ingin ubah)</span>
          </label>
          <input
            name="password"
            type="password"
            placeholder="Masukkan password baru"
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors"
          >
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}
