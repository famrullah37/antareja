"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Confirmation() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") return router.replace("/");
    if (session?.user?.role === "ADMIN") return router.replace("/admin");
    return router.replace("/dashboard");
  }, [status, session, router]);

  return null;
}
