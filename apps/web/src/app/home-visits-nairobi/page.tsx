import ServicePage from "@/components/ServicePage";
import homeVisitImg from "@/assets/home/home-visit.jpg";
import { HOME_VISITS, serviceMetadata } from "@/lib/service-pages";

export const metadata = serviceMetadata(HOME_VISITS.path, "Home Visits: Nurse, Physio, Doctor", "Request a nurse, physiotherapist or doctor to visit you at home. Tell us what you need and where you are, and pay with M-Pesa to confirm.");

export default function Page() {
  return <ServicePage
      image={{ src: homeVisitImg, alt: "A health worker checking on a child outside a home", credit: { author: "Neil Thomas / Safari Doctors", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Connecting_with_the_youth_(Credit_Neil_Thomas).jpg" } }} {...HOME_VISITS} />;
}
