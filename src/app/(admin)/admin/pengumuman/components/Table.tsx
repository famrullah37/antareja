"use client";
import { deletePengumumanForm } from "@/actions/Pengumuman";
import { Pengumuman } from "@prisma/client";
import { useRouter } from "next-nprogress-bar";
import { useEffect, useState } from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import { FaRegTrashCan } from "react-icons/fa6";
import { toast } from "sonner";

export default function PengumumanTable({ data }: { data: Pengumuman[] }) {
  const [loader, setLoader] = useState(true);
  const router = useRouter();

  const columns: TableColumn<Pengumuman>[] = [
    {
      name: "No",
      cell: (row: Pengumuman) => data.indexOf(row) + 1,
      width: "70px",
    },
    {
      name: "Tanggal Dibuat",
      selector: (row: Pengumuman) => new Date(row.createdAt).getTime(),
      format: (row: Pengumuman) =>
        new Date(row.createdAt).toLocaleString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        }),
      sortable: true,
    },
    {
      name: "Content",
      selector: (row: Pengumuman) => row.content,
      cell: (row: Pengumuman) => (
        <span className="whitespace-normal py-2">{row.content}</span>
      ),
      grow: 2,
      sortable: true,
    },
    {
      name: "Hapus",
      cell: (row: Pengumuman) => (
        <div className="flex justify-center items-center">
          <button
            className=""
            onClick={async () => {
              const confirmDelete = confirm(
                "Apakah anda yakin ingin menghapus pengumuman?"
              );
              if (confirmDelete) {
                const toastId = toast.loading("Loading...");
                const result = await deletePengumumanForm(row.id);
                if (!result.success) {
                  toast.error("Gagal menghapus pengumuman!", { id: toastId });
                } else {
                  toast.success("Berhasil menghapus pengumuman!", {
                    id: toastId,
                  });
                }
              }
            }}
          >
            <FaRegTrashCan className="hover:text-[#afafaf] transition-all duration-500 text-[20px]" />
          </button>
        </div>
      ),

      sortable: false,
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
          cells: {
            style: {
              "&:hover": {
                cursor: "pointer",
              },
            },
          },
        }}
      />
    </div>
  );
}
