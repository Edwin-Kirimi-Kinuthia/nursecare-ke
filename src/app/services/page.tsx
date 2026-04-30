import Link from "next/link";

const services = [
  {
    id: "home-care",
    title: "Home-Based Care",
    subtitle: "Daily assistance and support at home",
    desc: "Our home care professionals provide compassionate, round-the-clock assistance for patients who need support with daily activities, recovery, or ongoing health management — all from the comfort of home.",
    features: [
      "Personal hygiene assistance (bathing, grooming, dressing)",
      "Wound care and dressing changes",
      "Medication reminders and adherence monitoring",
      "Mobility assistance and fall prevention",
      "Nutritional support and meal preparation",
      "Companionship and emotional support",
      "Light housekeeping related to patient care",
      "Vital signs monitoring",
    ],
    suitable: ["Post-surgery recovery", "Chronic illness management", "Disability support", "Elderly / aging adults"],
    price: "From KES 1,500/hr",
    color: "blue",
    bg: "bg-blue-600",
    lightBg: "bg-blue-50",
    textColor: "text-blue-600",
    borderColor: "border-blue-200",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: "nursing",
    title: "Professional Nursing",
    subtitle: "Clinical nursing services at your doorstep",
    desc: "Our Kenya Registered Nurses bring hospital-quality clinical care directly to your home. From IV therapy to complex wound management, our nurses handle it all with professionalism and precision.",
    features: [
      "Intravenous (IV) therapy and infusions",
      "Intramuscular and subcutaneous injections",
      "Complex wound care and stoma management",
      "Post-surgical care and monitoring",
      "Urinary catheter insertion and care",
      "Blood glucose monitoring and insulin management",
      "Nasogastric tube management",
      "Vital signs and clinical assessment",
    ],
    suitable: ["Post-operative care", "Diabetes management", "Chronic disease patients", "Oncology support"],
    price: "From KES 2,000/hr",
    color: "teal",
    bg: "bg-teal-600",
    lightBg: "bg-teal-50",
    textColor: "text-teal-600",
    borderColor: "border-teal-200",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    id: "emergency",
    title: "Emergency Response",
    subtitle: "24/7 rapid medical emergency assistance",
    desc: "When every second counts, our emergency response team is ready. Staffed by certified EMTs and emergency nurses, we provide rapid, life-saving interventions and coordinate seamlessly with hospitals.",
    features: [
      "24/7 round-the-clock availability",
      "Average response time under 30 minutes",
      "Advanced Cardiac Life Support (ACLS)",
      "Basic and Advanced Life Support (BLS/ALS)",
      "Trauma assessment and stabilization",
      "Oxygen therapy and airway management",
      "Real-time coordination with hospitals",
      "Follow-up care post-emergency",
    ],
    suitable: ["Cardiac emergencies", "Breathing difficulties", "Accidents & falls", "Stroke symptoms"],
    price: "From KES 2,500",
    color: "red",
    bg: "bg-red-600",
    lightBg: "bg-red-50",
    textColor: "text-red-600",
    borderColor: "border-red-200",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    id: "physiotherapy",
    title: "Physiotherapy",
    subtitle: "Rehabilitation and pain management at home",
    desc: "Our certified physiotherapists deliver evidence-based rehabilitation programs at your home, helping you recover faster from injuries, surgeries, and neurological conditions.",
    features: [
      "Musculoskeletal physiotherapy",
      "Post-surgical rehabilitation",
      "Stroke and neurological rehabilitation",
      "Chronic pain management",
      "Manual therapy techniques",
      "Exercise prescription and guidance",
      "Gait training and balance therapy",
      "Electrotherapy (TENS, ultrasound)",
    ],
    suitable: ["Sports injuries", "Knee/hip replacement", "Stroke recovery", "Chronic back pain"],
    price: "From KES 2,200/hr",
    color: "orange",
    bg: "bg-orange-500",
    lightBg: "bg-orange-50",
    textColor: "text-orange-600",
    borderColor: "border-orange-200",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "pediatric",
    title: "Pediatric Care",
    subtitle: "Specialist child healthcare at home",
    desc: "Our pediatric nurses are specially trained in child health, development, and family-centered care. They bring warmth, patience, and clinical expertise to every visit.",
    features: [
      "Newborn care and assessment",
      "Child vaccination and immunization",
      "Growth and developmental monitoring",
      "Pediatric wound care",
      "Fever management and assessment",
      "Nutrition counseling for children",
      "Chronic childhood illness support",
      "Parent education and training",
    ],
    suitable: ["Newborns & infants", "Sick children", "Developmental monitoring", "Post-neonatal care"],
    price: "From KES 1,800/hr",
    color: "purple",
    bg: "bg-purple-600",
    lightBg: "bg-purple-50",
    textColor: "text-purple-600",
    borderColor: "border-purple-200",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    id: "maternal",
    title: "Maternal & Newborn Care",
    subtitle: "Antenatal, postnatal & midwifery services",
    desc: "Our registered midwives and maternal health nurses provide comprehensive support throughout pregnancy, birth preparation, and the critical postnatal period.",
    features: [
      "Antenatal monitoring and check-ups",
      "Birth plan counseling",
      "Postnatal mother and baby assessment",
      "Breastfeeding support and lactation counseling",
      "Newborn care education",
      "Perineal wound care",
      "Postnatal mental health monitoring",
      "Baby bath and cord care demonstrations",
    ],
    suitable: ["Expectant mothers", "New mothers (0–6 weeks)", "Newborns", "High-risk pregnancies"],
    price: "From KES 1,900/hr",
    color: "pink",
    bg: "bg-pink-500",
    lightBg: "bg-pink-50",
    textColor: "text-pink-600",
    borderColor: "border-pink-200",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export default function ServicesPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 to-blue-900 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-blue-800/50 border border-blue-700 text-blue-200 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
            Our Services
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5">
            Every Healthcare Need, Covered
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            From routine home care to life-saving emergency response — our network of verified professionals covers the full spectrum of home healthcare.
          </p>
        </div>
      </div>

      {/* Services list */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        {services.map((svc, i) => (
          <div
            key={svc.id}
            id={svc.id}
            className={`grid grid-cols-1 lg:grid-cols-5 gap-8 items-start bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
          >
            {/* Color banner */}
            <div className={`lg:col-span-2 ${svc.bg} p-10 flex flex-col items-center justify-center text-white min-h-[220px]`}>
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-5">
                <div className="text-white">{svc.icon}</div>
              </div>
              <h2 className="text-2xl font-bold text-center">{svc.title}</h2>
              <p className="text-white/70 text-sm text-center mt-2">{svc.subtitle}</p>
              <div className="mt-6 bg-white/20 rounded-xl px-5 py-2">
                <p className="text-white font-bold text-lg">{svc.price}</p>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3 p-8">
              <p className="text-slate-600 leading-relaxed mb-6">{svc.desc}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-3">What&apos;s Included</h3>
                  <ul className="space-y-2">
                    {svc.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${svc.textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-3">Suitable For</h3>
                  <ul className="space-y-2">
                    {svc.suitable.map((s) => (
                      <li key={s} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${svc.lightBg} ${svc.textColor} mr-2 mb-2`}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link
                href="/providers"
                className={`inline-flex items-center gap-2 ${svc.bg} hover:opacity-90 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm`}
              >
                Book This Service
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-blue-600 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Not Sure Which Service You Need?</h2>
          <p className="text-blue-100 mb-8">Tell us your situation and we&apos;ll match you with the right professional within minutes.</p>
          <Link href="/auth/signup" className="bg-white hover:bg-blue-50 text-blue-700 font-bold px-8 py-4 rounded-2xl transition-colors shadow-xl inline-block">
            Get a Free Recommendation
          </Link>
        </div>
      </div>
    </div>
  );
}
