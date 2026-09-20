import { findUser } from "@/queries/user.query";
import { resolveUserId } from "@/queries/slug.query";
import { makeSlug, isUuid } from "@/lib/timSlug";
import { notFound, redirect } from "next/navigation";
import UserForm from "./components/Form";

export default async function UserEdit({ params }: { params: { id: string } }) {
  if (params.id === "new") return <UserForm />;

  const id = await resolveUserId(params.id);
  const user = id ? await findUser({ id }) : null;
  if (!user) return notFound();

  // URL kanonis = slug; UUID mentah dari link/bookmark lama dirapikan otomatis.
  if (isUuid(params.id)) redirect(`/admin/user/${makeSlug(user.nama, user.id, "user")}`);

  return <UserForm data={user} edit={true} id={user.id} />;
}
