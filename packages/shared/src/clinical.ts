/**
 * Role-specific clinical documentation templates.
 *
 * A consultation's structured record is a { sectionKey: text } map; the template
 * for the provider's role determines which sections are shown and their labels.
 * Doctors document a WHO-aligned treatment sheet, nurses a nursing cardex, and
 * physiotherapists a SOAP-style assessment.
 */

export interface ClinicalSection {
  key: string;
  label: string;
  placeholder?: string;
}

export interface ClinicalTemplate {
  /** Full title, e.g. for a heading. */
  title: string;
  /** Short tab label, e.g. "Treatment sheet". */
  shortLabel: string;
  sections: ClinicalSection[];
}

/** Doctor — WHO-aligned clinical consultation / treatment sheet. */
const DOCTOR_TEMPLATE: ClinicalTemplate = {
  title: "Treatment Sheet",
  shortLabel: "Treatment sheet",
  sections: [
    { key: "presentingComplaint", label: "Presenting complaint", placeholder: "Chief complaint and its duration" },
    { key: "historyOfComplaint", label: "History of presenting complaint", placeholder: "Onset, course, severity, associated symptoms" },
    { key: "pastHistory", label: "Past medical & surgical history", placeholder: "Chronic illnesses, past admissions, surgeries" },
    { key: "medicationsAllergies", label: "Current medications & allergies", placeholder: "Regular drugs; known drug/other allergies" },
    { key: "examination", label: "Examination findings", placeholder: "Vitals (BP, HR, RR, Temp, SpO₂); general & systemic examination" },
    { key: "investigations", label: "Investigations", placeholder: "Tests requested and results" },
    { key: "diagnosis", label: "Diagnosis", placeholder: "Provisional and differential diagnoses (ICD where possible)" },
    { key: "treatmentPlan", label: "Treatment plan & management", placeholder: "Medications, procedures, referrals, health education" },
    { key: "followUp", label: "Follow-up / review", placeholder: "Review date and red-flag / return advice" },
  ],
};

/** Nurse — nursing cardex / care record. */
const NURSE_TEMPLATE: ClinicalTemplate = {
  title: "Nursing Cardex",
  shortLabel: "Cardex",
  sections: [
    { key: "nursingAssessment", label: "Nursing assessment", placeholder: "Presenting condition, consciousness, mobility, skin" },
    { key: "vitalSigns", label: "Vital signs", placeholder: "BP, HR, RR, Temp, SpO₂, pain score" },
    { key: "nursingDiagnosis", label: "Nursing diagnosis / problems", placeholder: "Actual and potential nursing problems" },
    { key: "carePlan", label: "Care plan & interventions", placeholder: "Planned nursing interventions and goals" },
    { key: "medicationsAdministered", label: "Medications administered", placeholder: "Drug, dose, route, time, administered by" },
    { key: "fluidBalance", label: "Intake / output (fluid balance)", placeholder: "Oral/IV intake; urine and other output" },
    { key: "nursingNotes", label: "Nursing notes / observations", placeholder: "Progress and response to care" },
    { key: "handover", label: "Handover / continuity", placeholder: "Outstanding tasks for the next shift" },
  ],
};

/** Physiotherapist — SOAP-style assessment. */
const PHYSIO_TEMPLATE: ClinicalTemplate = {
  title: "Physiotherapy Assessment",
  shortLabel: "Assessment",
  sections: [
    { key: "subjective", label: "Subjective", placeholder: "Patient's report, pain, functional limitations" },
    { key: "objective", label: "Objective", placeholder: "ROM, muscle strength, gait, posture, special tests" },
    { key: "assessment", label: "Assessment", placeholder: "Clinical impression and problem list" },
    { key: "treatmentGiven", label: "Treatment given", placeholder: "Modalities, manual therapy, exercises this session" },
    { key: "homeProgramme", label: "Home exercise programme", placeholder: "Prescribed home exercises and dosage" },
    { key: "plan", label: "Plan", placeholder: "Goals, treatment frequency, next session" },
  ],
};

/** Fallback for any other provider. */
const DEFAULT_TEMPLATE: ClinicalTemplate = {
  title: "Clinical Notes",
  shortLabel: "Notes",
  sections: [{ key: "notes", label: "Clinical notes", placeholder: "Document the consultation" }],
};

export const CLINICAL_TEMPLATES: Record<string, ClinicalTemplate> = {
  doctor: DOCTOR_TEMPLATE,
  nurse: NURSE_TEMPLATE,
  physio: PHYSIO_TEMPLATE,
};

/** Returns the clinical template for a provider role (default if unknown). */
export function clinicalTemplateFor(role: string | null | undefined): ClinicalTemplate {
  return (role && CLINICAL_TEMPLATES[role]) || DEFAULT_TEMPLATE;
}

/** A consultation's structured clinical record: section key → text. */
export type ClinicalRecord = Record<string, string>;

/** Renders a structured record to readable, labelled plain text (for summaries/history). */
export function renderClinicalRecord(role: string | null | undefined, record: ClinicalRecord): string {
  const tpl = clinicalTemplateFor(role);
  return tpl.sections
    .map((s) => ({ label: s.label, value: (record[s.key] ?? "").trim() }))
    .filter((s) => s.value.length > 0)
    .map((s) => `${s.label}:\n${s.value}`)
    .join("\n\n");
}
