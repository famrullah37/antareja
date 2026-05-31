import { findUser, updateUser } from "@/queries/user.query";
import { redirect } from "next/navigation";
import { H1 } from "@/app/components/global/Text";
import { SecondaryLinkButton } from "@/app/components/global/LinkButton";

export default async function Verification({
  searchParams,
}: {
  searchParams?: { token: string };
}) {
  const token = searchParams?.token;

  if (!token) return redirect("/");

  // cari user berdasarkan token
  const user = await findUser({  token });

  // kalau token invalid atau sudah diverifikasi
  if (!user || user.verified) {
    return redirect("/");
  }

  // update user jadi verified
  await updateUser({ id: user.id }, { verified: true, token: null });

  return (
    <div className="flex justify-center items-center text-center text-wrap flex-col h-screen gap-5 px-6 sm:px-0">
      <H1>Berhasil memverifikasi akun {user.email}!</H1>
      <SecondaryLinkButton href="/auth/login">Login</SecondaryLinkButton>
    </div>
  );
}
