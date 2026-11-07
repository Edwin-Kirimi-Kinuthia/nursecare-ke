import ServicePage from "@/components/ServicePage";
import { SICK_OFF, serviceMetadata } from "@/lib/service-pages";
import { CARE_IMAGES } from "@/lib/care-imagery";

export const metadata = serviceMetadata(SICK_OFF.path, "Sick-Off Sheet Online in Kenya", "How to get a signed sick-off sheet online in Kenya: a doctor assesses you by video and, where appropriate, issues a medical certificate as a PDF.");

export default function Page() {
  return <ServicePage {...SICK_OFF} image={CARE_IMAGES.consultation} />;
}
