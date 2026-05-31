export const dynamic = "force-dynamic";
import { findUsers } from "@/queries/user.query";
import { H1 } from "@/app/components/global/Text";
import UserTable from "./components/Table";
import AddStaffSection from "./components/AddStaffSection";

export default async function Users() {
  const users = await findUsers();

  return (
    <div className="py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <H1>Manajemen User</H1>
      </div>
      <AddStaffSection />
      <div>
        <h2 className="text-lg font-semibold mb-3">Daftar User</h2>
        <UserTable data={users} />
      </div>
    </div>
  );
}
