import ServicePage from "@/components/ServicePage";
import { serviceMetadata } from "@/lib/service-pages";
import { CARE_IMAGES } from "@/lib/care-imagery";

export const metadata = serviceMetadata("/laboratory-tests-kenya", "Laboratory Tests in Kenya", "Find approved laboratories through Care Bora and access your available test results securely in your account.");
export default function Page() {
  return <ServicePage path="/laboratory-tests-kenya" name="Laboratory tests" eyebrow="Laboratory services" h1="Find a laboratory in Kenya" intro="Browse approved laboratories and keep your available results in your Care Bora account." schemaDescription="Laboratory directory and secure access to available results in Kenya." cta={{ label: "Find a laboratory", href: "/labs" }} image={CARE_IMAGES.laboratory} updated="2026-11-24"
    stepsHeading="How to access laboratory services"
    steps={[{ title: "Find a laboratory", body: "Open the laboratory directory to see approved laboratories and their contact details." }, { title: "Confirm your test", body: "Contact the laboratory to confirm which tests are available, preparation instructions, fees and collection arrangements." }, { title: "Access your results", body: "Sign in to view results that your laboratory has made available in your account." }]}
    sections={[{ heading: "Before your test", paragraphs: ["Follow the instructions from your clinician and laboratory. Some tests require fasting or a particular collection time. Confirm these details before travelling.", "Test availability, fees and turnaround times depend on the laboratory. Discuss your results with a qualified clinician."] }]}
    faqs={[{ q: "Can I view results online?", a: "Results uploaded to your Care Bora account are available after you sign in. Contact your laboratory if a result is missing." }, { q: "How much does a test cost?", a: "Contact the laboratory to confirm its current fees and which tests it provides." }]}
    related={[{ label: "Online consultations", href: "/online-doctor-kenya", blurb: "Discuss your care with a clinician." }, { label: "Care at home", href: "/home-visits-nairobi", blurb: "Learn about home visits." }]} />;
}
