import portrait from "@/assets/care/care-portrait.jpg";
import consultation from "@/assets/care/video-call.jpg";
import pharmacy from "@/assets/care/pharmacy.jpg";
import homeVisit from "@/assets/home/home-visit.jpg";

/** Illustrative service photographs; never used as provider profile pictures. */
export const CARE_IMAGES = {
  portrait: {
    src: portrait,
    alt: "A smiling healthcare professional in a white coat holding a notebook",
    credit: { author: "Tessy Agbonome", license: "Pexels License", source: "https://www.pexels.com/photo/smiling-doctor-sitting-in-a-chair-18828742/" },
  },
  consultation: {
    src: consultation,
    alt: "A clinician wearing a headset speaking with a patient on a laptop video call",
    credit: { author: "Kaboompics", license: "Pexels License", source: "https://www.pexels.com/photo/a-doctor-on-a-video-call-with-a-patient-7195091/" },
  },
  pharmacy: {
    src: pharmacy,
    alt: "A pharmacist checking medication on the shelves of a pharmacy",
    credit: { author: "Abdul batin", license: "Pexels License", source: "https://www.pexels.com/photo/professional-pharmacist-in-modern-drugstore-space-for-text-13119976/" },
  },
  homeVisit: {
    src: homeVisit,
    alt: "A community health worker talking with a young person outdoors in Kenya",
    credit: { author: "Neil Thomas / Safari Doctors", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Connecting_with_the_youth_(Credit_Neil_Thomas).jpg" },
  },
} as const;
