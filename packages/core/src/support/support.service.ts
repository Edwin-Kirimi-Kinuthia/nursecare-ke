import { db } from "@carebora/db";
import {
  ApiError,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_DOCUMENT_LABELS,
  type CreateSupportTicketInput,
  type PatchSupportTicketInput,
  type ReplySupportTicketInput,
  type SupportTicketsQuery,
} from "@carebora/shared";
import { notificationService } from "../notifications/notification.service";
import { inAppNotifications } from "../notifications/inapp.service";

const TICKET_INCLUDE = {
  messages: {
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, fullName: true, avatarUrl: true, role: true } } },
  },
  user: { select: { id: true, fullName: true, email: true, role: true } },
  assignedTo: { select: { id: true, fullName: true } },
} as const;

/** Human label for a ticket, used in emails and the admin list. */
function describe(ticket: { category: string; documentType: string | null }): string {
  const category = SUPPORT_CATEGORY_LABELS[ticket.category as keyof typeof SUPPORT_CATEGORY_LABELS] ?? ticket.category;
  if (ticket.documentType) {
    const doc = SUPPORT_DOCUMENT_LABELS[ticket.documentType as keyof typeof SUPPORT_DOCUMENT_LABELS];
    return doc ? `${category} — ${doc}` : category;
  }
  return category;
}

export const supportService = {
  /**
   * Open a ticket. `userId` is null for a visitor writing in from the public
   * contact page, which is why the contact details are stored on the ticket
   * rather than read back off the account.
   */
  async create(userId: string | null, input: CreateSupportTicketInput) {
    const ticket = await db.supportTicket.create({
      data: {
        userId,
        category: input.category,
        documentType: input.category === "document_request" ? (input.documentType ?? null) : null,
        subject: input.subject,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        // The opening message is a thread row like any other, so the
        // conversation has one uniform shape from the start.
        messages: { create: { senderId: userId, fromStaff: false, body: input.message } },
      },
      include: TICKET_INCLUDE,
    });

    void notificationService.supportTicketReceived({
      email: ticket.contactEmail,
      name: ticket.contactName,
      subject: ticket.subject,
      what: describe(ticket),
      reference: ticket.id,
    });
    void notificationService.supportTicketForStaff({
      subject: ticket.subject,
      what: describe(ticket),
      message: input.message,
      contactName: ticket.contactName,
      contactEmail: ticket.contactEmail,
      contactPhone: ticket.contactPhone,
      ticketId: ticket.id,
      isRegistered: !!userId,
    });

    return ticket;
  },

  /** A client's own tickets. */
  async listMine(userId: string, query: SupportTicketsQuery) {
    const where = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        include: TICKET_INCLUDE,
        orderBy: { lastReplyAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      db.supportTicket.count({ where }),
    ]);
    return { tickets, total, limit: query.limit, offset: query.offset };
  },

  /** The admin inbox. */
  async adminList(query: SupportTicketsQuery) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
    const [tickets, total, openCount] = await Promise.all([
      db.supportTicket.findMany({
        where,
        include: TICKET_INCLUDE,
        orderBy: { lastReplyAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      db.supportTicket.count({ where }),
      db.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    ]);
    return { tickets, total, openCount, limit: query.limit, offset: query.offset };
  },

  /** One thread. A client may only read their own; an admin may read any. */
  async getById(ticketId: string, userId: string, isAdmin: boolean) {
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
      include: TICKET_INCLUDE,
    });
    if (!ticket) throw ApiError.notFound("Message thread not found");
    if (!isAdmin && ticket.userId !== userId) throw ApiError.forbidden();
    return ticket;
  },

  /**
   * Add a message to a thread.
   *
   * The status follows who spoke last: a staff reply puts the ball in the
   * client's court, and a client reply brings it back to the team. A resolved
   * thread reopens when the client writes again, so a follow-up can't be
   * silently lost.
   */
  async reply(
    ticketId: string,
    sender: { userId: string; isAdmin: boolean },
    input: ReplySupportTicketInput,
  ) {
    const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw ApiError.notFound("Message thread not found");
    if (!sender.isAdmin && ticket.userId !== sender.userId) throw ApiError.forbidden();
    if (ticket.status === "closed" && sender.isAdmin) {
      throw ApiError.badRequest("This thread is closed. Reopen it before replying.");
    }

    const nextStatus = sender.isAdmin ? "awaiting_client" : "in_progress";

    const [message] = await db.$transaction([
      db.supportMessage.create({
        data: { ticketId, senderId: sender.userId, fromStaff: sender.isAdmin, body: input.body },
      }),
      db.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: nextStatus,
          lastReplyAt: new Date(),
          ...(nextStatus === "in_progress" ? { resolvedAt: null } : {}),
        },
      }),
    ]);

    if (sender.isAdmin) {
      void notificationService.supportTicketReplied({
        email: ticket.contactEmail,
        name: ticket.contactName,
        subject: ticket.subject,
        body: input.body,
        ticketId: ticket.id,
      });
      if (ticket.userId) {
        void inAppNotifications.create(ticket.userId, {
          type: "support_reply",
          title: "Care Bora replied to your message",
          body: ticket.subject,
          link: "/contact",
        });
      }
    } else {
      void notificationService.supportTicketForStaff({
        subject: ticket.subject,
        what: `${describe(ticket)} (client reply)`,
        message: input.body,
        contactName: ticket.contactName,
        contactEmail: ticket.contactEmail,
        contactPhone: ticket.contactPhone,
        ticketId: ticket.id,
        isRegistered: !!ticket.userId,
      });
    }

    return message;
  },

  /** Admin: change status or assignment. */
  async patch(ticketId: string, input: PatchSupportTicketInput) {
    const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw ApiError.notFound("Message thread not found");

    const resolving = input.status === "resolved" || input.status === "closed";
    const updated = await db.supportTicket.update({
      where: { id: ticketId },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
        ...(input.status ? { resolvedAt: resolving ? new Date() : null } : {}),
      },
      include: TICKET_INCLUDE,
    });

    if (resolving && ticket.status !== input.status) {
      void notificationService.supportTicketResolved({
        email: updated.contactEmail,
        name: updated.contactName,
        subject: updated.subject,
        ticketId: updated.id,
      });
    }
    return updated;
  },
};
