import { db } from "@carebora/db";
import { ApiError, type CreateAvailabilityInput, type CreateSlotInput, type SlotsQuery } from "@carebora/shared";
import { addDays, startOfDay } from "./date-utils";

/**
 * Default clinic hours applied when a provider simply flips themselves
 * "available", instead of making them hand-build a weekly schedule.
 * Mon–Sat, 08:00–18:00, in 30-minute teleconsult slots.
 */
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const DEFAULT_START_MINUTE = 8 * 60;
const DEFAULT_END_MINUTE = 18 * 60;
const DEFAULT_SLOT_DURATION = 30;
const SLOT_HORIZON_DAYS = 60;

export const availabilityService = {
  /**
   * The whole of a provider's scheduling UX: one switch.
   *
   * On — make sure their default weekly rules exist and are active, then fill
   * the next two months with bookable slots.
   * Off — deactivate the rules and clear future slots nobody has booked yet.
   * Already-booked slots are never touched; those appointments still stand.
   */
  async setAvailability(providerId: string, available: boolean) {
    if (!available) {
      await db.availability.updateMany({ where: { providerId }, data: { isActive: false } });
      const { count } = await db.slot.deleteMany({
        where: { providerId, isBooked: false, startsAt: { gt: new Date() } },
      });
      return { available, slotsRemoved: count };
    }

    for (const dayOfWeek of DEFAULT_WORKING_DAYS) {
      const existing = await db.availability.findFirst({
        where: { providerId, appointmentType: "teleconsult", dayOfWeek },
      });
      const rule = existing
        ? await db.availability.update({ where: { id: existing.id }, data: { isActive: true } })
        : await db.availability.create({
            data: {
              providerId,
              appointmentType: "teleconsult",
              dayOfWeek,
              startMinute: DEFAULT_START_MINUTE,
              endMinute: DEFAULT_END_MINUTE,
              slotDuration: DEFAULT_SLOT_DURATION,
            },
          });
      await generateSlotsForRule(rule, SLOT_HORIZON_DAYS);
    }

    const slotsOpen = await db.slot.count({
      where: { providerId, isBooked: false, startsAt: { gt: new Date() } },
    });
    return { available, slotsOpen };
  },

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
