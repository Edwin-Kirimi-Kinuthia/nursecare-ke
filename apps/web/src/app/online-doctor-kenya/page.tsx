import ServicePage from "@/components/ServicePage";
import { ONLINE_DOCTOR, serviceMetadata } from "@/lib/service-pages";

export const metadata = serviceMetadata(ONLINE_DOCTOR.path, "See a Doctor Online in Kenya", "Book a video consultation with a licence-checked doctor in Kenya and pay with M-Pesa. See how it works, what it costs and when to seek in-person care.");

export default function Page() {
  return <ServicePage {...ONLINE_DOCTOR} />;
}
