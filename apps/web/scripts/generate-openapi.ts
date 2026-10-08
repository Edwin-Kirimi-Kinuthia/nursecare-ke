/**
 * Builds the machine-readable description of every API route from the routes
 * themselves.
 *
 * The OpenAPI spec used to be written by hand: it covered 64% of the endpoints
 * and described most request bodies as just "an object", so a mobile developer
 * learned that an endpoint existed but not what to send it. Every route already
 * validates its input with a Zod schema, so this reads each route file, finds
 * the schema it parses the body or query with, and converts it. Because it runs
 * on every build, a new endpoint is documented the moment it exists.
 *
 *   npm run openapi:generate   write src/app/api/v1/openapi/generated.json
 *   npm run openapi:check      exit 1 if that file is out of date
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as shared from "@carebora/shared";

const ROOT = join(__dirname, "..");
const API_DIR = join(ROOT, "src/app/api/v1");
const OUT = join(API_DIR, "openapi/generated.json");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

/** First path segment -> the tag it is filed under (extends the hand-written set). */
const TAGS: Record<string, string> = {
  auth: "Auth", providers: "Providers", appointments: "Appointments", consultations: "Consultations",
  payments: "Payments", orders: "Pharmacy", storefront: "Pharmacy", vendor: "Vendor", vendors: "Vendor",
  "ambulance-requests": "Ambulance", records: "Records", "lab-orders": "Labs", "home-visits": "Home Visits",
  admin: "Admin", patients: "Profiles", ai: "AI", notifications: "Notifications", support: "Support",
  config: "System", health: "System", docs: "System", openapi: "System",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === "route.ts") out.push(p);
  }
  return out;
}

