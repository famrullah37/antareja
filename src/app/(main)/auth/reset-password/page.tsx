import { cekTokenReset } from "@/actions/ResetPassword";
import { H3, P } from "@/app/components/global/Text";
import Link from "next/link";
import ResetForm from "./ResetForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token = searchParams?.token ?? "";
  const valid = await cekTokenReset(token);

  return (
    <div className="flex justify-center items-center my-[24px] mx-4 sm:mx-[40px] min-h-[60vh]">
      <div className="bg-white w-full sm:w-[458px] rounded-[24px]">
        <div className="p-5 sm:p-[24px] flex flex-col gap-[18px]">
          <H3>Buat Password Baru</H3>
          {valid ? (
            <ResetForm token={token} />
          ) : (
            <>
              <P>Link reset tidak valid atau sudah kedaluwarsa (berlaku 1 jam, sekali pakai).</P>
              <Link href={"/auth/lupa-password"} className="text-primary-500 font-bold text-center">
                Minta link baru
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
