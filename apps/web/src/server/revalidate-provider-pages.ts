import { revalidatePath } from "next/cache";

/** Account changes must also reach the server-rendered directory and public profile. */
export function revalidateProviderPages(userId: string) {
  revalidatePath("/providers");
  revalidatePath(`/providers/${userId}`, "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
}
