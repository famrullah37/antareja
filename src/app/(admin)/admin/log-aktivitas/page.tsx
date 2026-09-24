export const dynamic = "force-dynamic";
import { getActivityLogs } from "@/queries/activityLog.query";
import { H1 } from "@/app/components/global/Text";
import LogAktivitasClient from "./LogAktivitasClient";

export default async function LogAktivitasPage() {
  const logs = await getActivityLogs();

  return (
    <div className="flex flex-col gap-8">
      <H1>Log Aktivitas</H1>
      <LogAktivitasClient logs={logs} />
    </div>
  );
}
