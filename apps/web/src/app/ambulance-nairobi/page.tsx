import ServicePage from "@/components/ServicePage";
import ambulanceImg from "@/assets/home/ambulance.jpg";
import { AMBULANCE, serviceMetadata } from "@/lib/service-pages";

export const metadata = serviceMetadata(AMBULANCE.path, "Ambulance Line: +254 717 231 721", "Need an ambulance? Call +254 717 231 721 and tell our dispatch team where you are and what has happened. What to say, and what to do if no one answers.");

export default function Page() {
  return <ServicePage
      image={{ src: ambulanceImg, alt: "An ambulance parked outside a community clinic" }} {...AMBULANCE} />;
}
