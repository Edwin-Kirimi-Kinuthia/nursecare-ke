import { revalidatePath } from "next/cache";
import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { providerService } from "@carebora/core";

/** POST /api/v1/admin/providers/set-available — mark every Busy provider Available. */
export const POST = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const result = await providerService.setAllAvailable();
  revalidatePath("/providers"); revalidatePath("/providers/[id]", "page"); revalidatePath("/");
  return jsonOk(result);
});
