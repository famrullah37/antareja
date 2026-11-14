"use client";

import { useSession } from "next-auth/react";
import { useSignOut } from "@/app/components/global/useSignOut";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import { HamburgerIcon } from "@/app/components/global/Icons";
import { menuPerKelompok } from "@/utils/protectedRoutes";
import { useMenuFolder } from "./components/useMenuFolder";
import { FaChevronDown } from "react-icons/fa";
import Image from "next/image";
import { labelVersi, labelWaktuBuild } from "@/lib/versiAplikasi";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const { signingOut, handleSignOut } = useSignOut();
  const pathnameSplit = pathname.split("/");
  pathnameSplit.shift();
  const kelompok = menuPerKelompok(session?.user?.role);
  const menu = useMenuFolder(kelompok, pathname);
  useEffect(() => {
    setIsExpanded(false);
  }, [pathname]);

  return (
    <main className="flex w-full h-screen overflow-hidden bg-slate-100">
      <Sidebar active={false} session={session!} />
      <nav className="flex lg:hidden bg-white w-full fixed z-[99]">
        <div className="bg-white w-full h-[55px] justify-between items-center flex relative px-5 z-[999]">
          <Link href={"/admin"}>
            <Image
              src={"/logo.svg"}
              alt="logo"
              width={64}
              height={64}
              className="w-8 h-8"
            />
          </Link>
          <button
            type="button"
            aria-label={isExpanded ? "Tutup menu" : "Buka menu"}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <HamburgerIcon />
          </button>
        </div>
        {/* Ketuk di luar menu untuk menutup */}
        {isExpanded && (
          <div
            className="fixed inset-0 z-[700] bg-black/30 lg:hidden"
            onClick={() => setIsExpanded(false)}
            aria-hidden="true"
          />
        )}
        {/* Menu admin bisa belasan item: tinggi dibatasi layar & bisa di-scroll,
            tertutup = benar-benar tersembunyi (bukan sekadar digeser ke atas). */}
        <div
          className={`absolute left-0 top-[55px] lg:hidden w-full z-[800] bg-neutral-500 overflow-y-auto transition-all duration-300 px-6 ${
            isExpanded
              ? "max-h-[calc(100dvh-55px)] pt-6 pb-10 opacity-100 overscroll-contain"
              : "max-h-0 py-0 opacity-0 invisible pointer-events-none"
          }`}
        >
          <div className="flex flex-col gap-4 justify-center items-center w-full text-center">
            {kelompok.map((k) => (
              <div key={k.group} className="w-full flex flex-col items-center gap-3">
                {menu.lipat ? (
                  <button
                    type="button"
                    onClick={() => menu.toggle(k.group)}
                    aria-expanded={menu.isOpen(k.group)}
                    disabled={menu.isAktif(k.group)}
                    className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
                      menu.isAktif(k.group) ? "text-primary-300" : "text-neutral-200"
                    }`}
                  >
                    {k.group} ({k.items.length})
                    <FaChevronDown className={`transition-transform ${menu.isOpen(k.group) ? "rotate-180" : ""}`} />
                  </button>
                ) : (
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">{k.group}</p>
                )}
                {menu.isOpen(k.group) && k.items.map((navOption) => (
                  <Link
                    key={navOption.path}
                    href={navOption.path}
                    aria-current={menu.activePath === navOption.path ? "page" : undefined}
                    className={`rounded-full text-center text-[16px] transition-all duration-300 hover:text-primary-400 ${
                      menu.activePath === navOption.path ? "text-primary-300 font-semibold" : ""
                    }`}
                    onClick={() => setIsExpanded(false)}
                  >
                    {navOption.title}
                  </Link>
                ))}
              </div>
            ))}
            <button
              className={`rounded-full text-center text-primary-500 text-[16px] transition-all duration-300 hover:text-primary-400 disabled:opacity-60`}
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Keluar..." : "Sign Out"}
            </button>
            <p className="text-xs text-neutral-200">
              {labelVersi}
              {labelWaktuBuild && <span className="block">Build {labelWaktuBuild}</span>}
            </p>
          </div>
        </div>
      </nav>
      <div
        id="main-content"
        className="relative h-full w-full overflow-y-auto px-4 sm:ps-10 lg:ps-24 py-4 lg:ml-64 lg:mt-0 mt-[55px]"
      >
        <nav className="w-max rounded-lg bg-gray-200 p-2 font-sans text-sm capitalize md:p-3 hidden lg:block">
          <ol className="flex">
            <li>
              <Link href="/" className="font-bold text-primary-400">
                home
              </Link>
            </li>
            {pathnameSplit.map((path, i) => {
              const last = i + 1 == pathnameSplit.length;
              return (
                <Fragment key={path}>
                  <li>
                    <span className="mx-2">/</span>
                  </li>
                  <li>
                    <Link
                      className={`${last ? "" : "text-primary-400"} font-bold`}
                      href={"/" + pathnameSplit.slice(0, i + 1).join("/")}
                      key={path}
                    >
                      {path.replace(/-/g, " ").trim()}
                    </Link>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </nav>
        <main>
          <div className="md:px-4 pe-0 sm:pe-10 pt-0 sm:pt-6 sm:pb-0 pb-6">
            {children}
          </div>
        </main>
      </div>
    </main>
  );
}
