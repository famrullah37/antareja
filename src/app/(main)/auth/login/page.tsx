"use client";

import { Eye } from "@/app/components/global/Icons";
import TextField from "@/app/components/global/Input";
import { LoginButton } from "@/app/components/global/SubmitButton";
import { H1, H3, P } from "@/app/components/global/Text";
import { getSession, signIn, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FaEyeSlash } from "react-icons/fa";
import { toast } from "sonner";
import { resendVerificationEmail } from "@/actions/Signup";

export default function Login() {
  const { status } = useSession();
  const router = useRouter();
  const email = useRef("");
  const pass = useRef("");
  const [isShown, setIsShown] = useState(false);
  const [isLoading, setisLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);

  if (status === "authenticated") return router.push("/");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    const toastId = toast.loading("Logging in....");
    e.preventDefault();
    const logIn = async () => {
      setisLoading(true);
      const login = await signIn("credentials", {
        email: email.current,
        password: pass.current,
        redirect: false,
      });
      if (login?.ok) return { success: true };
      else {
        setisLoading(false);
        return { success: false };
      }
    };
    const result = await logIn();

    if (result.success) {
      toast.success("Berhasil Login!", { id: toastId });
      const session = await getSession();
      return router.push(session?.user?.role === "ADMIN" ? "/admin" : "/dashboard");
    } else {
      setShowResend(true);
      return toast.error("Email/password salah, atau akun belum diverifikasi. Cek email Anda.", { id: toastId, duration: 5000 });
    }
  };

  const onResend = async () => {
    if (!email.current) return toast.error("Isi email Anda dulu di atas");
    setResending(true);
    const toastId = toast.loading("Mengirim ulang email verifikasi...");
    const result = await resendVerificationEmail(email.current);
    setResending(false);
    if (result.success) toast.success(result.message, { id: toastId, duration: 6000 });
    else toast.error(result.message, { id: toastId });
  };

  return (
    <form
      className="flex justify-center items-center lg:justify-between gap-[60px] lg:gap-0 my-[54px] mx-[40px] lg:mx-[108px] flex-col lg:flex-row"
      onSubmit={onSubmit}
    >
      <div className="w-full xl:w-[635px] text-wrap flex flex-col gap-1 lg:gap-6 justify-center relative ">
        <Image
          src={"/image/kategorilogo.png"}
          width={659}
          height={662}
          alt={"logo"}
          className="absolute -z-[9999] -left-[235px] top-[100px] lg:top-0 lg:-left-[375px]"
        />
        <div className="bg-primary-500 w-[48px] h-[45px] lg:w-[76.15px] lg:h-[71.31px] flex flex-col justify-center items-center rounded-xl drop-shadow-glow">
          <Image
            src={"/icon.svg"}
            width={55}
            height={57}
            alt="logo"
            className="lg:w-[55px] lg:h-[57px] h-[26px] w-[25px] invert"
          />
        </div>
        <H1>
          Kami Tunggu Tim Kalian di
          <span className="text-primary-500"> Antareja Season 3</span>
        </H1>
        <P className="text-sm sm:text-base">
          Sudah siap menjadi pemenang Antareja?
        </P>
      </div>
      <div className="bg-white w-full sm:w-[458px] rounded-[24px] ">
        <div className="p-[30px] flex flex-col gap-[30px]">
          <div className="w-[65px] h-[32px] bg-primary-300 flex justify-center items-center py-1 px-2 rounded-2xl">
            <P className="rounded-[16px] text-primary-500 font-bold">Masuk</P>
          </div>
          <div className="flex flex-col gap-3 max-w-[325px] text-wrap">
            <H3>Selamat Datang Kembali!</H3>
            <P>Yuk masuk kembali, Siap menjadi pemenang Antareja?</P>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <P className="font-bold text-black">Email</P>
              <TextField
                id="Email"
                placeholder="Email"
                name="email"
                type="email"
                onInput={(e) => (email.current = e.currentTarget.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <P className="font-bold text-black">Password</P>
              <div className="relative w-full">
                <TextField
                  id="Password"
                  placeholder="Password"
                  name="password"
                  type={isShown ? "text" : "password"}
                  onInput={(e) => (pass.current = e.currentTarget.value)}
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
          </div>
          <div className="flex flex-col gap-6">
            <LoginButton
              text={"Login"}
              className="w-full h-[60px] bg-primary-500 rounded-[14px]"
              disabled={isLoading}
            />
            <div className="w-full flex justify-center items-center">
              <P>
                Sudah Punya Akun?
                <Link
                  href={"/auth/register"}
                  className="text-primary-500 font-bold"
                >
                  {" "}
                  Daftar
                </Link>
              </P>
            </div>
            {showResend && (
              <div className="w-full flex justify-center items-center">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resending}
                  className="text-sm text-primary-500 font-bold underline disabled:opacity-50"
                >
                  Belum menerima email verifikasi? Kirim ulang
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
