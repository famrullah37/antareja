export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Memuat halaman">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
    </div>
  );
}
