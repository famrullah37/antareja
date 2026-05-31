"use client";
import { approvePayment } from "@/actions/pembayaran";
import { TimWithRelations } from "@/types/entityRelations";
import { useRouter } from "next-nprogress-bar";
import { useEffect, useState } from "react";
import DataTable, { TableColumn } from "react-data-table-component";
import { toast } from "sonner";

export default function TimTable({ data }: { data: TimWithRelations[] }) {
  const [loader, setLoader] = useState(true);
  const router = useRouter();

  async function handleApprove(e: React.MouseEvent, timId: string, isDP: boolean) {
    e.stopPropagation();
    const toastId = toast.loading("Mengkonfirmasi...");
    const result = await approvePayment(timId, isDP);
    if (result.success) toast.success("Pembayaran terkonfirmasi!", { id: toastId });
    else toast.error("Gagal konfirmasi", { id: toastId });
  }

  const columns: TableColumn<TimWithRelations>[] = [
    {
      name: "Nama tim",
      selector: (row) => row.nama_tim,
      sortable: true,
    },
    {
      name: "Asal Sekolah",
      selector: (row) => row.asal_sekolah,
      sortable: true,
    },
    {
      name: "Jenjang",
      selector: (row) => row.jenjang,
      sortable: true,
    },
    {
      name: "Tipe Pembayaran",
      cell: (row) =>
        row.pembayaran?.isDP ? (
          <span className="bg-primary-500 text-white rounded-2xl py-2 px-3 text-center text-sm">
            DP 50%
          </span>
        ) : (
          <span className="bg-green-500 text-white rounded-2xl py-2 px-3 text-center text-sm">
            Full
          </span>
        ),
      sortable: false,
    },
    {
      name: "Status",
      cell: (row) =>
        row.confirmed ? (
          <span className="bg-green-500 text-white rounded-2xl py-2 px-3 text-center text-sm">
            Terkonfirmasi
          </span>
        ) : (
          <span className="bg-yellow-400 text-white rounded-2xl py-2 px-3 text-center text-sm">
            Menunggu
          </span>
        ),
      sortable: false,
    },
    {
      name: "Aksi",
      cell: (row) =>
        !row.confirmed && row.pembayaran ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handleApprove(e, row.id, false)}
              className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors"
            >
              Lunas
            </button>
            <button
              onClick={(e) => handleApprove(e, row.id, true)}
              className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors"
            >
              DP
            </button>
          </div>
        ) : null,
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
            style: { "&:hover": { cursor: "pointer" } },
          },
        }}
        onRowClicked={(row) => router.push(`/admin/pembayaran/${row.id}`)}
      />
    </div>
  );
}
