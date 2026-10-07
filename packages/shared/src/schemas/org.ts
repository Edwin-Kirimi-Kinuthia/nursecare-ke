import { z } from "zod";
import { KENYA_COUNTIES } from "../geo";
import { passwordSchema } from "./auth";

export const orgTypeEnum = z.enum(["pharmacy", "ambulance", "lab", "clinic"]);
export const orgStatusEnum = z.enum(["pending", "in_review", "approved", "suspended", "rejected"]);
export const orgMemberRoleEnum = z.enum(["owner", "manager", "staff"]);

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number");

const branchInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  county: z.enum(KENYA_COUNTIES),
  town: z.string().trim().max(100).optional(),
  addressLine: z.string().trim().max(200).optional(),
  phone: phoneSchema.optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  deliveryRadiusKm: z.coerce.number().int().min(1).max(200).default(10),
  deliveryFeeKes: z.coerce.number().int().min(0).default(0),
  minOrderKes: z.coerce.number().int().min(0).default(0),
  opensMinute: z.coerce.number().int().min(0).max(1439).optional(),
  closesMinute: z.coerce.number().int().min(0).max(1439).optional(),
  isOpen24h: z.boolean().default(false),
});

/** Vendor onboarding: creates a business-account User + Organization + first branch. */
export const vendorApplicationSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: phoneSchema.optional(),
  password: passwordSchema,
  orgType: orgTypeEnum,
  orgName: z.string().trim().min(2, "Business name is required").max(120),
  description: z.string().trim().max(1000).optional(),
  licenceNumber: z.string().trim().min(2, "Licence number is required").max(60),
  licenceBody: z.string().trim().max(120).optional(),
  kraPin: z.string().trim().max(20).optional(),
  contactEmail: z.string().trim().toLowerCase().email().optional(),
  contactPhone: phoneSchema.optional(),
  branch: branchInputSchema,
});
export type VendorApplicationInput = z.infer<typeof vendorApplicationSchema>;

export const createBranchSchema = branchInputSchema;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const patchBranchSchema = branchInputSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type PatchBranchInput = z.infer<typeof patchBranchSchema>;

export const patchOrgSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  logoUrl: z.string().max(3_000_000).optional(),
  contactEmail: z.string().trim().toLowerCase().email().optional(),
  contactPhone: phoneSchema.optional(),
  payoutMethod: z.string().trim().max(60).optional(),
  payoutAccount: z.string().trim().max(60).optional(),
  payoutName: z.string().trim().max(120).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
export type PatchOrgInput = z.infer<typeof patchOrgSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: orgMemberRoleEnum.default("staff"),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const orgsQuerySchema = z.object({
  type: orgTypeEnum.optional(),
  status: orgStatusEnum.optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type OrgsQuery = z.infer<typeof orgsQuerySchema>;

export const reviewOrgSchema = z.object({
  status: z.enum(["in_review", "approved", "rejected", "suspended"]),
  notes: z.string().max(1000).optional(),
  commissionPercent: z.coerce.number().int().min(0).max(100).optional(),
});
export type ReviewOrgInput = z.infer<typeof reviewOrgSchema>;

/** Nearby-org search params, shared by the pharmacy/ambulance/lab storefronts. */
export const nearbyQuerySchema = z.object({
  type: orgTypeEnum,
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
