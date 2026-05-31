"use client";

import { createStaffUser } from "@/actions/User";
import { useState } from "react";
import { toast } from "sonner";

type StaffRole = "FOTOGRAFER" | "TIKET" | "BENDAHARA";

const ROLES: { value: StaffRole; label: string; color: string }[] = [
  { value: "FOTOGRAFER", label: "Fotografer", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "TIKET", label: "Petugas Tiket", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
  { value: "BENDAHARA", label: "Bendahara", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
];

export default function AddStaffSection() {
  const [activeRole, setActiveRole] = useState<StaffRole>("FOTOGRAFER");

  async function handleSubmit(data: FormData) {
    data.set("role", activeRole);
    const toastId = toast.loading("Menyimpan...");
    const result = await createStaffUser(data);
    if (result.success) {
      toast.success("Staff berhasil ditambahkan!", { id: toastId });
      (document.getElementById("staff-form") as HTMLFormElement)?.reset();
    } else {
      toast.error(result.message ?? "Gagal menambahkan staff", { id: toastId });
    }
  }

  return (
    <section className="bg-white border border-neutral-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold mb-4">Tambah Akun Staff</h2>

      <div className="flex gap-2 mb-5 flex-wrap">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setActiveRole(r.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              activeRole === r.value ? r.color : "bg-neutral-100 text-gray-500 border-neutral-200"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <form id="staff-form" action={handleSubmit} className="flex flex-col gap-3 max-w-lg">
        <input type="hidden" name="role" value={activeRole} />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nama Lengkap</label>
          <input
            name="nama"
            required
            placeholder="Nama lengkap"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="email@example.com"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Password</label>
          <input
            name="password"
            type="password"
            required
            placeholder="Password awal"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end mt-1">
          <button
            type="submit"
            className="bg-primary-500 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            Tambah {ROLES.find((r) => r.value === activeRole)?.label}
          </button>
        </div>
      </form>
    </section>
  );
}
