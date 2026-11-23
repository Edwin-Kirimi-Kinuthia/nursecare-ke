import { z } from "zod";
import { b2cResultSchema } from "@carebora/shared";
import { b2cService } from "@carebora/core";
import { NextResponse } from "next/server";
import { route } from "./http";
export function b2cCallback(timeout: boolean) {
  return route(async (req, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const token = z.string().regex(/^[a-f0-9]{64}$/).parse(new URL(req.url).searchParams.get("token"));
    const { Result } = b2cResultSchema.parse(await req.json());
    await b2cService.callback(z.string().uuid().parse(id), token, Result, timeout);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
  });
}
