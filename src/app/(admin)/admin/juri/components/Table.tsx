"use client";

import { deleteJuriForm } from "@/actions/Juri";
import { Juri } from "@prisma/client";
import Image from "next/image";
import { useRouter } from "next-nprogress-bar";
import { useEffect, useState } from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import { toast } from "sonner";

export default function JuriTable({ data }: { data: Juri[] }) {
  const [loader, setLoader] = useState(true);
  const router = useRouter();

  const columns: TableColumn<Juri>[] = [
    {
      name: "Foto",
      cell: (row: Juri) => (
        <Image
          src={row.foto}
          alt={row.nama}
          width={48}
          height={48}
          className="w-12 h-12 rounded-full object-cover my-2"
        />
      ),
      width: "80px",
    },
    {
      name: "Nama",
      selector: (row: Juri) => row.nama,
      sortable: true,
    },
    {
      name: "Email",
      selector: (row: Juri) => row.email,
      sortable: true,
    },
    {
      name: "No. HP",
      selector: (row: Juri) => row.no_hp,
    },
    {
      name: "Kategori",
      selector: (row: Juri) => row.kategori,
      sortable: true,
    },
    {
      name: "Aksi",
      cell: (row: Juri) => (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            const toastId = toast.loading("Menghapus...");
            const result = await deleteJuriForm(row.id);
            if (result.success) {
              toast.success("Juri dihapus", { id: toastId });
              router.refresh();
            } else {
              toast.error("Gagal menghapus", { id: toastId });
            }
          }}
          className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
        >
          Hapus
        </button>
      ),
    },
  ];

  useEffect(() => {
    setLoader(false);
  }, []);

  if (loader) return <div>Loading</div>;

  return (
    <div className="p-2 rounded-md bg-white">
      <DataTable
        columns={columns}
        data={data}
        pagination
        highlightOnHover
        customStyles={{
          cells: { style: { "&:hover": { cursor: "pointer" } } },
        }}
        onRowClicked={(row: Juri) => router.push(`/admin/juri/${row.id}`)}
      />
    </div>
  );
}
