import { parseVideoUrl } from "@/lib/videoUrl";

// Pemutar video Antareja di halaman utama. Sumbernya diatur admin (Pengaturan → Video Antareja);
// belum diisi → tampil placeholder rapi (bukan kotak abu-abu kosong).
export default function VideoPlayer({ url, className }: Readonly<{ url: string | null; className: string }>) {
  const video = parseVideoUrl(url);

  if (!video) {
    return (
      <div className={`${className} bg-neutral-800 text-white/70 flex flex-col items-center justify-center gap-2 text-center px-6`}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
        <span className="text-sm">Video Antareja segera hadir</span>
      </div>
    );
  }

  if (video.kind === "file") {
    return (
      <video
        src={video.embedUrl}
        controls
        preload="metadata"
        playsInline
        className={`${className} bg-black object-cover`}
      />
    );
  }

  return (
    <iframe
      src={video.embedUrl}
      title="Video Antareja"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      className={`${className} bg-black`}
    />
  );
}
