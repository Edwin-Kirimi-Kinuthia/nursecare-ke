import ServicePage from "@/components/ServicePage";
import doctorChildImg from "@/assets/home/doctor-child.jpg";
import { SICK_OFF, serviceMetadata } from "@/lib/service-pages";

export const metadata = serviceMetadata(SICK_OFF.path, "Sick-Off Sheet Online in Kenya", "How to get a signed sick-off sheet online in Kenya: a doctor assesses you by video and, where appropriate, issues a medical certificate as a PDF.");

export default function Page() {
  return <ServicePage
      image={{ src: doctorChildImg, alt: "A doctor examining a patient with a stethoscope" }} {...SICK_OFF} />;
}
