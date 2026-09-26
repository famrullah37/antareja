"use client";

import signUp, { resendVerificationEmail } from "@/actions/Signup";
import { Eye } from "@/app/components/global/Icons";
import TextField from "@/app/components/global/Input";
import SubmitButton from "@/app/components/global/SubmitButton";
import { H1, H3, P } from "@/app/components/global/Text";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FaEyeSlash } from "react-icons/fa";
import { toast } from "sonner";

export default function Register() {
  const [isShown, setIsShown] = useState(false);
  // Diisi setelah daftar berhasil — halaman berganti ke panel "cek email"
  // (bukan langsung redirect ke login) supaya pesan verifikasi tidak
  // terlewat seperti toast yang hilang beberapa detik kemudian.
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const { data: session, status } = useSession();

  async function submit(data: FormData) {
    const toastId = toast.loading("Membuat akun...");
    const result = await signUp(data);
    if (result.success) {
      toast.success("Akun berhasil dibuat! Cek email Anda untuk verifikasi.", { id: toastId, duration: 6000 });
      setRegisteredEmail(data.get("email") as string);
    } else {
      toast.error(result.message, { id: toastId });
    }
  }

  async function resend() {
    if (!registeredEmail) return;
    const toastId = toast.loading("Mengirim ulang email verifikasi...");
    const result = await resendVerificationEmail(registeredEmail);
    if (result.success) toast.success(result.message, { id: toastId, duration: 5000 });
    else toast.error(result.message, { id: toastId });
  }

  // Konsisten dengan fix di halaman login (reload penuh, bukan navigasi
  // client-side) — kalau sudah authenticated (mis. buka /auth/register
  // padahal sudah login), arahkan ke tujuan sesuai role, bukan landing page.
  if (status === "authenticated") {
    const dest = session?.user?.role === "ADMIN" ? "/admin" : "/dashboard";
    if (typeof window !== "undefined") window.location.href = dest;
    return null;
  }

  if (registeredEmail) {
    return (
      <div className="flex justify-center items-center my-[54px] mx-[40px] lg:mx-[108px]">
        <div className="bg-white w-full sm:w-[458px] rounded-[24px] p-[30px] flex flex-col gap-6 text-center">
          <div className="mx-auto bg-primary-500 w-[64px] h-[60px] flex justify-center items-center rounded-xl drop-shadow-glow">
            <Image src={"/icon.svg"} width={36} height={38} alt="logo" className="invert" />
          </div>
          <H3>Cek Email Anda</H3>
          <P>
            Akun berhasil dibuat. Kami sudah mengirim link verifikasi ke{" "}
            <span className="font-bold text-black break-all">{registeredEmail}</span>.
            Buka email tersebut dan klik link verifikasi sebelum login.
          </P>
          <P className="text-sm">
            Tidak menemukan emailnya? Periksa juga folder Spam/Promosi.
          </P>
          <Link
            href={"/auth/login"}
            className="w-full h-[60px] bg-primary-500 rounded-[14px] text-white font-bold flex justify-center items-center"
          >
            Ke Halaman Login
          </Link>
          <button type="button" onClick={resend} className="text-primary-500 font-bold text-sm">
            Belum menerima email? Kirim ulang
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex lg:justify-between gap-[60px] lg:gap-0 my-[54px] mx-[40px] lg:mx-[108px] flex-col lg:flex-row items-center justify-center"
      action={submit}
    >
      <div className="w-full xl:w-[635px] text-wrap flex flex-col gap-1 lg:gap-6 justify-center relative">
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
          <span className="text-primary-500"> Antareja Season 4</span>
        </H1>
        <P className="text-sm sm:text-base">
          Sudah siap menjadi pemenang Antareja?
        </P>
      </div>
      <div className="bg-white w-full sm:w-[458px] rounded-[24px] ">
        <div className="p-[30px] flex flex-col gap-[30px]">
          <div className="w-[65px] h-[32px] bg-primary-300 flex justify-center items-center py-1 px-2 rounded-2xl">
            <P className="rounded-[16px] text-primary-500 font-bold">Daftar</P>
          </div>
          <div className="flex flex-col gap-3 max-w-[325px] text-wrap">
            <H3>Selamat Datang!</H3>
            <P>Yuk buat akun sebelum bergabung menjadi bagian dari Antareja!</P>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <P className="font-bold text-black">Nama</P>
              <TextField
                id="Nama"
                placeholder="Nama"
                name="nama"
                type="text"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <P className="font-bold text-black">Email</P>
              <TextField
                id="Email"
                placeholder="Email"
                name="email"
                type="email"
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
            <SubmitButton
              text={"Daftar"}
              className="w-full h-[60px] bg-primary-500 rounded-[14px]"
            />
            <div className="w-full flex justify-center items-center">
              <P>
                Sudah Punya Akun?
                <Link
                  href={"/auth/login"}
                  className="text-primary-500 font-bold"
                >
                  {" "}
                  Login
                </Link>
              </P>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
