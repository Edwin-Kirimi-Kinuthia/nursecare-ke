import { z } from "zod";

export const supportCategoryEnum = z.enum([
  "general_enquiry",
  "document_request",
  "appointment_help",
  "payment_issue",
  "technical_issue",
  "complaint",
]);
export type SupportCategory = z.infer<typeof supportCategoryEnum>;

export const supportDocumentTypeEnum = z.enum([
  "sick_off",
  "medical_report",
  "fit_to_work",
  "school_medical_form",
  "insurance_form",
  "travel_certificate",
  "other",
]);
export type SupportDocumentType = z.infer<typeof supportDocumentTypeEnum>;

export const supportStatusEnum = z.enum(["open", "awaiting_client", "in_progress", "resolved", "closed"]);
export type SupportStatus = z.infer<typeof supportStatusEnum>;

/** Labels shared by the client form and the admin inbox, so they never disagree. */
export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  general_enquiry: "General enquiry",
  document_request: "Request a medical document",
  appointment_help: "Help with an appointment",
  payment_issue: "Payment or refund",
  technical_issue: "Something isn't working",
  complaint: "Complaint",
};

export const SUPPORT_DOCUMENT_LABELS: Record<SupportDocumentType, string> = {
  sick_off: "Sick-off sheet (medical certificate)",
  medical_report: "Medical report",
  fit_to_work: "Fit-to-work certificate",
  school_medical_form: "School admission medical form",
  insurance_form: "Insurance medical form",
  travel_certificate: "Travel health certificate",
  other: "Another document",
};

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: "Open",
  awaiting_client: "Awaiting your reply",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

/** People type "+254 712 345 678" or "0712-345-678": ignore the formatting, then check the digits. */
const phoneSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[\s\-().]/g, "") : v),
  z.string().regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number, including the country code, e.g. +254 712 345 678"),
);

export const createSupportTicketSchema = z
  .object({
    category: supportCategoryEnum,
    documentType: supportDocumentTypeEnum.optional(),
    subject: z.string().trim().min(3, "Give your message a short subject").max(150),
    message: z.string().trim().min(10, "Please describe what you need in a little more detail").max(4000),
    contactName: z.string().trim().min(2, "Name is too short").max(120),
    contactEmail: z.string().trim().toLowerCase().email("Enter a valid email"),
    contactPhone: phoneSchema.optional(),
  })
  // A document request without the document type leaves the team guessing, so
  // it is required there and ignored everywhere else.
  .refine((v) => v.category !== "document_request" || !!v.documentType, {
    message: "Tell us which document you need",
    path: ["documentType"],
  });
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const replySupportTicketSchema = z.object({
  body: z.string().trim().min(1, "Write a reply").max(4000),
});
export type ReplySupportTicketInput = z.infer<typeof replySupportTicketSchema>;

export const patchSupportTicketSchema = z.object({
  status: supportStatusEnum.optional(),
  /** Pass null to unassign. */
  assignedToId: z.string().uuid().nullable().optional(),
});
export type PatchSupportTicketInput = z.infer<typeof patchSupportTicketSchema>;

export const supportTicketsQuerySchema = z.object({
  status: supportStatusEnum.optional(),
  category: supportCategoryEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
export type SupportTicketsQuery = z.infer<typeof supportTicketsQuerySchema>;
