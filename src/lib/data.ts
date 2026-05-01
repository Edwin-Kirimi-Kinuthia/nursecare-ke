export interface Provider {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  verified: boolean;
  rating: number;
  reviews: number;
  location: string;
  rate: number;
  experience: number;
  services: string[];
  bio: string;
  available: boolean;
  responseTime: string;
  color: string;
  qualifications: string[];
}

export const providers: Provider[] = [
  {
    id: "1",
    name: "Grace Wanjiku",
    initials: "GW",
    specialty: "Home Care Specialist",
    verified: true,
    rating: 4.9,
    reviews: 127,
    location: "Westlands, Nairobi",
    rate: 1500,
    experience: 8,
    services: ["Home Care", "Wound Care", "Elderly Care"],
    bio: "Experienced home care specialist with a passion for patient wellbeing. Specializes in elderly care and post-surgery recovery. Known for her warm, patient-centered approach that makes patients feel genuinely cared for.",
    available: true,
    responseTime: "< 1 hour",
    color: "bg-blue-500",
    qualifications: ["Kenya Registered Nurse (KRN)", "Certificate in Home Care", "BLS Certified"],
  },
  {
    id: "2",
    name: "James Mwangi",
    initials: "JM",
    specialty: "Registered Nurse",
    verified: true,
    rating: 4.8,
    reviews: 94,
    location: "Karen, Nairobi",
    rate: 2000,
    experience: 12,
    services: ["IV Therapy", "Medication Management", "Post-Surgery Care"],
    bio: "Highly skilled registered nurse with over 12 years of clinical experience in leading Nairobi hospitals. Expert in IV therapy, post-operative care, and complex wound management.",
    available: true,
    responseTime: "< 2 hours",
    color: "bg-teal-500",
    qualifications: ["Kenya Registered Nurse (KRN)", "Diploma in Clinical Medicine", "IV Therapy Certified", "ACLS Certified"],
  },
  {
    id: "3",
    name: "Amina Hassan",
    initials: "AH",
    specialty: "Pediatric Nurse",
    verified: true,
    rating: 5.0,
    reviews: 63,
    location: "Kilimani, Nairobi",
    rate: 1800,
    experience: 6,
    services: ["Pediatric Care", "Vaccination", "Child Health Monitoring"],
    bio: "Dedicated pediatric nurse specializing in child healthcare from newborns to teenagers. Her gentle approach puts both children and parents at ease during every visit.",
    available: false,
    responseTime: "< 3 hours",
    color: "bg-purple-500",
    qualifications: ["Kenya Registered Nurse (KRN)", "Pediatric Nursing Specialist", "Child Immunization Certified"],
  },
  {
    id: "4",
    name: "Peter Kamau",
    initials: "PK",
    specialty: "Emergency Response Nurse",
    verified: true,
    rating: 4.9,
    reviews: 201,
    location: "CBD, Nairobi",
    rate: 2500,
    experience: 10,
    services: ["Emergency Response", "CPR", "Trauma Care", "First Aid"],
    bio: "Certified emergency response specialist trained in rapid medical interventions. Available around the clock for medical emergencies with the fastest response times on the platform.",
    available: true,
    responseTime: "< 30 min",
    color: "bg-red-500",
    qualifications: ["Emergency Medical Technician (EMT)", "ACLS & BLS Certified", "Trauma Care Specialist", "10+ Years Emergency Experience"],
  },
  {
    id: "5",
    name: "Mary Achieng",
    initials: "MA",
    specialty: "Physiotherapist",
    verified: true,
    rating: 4.7,
    reviews: 88,
    location: "Lavington, Nairobi",
    rate: 2200,
    experience: 9,
    services: ["Physiotherapy", "Rehabilitation", "Pain Management"],
    bio: "Certified physiotherapist helping patients recover from orthopedic injuries, strokes, and surgeries using evidence-based rehabilitation techniques at the comfort of their homes.",
    available: true,
    responseTime: "< 2 hours",
    color: "bg-orange-500",
    qualifications: ["BSc Physiotherapy (UoN)", "Orthopedic Physiotherapy Specialist", "Manual Therapy Certified"],
  },
  {
    id: "6",
    name: "John Ochieng",
    initials: "JO",
    specialty: "Geriatric Care Nurse",
    verified: true,
    rating: 4.8,
    reviews: 156,
    location: "Runda, Nairobi",
    rate: 1700,
    experience: 15,
    services: ["Elderly Care", "Dementia Care", "Palliative Care"],
    bio: "Compassionate geriatric care nurse with 15 years of experience. Specialized training in dementia and palliative care. Committed to preserving the dignity and quality of life of elderly patients.",
    available: true,
    responseTime: "< 1 hour",
    color: "bg-green-500",
    qualifications: ["Kenya Registered Nurse (KRN)", "Geriatric Care Specialist", "Palliative Care Certified", "Dementia Care Training"],
  },
  {
    id: "7",
    name: "Faith Njeri",
    initials: "FN",
    specialty: "Midwife & Maternal Care",
    verified: true,
    rating: 5.0,
    reviews: 47,
    location: "Kasarani, Nairobi",
    rate: 1900,
    experience: 7,
    services: ["Antenatal Care", "Postnatal Care", "Newborn Care"],
    bio: "Registered midwife offering comprehensive antenatal and postnatal care at home. Passionate about supporting mothers through every stage of their journey with empathy and expertise.",
    available: true,
    responseTime: "< 2 hours",
    color: "bg-pink-500",
    qualifications: ["Registered Midwife (RM)", "Lactation Consultant", "Newborn Resuscitation Certified"],
  },
  {
    id: "8",
    name: "Samuel Kipkoech",
    initials: "SK",
    specialty: "Cardiac Care Nurse",
    verified: true,
    rating: 4.9,
    reviews: 72,
    location: "Hurlingham, Nairobi",
    rate: 2300,
    experience: 11,
    services: ["Cardiac Monitoring", "Post-Op Cardiac Care", "Medication Management"],
    bio: "Specialized cardiac care nurse with extensive ICU background. Provides expert cardiac monitoring, post-cardiac surgery care, and hypertension management in the home setting.",
    available: false,
    responseTime: "< 3 hours",
    color: "bg-indigo-500",
    qualifications: ["Kenya Registered Nurse (KRN)", "Critical Care Specialist", "Cardiac Monitoring Certified", "ACLS Certified"],
  },
];

