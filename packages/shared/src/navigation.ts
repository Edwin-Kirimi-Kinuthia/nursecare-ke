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
  { id: "support", title: "Contact support", web: "/contact", mobile: "/support/new", keywords: "help support contact payment refund" },
] as const;
export interface NavigationReply { message: string; serviceIds: string[]; source: "ai" | "guide" }
