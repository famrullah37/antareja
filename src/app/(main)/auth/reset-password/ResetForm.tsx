"use client";

import { Eye } from "@/app/components/global/Icons";
import TextField from "@/app/components/global/Input";
import { LoginButton } from "@/app/components/global/SubmitButton";
import { P } from "@/app/components/global/Text";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaEyeSlash } from "react-icons/fa";
import { toast } from "sonner";
import { resetPassword } from "@/actions/ResetPassword";

export default function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [isShown, setIsShown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 8 || password.length > 72) return toast.error("Password 8–72 karakter");
    if (password !== konfirmasi) return toast.error("Konfirmasi password tidak sama");
    setIsLoading(true);
    const toastId = toast.loading("Menyimpan password baru...");
    const result = await resetPassword(token, password);
    if (result.success) {
      toast.success("Password berhasil diubah. Silakan login.", { id: toastId });
      router.replace("/auth/login");
    } else {
      setIsLoading(false);
      toast.error(result.message, { id: toastId, duration: 6000 });
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <P className="font-bold text-black">Password Baru</P>
        <div className="relative w-full">
          <TextField
            id="Password"
            placeholder="Minimal 8 karakter"
            name="password"
            type={isShown ? "text" : "password"}
            onInput={(e) => setPassword(e.currentTarget.value)}
            className={"pe-[54px]"}
            required
          />
          <div className="h-[27px] w-[27px] flex justify-center items-center absolute p-1 right-5 top-1/2 -translate-y-1/2">
            <button type="button" onClick={() => setIsShown(!isShown)}>
              {isShown ? <FaEyeSlash /> : <Eye />}
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <P className="font-bold text-black">Ulangi Password Baru</P>
        <TextField
          id="Konfirmasi"
          placeholder="Ulangi password"
          name="konfirmasi"
          type={isShown ? "text" : "password"}
          onInput={(e) => setKonfirmasi(e.currentTarget.value)}
          required
        />
      </div>
      <LoginButton
        text={"Simpan Password"}
        className="w-full h-[60px] bg-primary-500 rounded-[14px]"
        disabled={isLoading}
      />
    </form>
  );
}
