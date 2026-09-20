"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

// signOut() next-auth butuh 2 request (csrf lalu signout) sebelum redirect —
// tanpa umpan balik user mengira klik tidak terespon dan menekan berkali-kali.
export function useSignOut(callbackUrl = "/auth/login") {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    if (signingOut) return;
    setSigningOut(true);
    signOut({ callbackUrl });
  };

  return { signingOut, handleSignOut };
}