export interface Testimonial {
  id: string;
  name: string;
  initials: string;
  location: string;
  rating: number;
  comment: string;
  service: string;
  color: string;
}

export const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Sarah Njoroge",
    initials: "SN",
    location: "Nairobi",
    rating: 5,
    comment: "NurseCare Kenya literally saved my father's life. We requested emergency help at 2 AM and Peter arrived within 25 minutes. The professionalism and care he showed was beyond anything we expected. I can't thank this platform enough.",
    service: "Emergency Response",
    color: "bg-blue-500",
  },
  {
    id: "2",
    name: "David Mutua",
    initials: "DM",
    location: "Karen, Nairobi",
    rating: 5,
    comment: "After my knee surgery, Grace came to our home daily for wound care and physiotherapy. I recovered two weeks faster than expected. The verified badge system gave me so much confidence — I knew I was getting a real professional.",
    service: "Post-Surgery Care",
    color: "bg-teal-500",
  },
  {
    id: "3",
    name: "Fatuma Ali",
    initials: "FA",
    location: "Parklands, Nairobi",
    rating: 5,
    comment: "Finding a trusted nurse for my 82-year-old mother was really stressful until I found NurseCare Kenya. John has been with us for 4 months now — patient, caring, and incredibly professional. Our family sleeps easier knowing he's there.",
    service: "Elderly Care",
    color: "bg-purple-500",
  },
  {
    id: "4",
    name: "Brian Otieno",
    initials: "BO",
    location: "Westlands, Nairobi",
    rating: 5,
    comment: "My wife had a complicated delivery and we needed postnatal support at home. Faith was phenomenal — she guided us through everything with such calm and expertise. Booking was so easy and the price was very fair.",
    service: "Postnatal Care",
    color: "bg-pink-500",
  },
];

