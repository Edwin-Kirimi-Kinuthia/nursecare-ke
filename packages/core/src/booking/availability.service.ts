import { db } from "@carebora/db";
import { ApiError, type CreateAvailabilityInput, type CreateSlotInput, type SlotsQuery } from "@carebora/shared";
import { addDays, startOfDay } from "./date-utils";

export const availabilityService = {
  /** List a provider's recurring schedule rules. */
  async listAvailabilities(providerId: string) {
    return db.availability.findMany({
      where: { providerId, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    });
  },

  /** Add a weekly availability rule and generate slots for the next 60 days. */
  async createAvailability(providerId: string, input: CreateAvailabilityInput) {
    const rule = await db.availability.create({
      data: { providerId, ...input },
    });
    await generateSlotsForRule(rule, 60);
    return rule;
  },

  /** Delete a recurring rule (does not remove already-generated unbooked slots). */
  async deleteAvailability(providerId: string, availabilityId: string) {
    const rule = await db.availability.findFirst({
      where: { id: availabilityId, providerId },
    });
    if (!rule) throw ApiError.notFound("Availability rule not found");
    await db.availability.update({
      where: { id: availabilityId },
      data: { isActive: false },
    });
  },

  /** List open slots for a provider (unbooked, in the future). */
  async listSlots(providerId: string, query: SlotsQuery) {
    const now = new Date();
    return db.slot.findMany({
      where: {
        providerId,
        isBooked: false,
        startsAt: {
          gte: query.from ?? now,
          ...(query.to ? { lte: query.to } : {}),
        },
        ...(query.type ? { appointmentType: query.type } : {}),
      },
      orderBy: { startsAt: "asc" },
      take: 100,
    });
  },

  /** Manually add a one-off slot (provider override). */
  async createSlot(providerId: string, input: CreateSlotInput) {
    if (input.endsAt <= input.startsAt) {
      throw ApiError.badRequest("endsAt must be after startsAt");
    }
    try {
      return await db.slot.create({
        data: { providerId, availabilityId: null, ...input },
      });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === "P2002") {
        throw ApiError.conflict("A slot already exists at this time");
      }
      throw err;
    }
  },
};

/** Generate concrete Slot rows from an Availability rule for the next N days. */
async function generateSlotsForRule(
  rule: {
    id: string;
    providerId: string;
    appointmentType: "teleconsult" | "home_visit";
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    slotDuration: number;
  },
  days: number,
) {
  const slots: {
    providerId: string;
    availabilityId: string;
    appointmentType: "teleconsult" | "home_visit";
    startsAt: Date;
    endsAt: Date;
  }[] = [];

  const today = startOfDay(new Date());

  for (let d = 0; d < days; d++) {
    const day = addDays(today, d);
    // getDay() returns 0 = Sunday … 6 = Saturday
    if (day.getDay() !== rule.dayOfWeek) continue;

    let startMin = rule.startMinute;
    while (startMin + rule.slotDuration <= rule.endMinute) {
      const startsAt = new Date(day.getTime() + startMin * 60_000);
      const endsAt = new Date(day.getTime() + (startMin + rule.slotDuration) * 60_000);
      slots.push({
        providerId: rule.providerId,
        availabilityId: rule.id,
        appointmentType: rule.appointmentType,
        startsAt,
        endsAt,
      });
      startMin += rule.slotDuration;
    }
  }

  if (slots.length === 0) return;

  // skipDuplicates so re-generating after a rule update is safe
  await db.slot.createMany({ data: slots, skipDuplicates: true });
}
