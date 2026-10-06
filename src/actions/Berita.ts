"use server";

import { getServerSession } from "@/lib/next-auth";
import { imageUploader, validateUploadFile, compressPhoto } from "./fileUploader";
import { createBerita, deleteBerita, findBerita, updateBerita } from "@/queries/berita.query";
import { revalidatePath } from "next/cache";

async function requireHumas() {
  const session = await getServerSession();
  if (!["ADMIN", "SIE_HUMAS"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
  return session!.user!;
}

function slugify(text: string) {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

// Slug dari judul; kalau sudah dipakai berita lain, tambahkan akhiran acak pendek.
async function uniqueSlug(judul: string) {
  const base = slugify(judul) || "berita";
  if (!(await findBerita({ slug: base }))) return base;
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

async function uploadCover(cover: File | null) {
  if (!cover || cover.size === 0) return { url: undefined };
  const fileCheck = await validateUploadFile(cover);
  if (!fileCheck.valid) return { error: fileCheck.message };
  const buffer = await compressPhoto(Buffer.from(await cover.arrayBuffer()));
  const upload = await imageUploader(buffer);
  if (upload.error) return { error: upload.message };
  return { url: upload.data!.url };
}

function revalidateBerita(slug?: string) {
  revalidatePath("/admin/berita");
  revalidatePath("/berita");
  if (slug) revalidatePath(`/berita/${slug}`);
  revalidatePath("/");
}

export async function saveBeritaForm(data: FormData) {
  const user = await requireHumas();
  const id = (data.get("id") as string) || undefined;
  const judul = ((data.get("judul") as string) ?? "").trim();
  const ringkasan = ((data.get("ringkasan") as string) ?? "").trim() || null;
  const konten = ((data.get("konten") as string) ?? "").trim();
  const publish = data.get("publish") === "on";
  const hapusCover = data.get("hapusCover") === "on";

  if (!judul) return { success: false, message: "Judul wajib diisi" };
  if (!konten) return { success: false, message: "Isi berita wajib diisi" };

  try {
    const cover = await uploadCover(data.get("cover") as File | null);
    if (cover.error) return { success: false, message: cover.error };

    if (!id) {
      const berita = await createBerita({
        judul,
        slug: await uniqueSlug(judul),
        ringkasan,
        konten,
        coverUrl: cover.url ?? null,
        publish,
        publishedAt: publish ? new Date() : null,
        penulis: user.nama,
      });
      revalidateBerita(berita.slug);
      return { success: true, id: berita.id };
    }

    const lama = await findBerita({ id });
    if (!lama) return { success: false, message: "Berita tidak ditemukan" };
    await updateBerita(
      { id },
      {
        judul,
        ringkasan,
        konten,
        coverUrl: cover.url ?? (hapusCover ? null : undefined),
        publish,
        // Tanggal terbit hanya diisi saat pertama kali diterbitkan.
        publishedAt: publish && !lama.publishedAt ? new Date() : undefined,
      }
    );
    revalidateBerita(lama.slug);
    return { success: true, id };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menyimpan berita" };
  }
}

export async function togglePublishBerita(id: string, publish: boolean) {
  await requireHumas();
  try {
    const lama = await findBerita({ id });
    if (!lama) return { success: false };
    await updateBerita(
      { id },
      { publish, publishedAt: publish && !lama.publishedAt ? new Date() : undefined }
    );
    revalidateBerita(lama.slug);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deleteBeritaForm(id: string) {
  await requireHumas();
  try {
    const berita = await deleteBerita({ id });
    revalidateBerita(berita.slug);
    return { success: true };
  } catch {
    return { success: false };
  }
}