export interface Doctor {
  id: string;
  name: string;
  initials: string;
  title: string;
  role: "medical_officer" | "clinical_officer";
  specialty: string;
  subSpecialty?: string;
  verified: boolean;
  rating: number;
  reviews: number;
  consultationFee: number;
  experience: number;
  languages: string[];
  bio: string;
  available: boolean;
  color: string;
  qualifications: string[];
  availableSlots: string[];
  totalPatients: number;
}

export const doctors: Doctor[] = [
  {
    id: "d1",
    name: "Dr. Daniel Omondi",
    initials: "DO",
    title: "Dr.",
    role: "medical_officer",
    specialty: "General Medicine",
    verified: true,
    rating: 4.9,
    reviews: 203,
    consultationFee: 1200,
    experience: 10,
    languages: ["English", "Swahili"],
    bio: "Experienced Medical Officer with a decade of clinical practice in leading Nairobi hospitals. Skilled in managing acute and chronic conditions with a patient-centred, evidence-based approach.",
    available: true,
    color: "bg-blue-600",
    qualifications: ["MBChB — University of Nairobi", "Kenya Medical Practitioners License", "ACLS Certified"],
    availableSlots: ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"],
    totalPatients: 1840,
  },
  {
    id: "d2",
    name: "Dr. Aisha Mwenda",
    initials: "AM",
    title: "Dr.",
    role: "medical_officer",
    specialty: "Pediatrics",
    verified: true,
    rating: 5.0,
    reviews: 147,
    consultationFee: 1400,
    experience: 8,
    languages: ["English", "Swahili", "Arabic"],
    bio: "Passionate pediatric Medical Officer dedicated to the health and wellbeing of children from birth to adolescence. Gentle, reassuring approach that parents and children love.",
    available: true,
    color: "bg-pink-500",
    qualifications: ["MBChB — Aga Khan University", "Pediatric Advanced Life Support (PALS)", "Kenya Medical Practitioners License"],
    availableSlots: ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM"],
    totalPatients: 1203,
  },
  {
    id: "d3",
    name: "CO. Robert Kibet",
    initials: "RK",
    title: "CO.",
    role: "clinical_officer",
    specialty: "General Clinical Medicine",
    verified: true,
    rating: 4.8,
    reviews: 189,
    consultationFee: 800,
    experience: 12,
    languages: ["English", "Swahili", "Kalenjin"],
    bio: "Highly experienced Clinical Officer providing comprehensive primary care consultations. Expert in diagnosing and managing common illnesses, chronic disease monitoring, and preventive health.",
    available: true,
    color: "bg-teal-600",
    qualifications: ["Diploma in Clinical Medicine — Kenya Medical Training College", "Clinical Officers Council License", "BLS Certified"],
    availableSlots: ["8:00 AM", "9:00 AM", "10:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"],
    totalPatients: 2640,
  },
  {
    id: "d4",
    name: "Dr. Njeri Kamau",
    initials: "NK",
    title: "Dr.",
    role: "medical_officer",
    specialty: "Obstetrics & Gynaecology",
    subSpecialty: "Maternal-Foetal Medicine",
    verified: true,
    rating: 4.9,
    reviews: 94,
    consultationFee: 1800,
    experience: 11,
    languages: ["English", "Swahili", "Kikuyu"],
    bio: "Specialist Medical Officer in obstetrics and gynaecology. Provides expert consultations for pregnancy concerns, gynaecological conditions, fertility questions, and women's health.",
    available: false,
    color: "bg-purple-500",
    qualifications: ["MBChB — University of Nairobi", "MMed Obstetrics & Gynaecology", "Kenya Medical Practitioners License"],
    availableSlots: ["10:00 AM", "11:00 AM", "3:00 PM", "4:00 PM"],
    totalPatients: 876,
  },
  {
    id: "d5",
    name: "CO. Esther Waweru",
    initials: "EW",
    title: "CO.",
    role: "clinical_officer",
    specialty: "Reproductive Health",
    verified: true,
    rating: 4.9,
    reviews: 112,
    consultationFee: 900,
    experience: 7,
    languages: ["English", "Swahili"],
    bio: "Clinical Officer specialising in reproductive and sexual health. Compassionate and non-judgmental consultations covering family planning, STI management, antenatal care, and sexual health education.",
    available: true,
    color: "bg-rose-500",
    qualifications: ["Higher Diploma in Reproductive Health — KMTC", "Clinical Officers Council License", "Family Planning Certified"],
    availableSlots: ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM"],
    totalPatients: 980,
  },
  {
    id: "d6",
    name: "Dr. Kevin Otieno",
    initials: "KO",
    title: "Dr.",
    role: "medical_officer",
    specialty: "Internal Medicine",
    subSpecialty: "Diabetes & Hypertension",
    verified: true,
    rating: 4.8,
    reviews: 156,
    consultationFee: 1500,
    experience: 14,
    languages: ["English", "Swahili", "Luo"],
    bio: "Internal Medicine specialist with deep expertise in managing diabetes, hypertension, and other chronic metabolic conditions. Dedicated to long-term patient relationships and preventive care.",
    available: true,
    color: "bg-indigo-600",
    qualifications: ["MBChB — Moi University", "MMed Internal Medicine", "Kenya Medical Practitioners License", "Diabetes Educator Certified"],
    availableSlots: ["9:00 AM", "10:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"],
    totalPatients: 1540,
  },
  {
    id: "d7",
    name: "CO. Brian Muthoni",
    initials: "BM",
    title: "CO.",
    role: "clinical_officer",
    specialty: "Orthopaedics",
    verified: true,
    rating: 4.7,
    reviews: 78,
    consultationFee: 1000,
    experience: 9,
    languages: ["English", "Swahili"],
    bio: "Clinical Officer specialising in orthopaedic and musculoskeletal conditions. Expert in managing back pain, joint problems, sports injuries, and post-fracture rehabilitation guidance.",
    available: true,
    color: "bg-orange-500",
    qualifications: ["Higher Diploma in Orthopaedics — KMTC", "Clinical Officers Council License", "Sports Medicine Certificate"],
    availableSlots: ["8:00 AM", "9:00 AM", "10:00 AM", "1:00 PM", "2:00 PM"],
    totalPatients: 720,
  },
  {
    id: "d8",
    name: "Dr. Amina Sharif",
    initials: "AS",
    title: "Dr.",
    role: "medical_officer",
    specialty: "Mental Health",
    subSpecialty: "Anxiety & Depression",
    verified: true,
    rating: 5.0,
    reviews: 88,
    consultationFee: 1600,
    experience: 9,
    languages: ["English", "Swahili", "Arabic"],
    bio: "Medical Officer with specialised training in mental health. Offers confidential consultations for anxiety, depression, stress, and general mental wellbeing in a safe, supportive environment.",
    available: true,
    color: "bg-violet-500",
    qualifications: ["MBChB — Aga Khan University", "Postgraduate Diploma in Mental Health", "Kenya Medical Practitioners License"],
    availableSlots: ["10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"],
    totalPatients: 640,
  },
];

export interface MedicalNote {
  id: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  patientEmail: string;
  date: string;
  chiefComplaint: string;
  history: string;
  examination: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  followUp: string;
  consultationType: "video" | "in-person";
}

export const adminStats = {
  totalProviders: 523,
  verifiedProviders: 487,
  pendingVerification: 14,
  totalPatients: 10847,
  activeBookings: 238,
  emergencyRequests: 12,
  monthlyRevenue: 4720000,
  averageRating: 4.87,
};

export const pendingVerifications = [
  { id: "v1", name: "Nancy Kamau", specialty: "Home Care", submitted: "2026-04-27", docs: 5, status: "pending" },
  { id: "v2", name: "Robert Odhiambo", specialty: "Emergency Nurse", submitted: "2026-04-26", docs: 7, status: "pending" },
  { id: "v3", name: "Lucy Wangari", specialty: "Physiotherapist", submitted: "2026-04-25", docs: 4, status: "review" },
  { id: "v4", name: "Moses Kiprono", specialty: "Geriatric Nurse", submitted: "2026-04-24", docs: 6, status: "review" },
  { id: "v5", name: "Agnes Muthoni", specialty: "Pediatric Nurse", submitted: "2026-04-23", docs: 5, status: "pending" },
];
