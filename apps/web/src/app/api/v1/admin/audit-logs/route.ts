import { route, jsonOk } from "@/server/http";
import { requireAuth } from "@/server/auth";
import { auditLogsQuerySchema } from "@carebora/shared";
import { adminService } from "@carebora/core";

/**
 * GET /api/v1/admin/audit-logs
 * Query the audit trail. Filterable by actorId, action, entityType, and date range.
 */
export const GET = route(async (req) => {
  await requireAuth(req, ["admin"]);
  const { searchParams } = new URL(req.url);
  const query = auditLogsQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await adminService.listAuditLogs(query);
  return jsonOk(result);
});
