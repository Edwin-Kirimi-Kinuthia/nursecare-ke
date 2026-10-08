import { db } from "@carebora/db";
import { ApiError, type CreateAvailabilityInput, type CreateSlotInput, type SlotsQuery } from "@carebora/shared";
import { addDays, startOfDay } from "./date-utils";

/**
 * Default clinic hours, so a provider never has to hand-build a weekly
 * schedule. Mon–Sat, 08:00–18:00, in 30-minute teleconsult slots.
 */
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const DEFAULT_START_MINUTE = 8 * 60;
const DEFAULT_END_MINUTE = 18 * 60;
const DEFAULT_SLOT_DURATION = 30;
const SLOT_HORIZON_DAYS = 60;

/** How far ahead a provider's calendar must reach before it is topped up. */
const TOP_UP_THRESHOLD_DAYS = 14;

export const availabilityService = {
  /**
   * Make sure a bookable provider has a calendar. Idempotent.
   *
   * The calendar and the availability switch are deliberately separate things.
   * The calendar is *when* a provider can be booked — a fixed weekly pattern
   * that exists whenever they are bookable at all. The switch (isAvailable) is
   * their live state: free right now, or busy with another client. Turning it
   * off used to delete every open slot, which made a busy provider
   * unbookable and so defeated the point of marking oneself busy.
   *
   * Two conditions guard it. The provider must be verified, since the
   * directory only shows verified providers. And they must have set a
   * consultation fee: a slot with no fee is a free appointment, which nobody
   * intended and which pay-before-consultation would then wave straight
   * through.
   */
  async ensureSchedule(providerId: string) {
    const profile = await db.providerProfile.findUnique({
      where: { userId: providerId },
      select: { verificationStatus: true, consultationFeeKes: true },
    });
    if (!profile || profile.verificationStatus !== "verified") return { eligible: false as const };
    if (!profile.consultationFeeKes || profile.consultationFeeKes <= 0) return { eligible: false as const };

    for (const dayOfWeek of DEFAULT_WORKING_DAYS) {
      const existing = await db.availability.findFirst({
        where: { providerId, appointmentType: "teleconsult", dayOfWeek },
      });
      const rule = existing
        ? existing.isActive
          ? existing
          : await db.availability.update({ where: { id: existing.id }, data: { isActive: true } })
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
    return { eligible: true as const, slotsOpen };
  },

  /**
   * Keep a calendar from quietly running dry. Slots are generated 60 days out
   * and nothing else runs on a schedule, so without this a provider's calendar
   * would simply end. Checked whenever slots are listed, and only does work
   * when nothing is booked-out beyond the next two weeks.
   */
  async topUpIfNeeded(providerId: string) {
    const horizon = new Date(Date.now() + TOP_UP_THRESHOLD_DAYS * 86_400_000);
    const farSlot = await db.slot.findFirst({
      where: { providerId, startsAt: { gte: horizon } },
      select: { id: true },
    });
    if (!farSlot) await this.ensureSchedule(providerId);
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
    await this.topUpIfNeeded(providerId);
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
