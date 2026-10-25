"use client";

import TextField from "@/app/components/global/Input";
import { LoginButton } from "@/app/components/global/SubmitButton";
import { H3, P } from "@/app/components/global/Text";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { mintaResetPassword } from "@/actions/ResetPassword";

export default function LupaPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [terkirim, setTerkirim] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading("Mengirim link reset...");
    const result = await mintaResetPassword(email);
    setIsLoading(false);
    if (result.success) {
      setTerkirim(true);
      toast.success(result.message, { id: toastId, duration: 6000 });
    } else toast.error(result.message, { id: toastId });
  };

  return (
    <form className="flex justify-center items-center my-[24px] mx-4 sm:mx-[40px] min-h-[60vh]" onSubmit={onSubmit}>
      <div className="bg-white w-full sm:w-[458px] rounded-[24px]">
        <div className="p-5 sm:p-[24px] flex flex-col gap-[18px]">
          <div className="flex flex-col gap-2 text-wrap">
            <H3>Lupa Password</H3>
            <P>Masukkan email akun Anda. Kami akan mengirim link untuk membuat password baru.</P>
          </div>
          {terkirim ? (
            <P className="text-sm bg-primary-300/40 rounded-xl p-4">
              Jika email <b>{email}</b> terdaftar, link reset sudah dikirim dan berlaku 1 jam. Cek inbox dan folder spam.
            </P>
          ) : (
            <div className="flex flex-col gap-2">
              <P className="font-bold text-black">Email</P>
              <TextField
                id="Email"
                placeholder="Email"
                name="email"
                type="email"
                onInput={(e) => setEmail(e.currentTarget.value)}
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-4">
            {!terkirim && (
              <LoginButton
                text={"Kirim Link Reset"}
                className="w-full h-[60px] bg-primary-500 rounded-[14px]"
                disabled={isLoading}
              />
            )}
            <div className="w-full flex justify-center items-center">
              <Link href={"/auth/login"} className="text-primary-500 font-bold">
                Kembali ke Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
