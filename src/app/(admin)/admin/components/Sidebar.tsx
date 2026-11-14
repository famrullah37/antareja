"use client";

import { PrimaryButton } from "@/app/components/global/Button";
import { H3 } from "@/app/components/global/Text";
import { menuPerKelompok } from "@/utils/protectedRoutes";
import { Session } from "next-auth";
import { useSignOut } from "@/app/components/global/useSignOut";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { labelVersi, labelWaktuBuild } from "@/lib/versiAplikasi";
import { FaChevronDown } from "react-icons/fa";
import { useMenuFolder } from "./useMenuFolder";

interface Sidenavprops {
  active: boolean;
  session?: Session;
}

export default function Sidebar({ active, session }: Readonly<Sidenavprops>) {
  const pathname = usePathname();
  const { signingOut, handleSignOut } = useSignOut();
  const kelompok = menuPerKelompok(session?.user?.role);
  const { activePath, lipat, isOpen, isAktif, toggle } = useMenuFolder(kelompok, pathname);

  return (
    <aside
      id="sidebar"
      className={`fixed ${
        active ? "w-80" : "w-0 opacity-0"
      } left-0 bg-white top-0 z-20 h-full flex-shrink-0 transition-all duration-300 lg:w-80 lg:opacity-100 hidden lg:flex`}
      aria-label="Sidebar"
    >
      <div className="relative flex min-h-0 flex-1 flex-col border-r px-4 border-gray-200 bg-white pt-0">
        <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
          <div className="flex-1 space-y-10 bg-white px-3">
            <Link href={"/"} className="block">
              <H3 className="text-[#F70048]">Admin Panel</H3>
            </Link>
            <nav aria-label="Menu admin" className="flex flex-col gap-1 pb-2 mt-8">
              {kelompok.map((k) => (
                <div key={k.group}>
                  {lipat ? (
                    <button
                      type="button"
                      onClick={() => toggle(k.group)}
                      aria-expanded={isOpen(k.group)}
                      disabled={isAktif(k.group)}
                      className={`w-full flex items-center justify-between rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                        isAktif(k.group) ? "text-primary-500 cursor-default" : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span>
                        {k.group} <span className="font-normal text-gray-400">({k.items.length})</span>
                      </span>
                      <FaChevronDown className={`transition-transform ${isOpen(k.group) ? "rotate-180" : ""}`} />
                    </button>
                  ) : (
                    <p className="px-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">{k.group}</p>
                  )}
                  <ul className={`flex flex-col gap-0.5 pl-2 ${isOpen(k.group) ? "mb-2" : "hidden"}`}>
                    {k.items.map((item) => {
                      const aktif = item.path === activePath;
                      return (
                        <li key={item.path}>
                          <Link
                            href={item.path}
                            aria-current={aktif ? "page" : undefined}
                            className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                              aktif ? "bg-red-100 text-primary-600" : "text-gray-600 hover:bg-red-50 hover:text-primary-500"
                            }`}
                          >
                            {item.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
            <PrimaryButton
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full"
            >
              {signingOut ? "Keluar..." : "Sign Out"}
            </PrimaryButton>
            <p className="text-xs font-medium text-neutral-700 text-center" title={labelWaktuBuild ? `Build ${labelWaktuBuild}` : undefined}>
              {labelVersi}
              {labelWaktuBuild && <span className="block">Build {labelWaktuBuild}</span>}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
