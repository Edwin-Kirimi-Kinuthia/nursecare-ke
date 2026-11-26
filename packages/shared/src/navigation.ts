/** Trusted destinations shared by the assistant's web and native clients. */
export const NAVIGATION_SERVICES = [
  { id: "consultations", title: "Consultations", web: "/providers", mobile: "/doctors", keywords: "doctor nurse clinician consultation appointment book video sick treatment" },
  { id: "pharmacy", title: "Pharmacy", web: "/pharmacy", mobile: "/pharmacy", keywords: "pharmacy medicine medication prescription delivery drug" },
  { id: "home", title: "Home care", web: "/home-visits", mobile: "/home-visits", keywords: "home visit care physiotherapy physio" },
  { id: "ambulance", title: "Ambulance", web: "/ambulance", mobile: "/ambulance", keywords: "ambulance emergency urgent accident" },
  { id: "labs", title: "Laboratory tests", web: "/labs", mobile: "/labs", keywords: "lab laboratory test sample blood" },
  { id: "documents", title: "Medical documents", web: "/contact", mobile: "/support/new", keywords: "document report certificate form sick-off sickoff" },
  { id: "appointments", title: "My appointments", web: "/appointments", mobile: "/appointments", keywords: "my appointment booking join call" },
  { id: "earnings", title: "Earnings & withdrawals", web: "/earnings", mobile: "/earnings", keywords: "earnings withdraw payout mpesa balance vendor provider" },
  { id: "downloads", title: "Download apps", web: "/download", mobile: "/account", keywords: "download install apk mobile desktop" },
  { id: "records", title: "My records", web: "/records", mobile: "/records", keywords: "medical records documents history" },
  { id: "orders", title: "My pharmacy orders", web: "/orders", mobile: "/orders", keywords: "order tracking shipment dispatched delivered" },
  { id: "account", title: "My account", web: "/profile", mobile: "/account", keywords: "account profile settings notifications" },
  { id: "signin", title: "Sign in", web: "/login", mobile: "/login", keywords: "login password otp sign" },
  { id: "provider-apply", title: "Become a provider", web: "/providers/apply", mobile: "/apply/provider", keywords: "apply provider licence registration" },
  { id: "vendor-apply", title: "Become a vendor", web: "/vendors/apply", mobile: "/apply/vendor", keywords: "vendor pharmacy laboratory business apply" },
  { id: "admin-orders", title: "Pharmacy sales orders", web: "/admin?tab=orders", mobile: "/admin?tab=orders", keywords: "admin sales pharmacy orders" },
  { id: "vendor-orders", title: "Vendor orders", web: "/vendor", mobile: "/vendor", keywords: "vendor orders delivery review" },
  { id: "support", title: "Contact support", web: "/contact", mobile: "/support/new", keywords: "help support contact payment refund" },
] as const;
export interface NavigationReply { message: string; serviceIds: string[]; source: "ai" | "guide"; suggestions?: string[]; actions?: NavigationAction[] }

export interface NavigationTurn { role: "user" | "assistant"; content: string }
export interface NavigationContext { history?: NavigationTurn[]; page?: string }
export interface NavigationAction { id: string; title: string; detail?: string; web: string; mobile: string }
export const ASSISTANT_GREETING: NavigationReply = {
  message: "Hi! I can help with Care Bora services, medicines, orders, payments and using your account. What would you like to do?",
  serviceIds: [], source: "guide",
  suggestions: ["How do I book a doctor?", "Find medicine", "Track my pharmacy order"],
};
/** Kept in memory by clients; never persist private conversations in browser storage. */
export function assistantHistory(turns: NavigationTurn[]): NavigationTurn[] { return turns.slice(-8).map(turn => ({ role: turn.role, content: turn.content.slice(0, 1200) })); }
export function navigationActions(reply: NavigationReply): NavigationAction[] {
  return reply.actions ?? NAVIGATION_SERVICES.filter(s => reply.serviceIds.includes(s.id)).map(s => ({ id: s.id, title: s.title, web: s.web, mobile: s.mobile }));
}
