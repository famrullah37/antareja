import { getServerSession } from "@/lib/next-auth";
import { redirect } from "next/navigation";
import FormComponent from "./components/Form";
import { findUser } from "@/queries/user.query";
import { findTimsByUser } from "@/queries/tim.query";

export default async function Form() {
  const session = await getServerSession();
  if (!session) return redirect("/auth/login");

  const user = await findUser({ id: session.user?.id });
  if (!user?.verified) return redirect("/confirmation");

  const tims = await findTimsByUser(session.user!.id);
  if (tims.length > 0) return redirect("/dashboard");

  return (
    <div className="my-16">
      <FormComponent id={session.user?.id!} />
    </div>
  );
}
