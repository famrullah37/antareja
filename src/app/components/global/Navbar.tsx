"use client";

import { signIn, useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SecondaryButton } from "./Button";
import { TertiaryLinkButton } from "./LinkButton";
import { usePathname } from "next/navigation";
import { HamburgerIcon } from "./Icons";

interface NavOption {
  label: string;
  href: string;
}

const NavOptions: NavOption[] = [
  { label: "Beranda", href: "/#hero" },
  { label: "Antareja", href: "/#antareja" },
  { label: "Alur Daftar", href: "/#video" },
  { label: "Timeline", href: "/#timeline" },
  { label: "Juri", href: "/#juri" },
  { label: "Tiket", href: "/#tiket" },
  { label: "Galeri", href: "/galeri" },
  { label: "Vote", href: "/vote" },
];

const OrgLogos = [
  { src: "/image/logo-osis.png",          alt: "OSIS SMK Telkom Malang" },
  { src: "/image/logo-paskatema.jpg",     alt: "Paskatema" },
  { src: "/image/logo-telkom-school.png", alt: "Telkom School" },
];

export default function Navbar() {
  const [isOpened, setIsOpened] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { status, data: session } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    setIsOpened(false);
    setIsExpanded(false);
  }, [pathname]);

  const navText = "text-gray-600 hover:text-primary-500";

  return (
    <nav className="fixed top-0 left-0 right-0 z-[999]">
      <div className="w-full bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 lg:px-[50px] py-3 lg:py-4 gap-4">

          {/* ── Kiri: Antareja logo + divider + logo organisasi ── */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/">
              <Image
                src="/icon-colored.svg"
                alt="Antareja"
                width={44}
                height={44}
                className="w-9 h-9 lg:w-11 lg:h-11"
              />
            </Link>

            {/* Divider */}
            <div className="w-px h-7 mx-1 bg-gray-200" />

            {/* Logo organisasi — tersembunyi otomatis jika file belum ada */}
            <div className="flex items-center gap-1.5">
              {OrgLogos.map((org) => (
                <img
                  key={org.alt}
                  src={org.src}
                  alt={org.alt}
                  className="w-8 h-8 lg:w-9 lg:h-9 object-contain mix-blend-multiply"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Tengah: Nav links ── */}
          <div className="hidden lg:flex items-center gap-6 flex-1 justify-center">
            {NavOptions.map((nav) => (
              <Link
                href={nav.href}
                key={nav.label}
                className={`text-sm font-medium transition-all duration-200 ${navText}`}
              >
                {nav.label}
              </Link>
            ))}
          </div>

          {/* ── Kanan: Auth ── */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {status === "authenticated" ? (
              <div className="relative">
                <button
                  type="button"
                  aria-label="User menu"
                  onClick={() => setIsOpened(!isOpened)}
                  className="flex items-center gap-2 group"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary-500/50 group-hover:ring-primary-500 transition-all">
                    <Image
                      alt="User"
                      src="https://st3.depositphotos.com/6672868/13701/v/450/depositphotos_137014128-stock-illustration-user-profile-icon.jpg"
                      unoptimized
                      width={36}
                      height={36}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <span className="text-sm font-medium max-w-[100px] truncate text-gray-800">
                    {session.user?.nama}
                  </span>
                </button>
                {isOpened && (
                  <div className="absolute right-0 top-12 w-60 bg-white rounded-2xl shadow-xl border border-neutral-100 py-2 overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-100">
                      <p className="font-semibold text-sm text-neutral-900 truncate">{session.user?.nama}</p>
                      <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                    </div>
                    <Link
                      href={session.user?.role === "ADMIN" ? "/admin" : "/dashboard"}
                      className="flex items-center px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                      onClick={() => setIsOpened(false)}
                    >
                      {session.user?.role === "ADMIN" ? "Admin Panel" : "Dashboard"}
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="w-full flex items-center px-4 py-3 text-sm text-primary-500 hover:bg-primary-50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : status === "loading" ? null : (
              <>
                <SecondaryButton
                  onClick={() => signIn()}
                  type="button"
                  className="font-bold text-sm px-5 py-2"
                >
                  Masuk
                </SecondaryButton>
                <TertiaryLinkButton href="/auth/register" className="font-bold text-sm px-5 py-2">
                  Daftar
                </TertiaryLinkButton>
              </>
            )}
          </div>

          {/* ── Hamburger mobile ── */}
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setIsExpanded(!isExpanded)}
            className="block lg:hidden text-gray-700"
          >
            {isExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <HamburgerIcon />
            )}
          </button>
        </div>

        {/* ── Mobile menu ── */}
        {isExpanded && (
          <div className="lg:hidden border-t border-white/10 px-6 py-5 flex flex-col gap-4 bg-neutral-950/95 backdrop-blur-md">
            {NavOptions.map((nav) => (
              <Link
                key={nav.label}
                href={nav.href}
                onClick={() => setIsExpanded(false)}
                className="text-white/80 text-base font-medium hover:text-primary-400 transition-colors"
              >
                {nav.label}
              </Link>
            ))}
            <div className="h-px bg-white/10 my-1" />
            {status === "authenticated" ? (
              <>
                <Link
                  href={session?.user?.role === "ADMIN" ? "/admin" : "/dashboard"}
                  onClick={() => setIsExpanded(false)}
                  className="text-white/80 text-base font-medium hover:text-primary-400 transition-colors"
                >
                  {session?.user?.role === "ADMIN" ? "Admin Panel" : "Dashboard"}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-primary-400 text-base font-medium text-left hover:text-primary-300 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : status === "loading" ? null : (
              <>
                <Link href="/auth/login" onClick={() => setIsExpanded(false)} className="text-primary-400 text-base font-medium">
                  Masuk
                </Link>
                <Link href="/auth/register" onClick={() => setIsExpanded(false)} className="text-white/80 text-base font-medium">
                  Daftar
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
