import { db } from "@carebora/db";
import { ApiError, PROVIDER_ROLES, type DocumentSignatureInput, type UserRole } from "@carebora/shared";

export const documentSignatureService = {
  /** Private: a provider may read or replace only their own saved signature. */
  async get(providerId: string) {
    return db.providerDocumentSignature.findUnique({ where: { providerId } });
  },
  async save(providerId: string, role: UserRole, input: DocumentSignatureInput) {
    if (!PROVIDER_ROLES.includes(role)) throw ApiError.forbidden();
    const p = await db.providerProfile.findUnique({ where: { userId: providerId }, include: { user: true } });
    if (!p || p.verificationStatus !== "verified" || !p.user.isActive || p.user.deletedAt) throw ApiError.forbidden("Only verified providers can authorize a document signature");
    if (!p.licenceBody?.trim() || !p.licenceNumber?.trim()) throw ApiError.badRequest("Save your licensing body and licence number in your professional profile first");
    return db.$transaction(async (tx) => {
      const signature = await tx.providerDocumentSignature.upsert({
        where: { providerId }, create: { providerId, signatureDataUrl: input.signatureDataUrl },
        update: { signatureDataUrl: input.signatureDataUrl, authorizedAt: new Date() },
      });
      await tx.auditLog.create({ data: { actorId: providerId, action: "document_signature_authorized", entityType: "provider", entityId: providerId } });
      return signature;
    });
  },
  /** Only call after establishing that the caller may read the clinical document. */
  async forDocument(providerId: string) {
    const p = await db.providerProfile.findUnique({
      where: { userId: providerId }, include: { documentSignature: true, user: { select: { fullName: true } } },
    });
    if (!p?.documentSignature || !p.licenceBody?.trim() || !p.licenceNumber?.trim()) {
      throw ApiError.badRequest("This document is awaiting the provider's signature and licence details. The provider can complete these in Professional profile.");
    }
    return { providerName: p.user.fullName, licenceBody: p.licenceBody, licenceNumber: p.licenceNumber, signatureDataUrl: p.documentSignature.signatureDataUrl };
  },
};
