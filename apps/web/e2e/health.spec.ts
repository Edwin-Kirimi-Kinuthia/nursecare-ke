import { test, expect } from "@playwright/test";

test.describe("Health check", () => {
  test("GET /api/v1/health returns 200 with db:up", async ({ request }) => {
    const res = await request.get("/api/v1/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.db).toBe("up");
    expect(typeof body.time).toBe("string");
  });

  test("GET /api/v1/openapi returns a valid spec object", async ({ request }) => {
    const res = await request.get("/api/v1/openapi");
    expect(res.status()).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toBe("CareBora API");
    expect(Object.keys(spec.paths).length).toBeGreaterThan(10);
  });

  test("GET /api/v1/docs returns HTML with Swagger UI", async ({ request }) => {
    const res = await request.get("/api/v1/docs");
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain("swagger-ui");
    expect(html).toContain("CareBora");
  });
});