function toJson(name: string) {
  const schema = (shared as Record<string, unknown>)[name];
  if (!schema || typeof (schema as { safeParse?: unknown }).safeParse !== "function") return null;
  const json = zodToJsonSchema(schema as never, { target: "openApi3", $refStrategy: "none" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** Text of the handler for one HTTP method, so schemas are matched to the right verb. */
function handlerSlice(src: string, method: string): string | null {
  const re = new RegExp(`export (?:const ${method} = |async function ${method}\\b)`);
  const m = re.exec(src);
  if (!m) return null;
  const rest = src.slice(m.index + m[0].length);
  const next = /\nexport (?:const|async function) (?:GET|POST|PUT|PATCH|DELETE)\b/.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function docFor(src: string, method: string): { summary: string; description?: string } {
  // The comment body may not itself contain "*/": otherwise the lazy match
  // starts at the first comment in the file and swallows every handler's doc
  // up to this one, giving PATCH the summary of the GET above it.
  const re = new RegExp(`/\\*\\*((?:(?!\\*/)[\\s\\S])*?)\\*/\\s*export (?:const ${method} = |async function ${method}\\b)`);
  const m = re.exec(src);
  if (!m) return { summary: "" };
  const text = m[1]!.split("\n").map((l) => l.replace(/^\s*\* ?/, "")).join("\n").trim();
  // "POST /api/v1/x/:id — what it does."  ->  "what it does."
  const body = text.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+\S+\s*[—–-]\s*/, "").trim();
  const sentence = body.split(/(?<=[.!?])\s/)[0]!.replace(/\s+/g, " ").trim();
  const first = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return { summary: first.length > 110 ? `${first.slice(0, 107)}…` : first, description: (body.charAt(0).toUpperCase() + body.slice(1)).replace(/\n(?!\n)/g, " ").trim() };
}

function auth(slice: string): { security: unknown[]; roles?: string[] } {
  const roles = /requireAuth\(\s*req\s*,\s*\[([^\]]*)\]/.exec(slice);
  if (roles) return { security: [{ bearerAuth: [] }], roles: roles[1]!.replace(/["'\s]/g, "").split(",").filter(Boolean) };
  if (/requireAuth\(|requirePatient\(|requireOrgMember\(/.test(slice)) return { security: [{ bearerAuth: [] }] };
  // getAuth: works signed-out, but personalises (or unlocks) when signed in.
  if (/getAuth\(/.test(slice)) return { security: [{}, { bearerAuth: [] }] };
  return { security: [] };
}

const paths: Record<string, Record<string, unknown>> = {};
let unresolved = 0;

for (const file of walk(API_DIR).sort()) {
  const src = readFileSync(file, "utf8");
  const rel = relative(API_DIR, file).split(sep).slice(0, -1);
  const path = "/" + rel.map((s) => s.replace(/^\[(.+)\]$/, "{$1}")).join("/");
  const pathParams = rel.filter((s) => /^\[.+\]$/.test(s)).map((s) => s.slice(1, -1));
  const tag = TAGS[rel[0] ?? ""] ?? (rel[0] ? rel[0][0]!.toUpperCase() + rel[0].slice(1) : "System");
  if (path === "/openapi" || path === "/docs") continue;

  for (const method of METHODS) {
    const slice = handlerSlice(src, method);
    if (slice === null) continue;

    const { summary, description } = docFor(src, method);
    const { security, roles } = auth(slice);

    // Which Zod schema validates the body, and which the query string?
    let bodySchema: Record<string, unknown> | null = null;
    let querySchema: Record<string, unknown> | null = null;
    for (const m of slice.matchAll(/(\w+Schema)\.(?:safeP|p)arse\(([^;\n]*)/g)) {
      const [, name, arg] = m;
      const isQuery = /searchParams|Object\.fromEntries/.test(arg!);
      const json = toJson(name!);
      if (!json) { unresolved++; continue; }
      if (isQuery) querySchema ??= json; else bodySchema ??= json;
    }

    const parameters: unknown[] = pathParams.map((n) => ({ name: n, in: "path", required: true, schema: { type: "string" } }));
    if (querySchema) {
      const required = new Set((querySchema.required as string[] | undefined) ?? []);
      for (const [name, schema] of Object.entries((querySchema.properties ?? {}) as Record<string, unknown>)) {
        parameters.push({ name, in: "query", required: required.has(name), schema });
      }
    }

    const created = /jsonOk\([^)]*,\s*201\s*\)/.test(slice);
    paths[path] ??= {};
    paths[path]![method.toLowerCase()] = {
      tags: [tag],
      ...(summary ? { summary } : {}),
      ...(description && description !== summary ? { description: roles ? `${description} Requires role: ${roles.join(", ")}.` : description } : roles ? { description: `Requires role: ${roles.join(", ")}.` } : {}),
      security,
      ...(parameters.length ? { parameters } : {}),
      ...(bodySchema ? { requestBody: { required: true, content: { "application/json": { schema: bodySchema } } } } : {}),
      responses: {
        [created ? 201 : 200]: { description: created ? "Created" : "Success", content: { "application/json": { schema: { $ref: "#/components/schemas/DataEnvelope" } } } },
        ...(security.length && security[0] && Object.keys(security[0] as object).length ? { 401: { $ref: "#/components/responses/Error" }, 403: { $ref: "#/components/responses/Error" } } : {}),
        ...(bodySchema || querySchema ? { 422: { $ref: "#/components/responses/Error" } } : {}),
        ...(pathParams.length ? { 404: { $ref: "#/components/responses/Error" } } : {}),
      },
    };
  }
}

const output = JSON.stringify({ generatedBy: "scripts/generate-openapi.ts", paths }, null, 2) + "\n";

if (process.argv.includes("--check")) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== output) {
    console.error("openapi/generated.json is out of date. Run `npm run openapi:generate`.");
    process.exit(1);
  }
  console.log("openapi/generated.json is up to date.");
} else {
  writeFileSync(OUT, output);
  const ops = Object.values(paths).reduce((n, p) => n + Object.keys(p).length, 0);
  console.log(`Wrote ${ops} operations across ${Object.keys(paths).length} paths (${unresolved} schema references not resolvable from @carebora/shared).`);
}
