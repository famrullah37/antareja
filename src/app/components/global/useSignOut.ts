"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

// signOut() next-auth butuh 2 request (csrf lalu signout) sebelum berpindah —
// tanpa umpan balik user mengira klik tidak terespon dan menekan berkali-kali.
//
// Redirect dilakukan manual (redirect: false + alamat relatif), bukan lewat URL
// hasil hitungan server next-auth: URL itu diturunkan dari NEXTAUTH_URL, jadi
// kalau env itu salah di production user tidak pindah / diarahkan ke host lain.
// Reload penuh juga menjamin cookie sesi sudah terhapus sebelum halaman berikutnya.
export function useSignOut(redirectTo = "/") {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut({ redirect: false });
    } finally {
      window.location.href = redirectTo;
    }
  };

  return { signingOut, handleSignOut };
}
