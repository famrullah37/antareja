import { getServerSession } from "@/lib/next-auth";
import { findUser } from "@/queries/user.query";
import { redirect } from "next/navigation";
import SectionWrapper from "@/app/components/global/Wrapper";
import { H2 } from "@/app/components/global/Text";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const session = await getServerSession();
  if (!session) return redirect("/auth/login");

  const user = await findUser({ id: session.user?.id });
  if (!user) return redirect("/auth/login");

  return (
    <SectionWrapper id="profile">
      <H2 className="mb-6">Profil Saya</H2>
      <ProfileForm user={{ id: user.id, nama: user.nama, email: user.email, role: user.role }} />
    </SectionWrapper>
  );
}
