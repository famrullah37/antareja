"use client";

import { useEffect } from "react";

export default function AutoDownload({ urls }: { urls: string[] }) {
  useEffect(() => {
    if (urls.length === 0) return;
    // Trigger download for each file with a staggered delay to avoid browser blocking
    urls.forEach((url, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = url;
        a.download = "";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 800);
    });
  }, [urls]);

  return null;
}
