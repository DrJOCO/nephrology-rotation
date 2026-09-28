import type { ConsultService, ConsultSetting, HospitalDay } from "../types";

// Picklist-only consult details (D1 de-identification). Values are what is
// stored; labels are display-only and can be reworded freely. Removing or
// renaming a VALUE drops it from stored entries on next load (see
// toDeidentifiedPatient), so only ever add values.

export interface ConsultOption<V extends string> {
  value: V;
  label: string;
}

export const CONSULT_SETTINGS: ConsultOption<ConsultSetting>[] = [
  { value: "ed", label: "ED" },
  { value: "floor", label: "Floor" },
  { value: "stepdown", label: "Step-down" },
  { value: "icu", label: "ICU" },
];

export const CONSULT_SERVICES: ConsultOption<ConsultService>[] = [
  { value: "medicine", label: "Medicine" },
  { value: "critical-care", label: "Critical care" },
  { value: "cardiology", label: "Cardiology" },
  { value: "surgery", label: "Surgery" },
  { value: "oncology", label: "Oncology" },
  { value: "transplant", label: "Transplant" },
  { value: "ob", label: "OB" },
  { value: "other", label: "Other" },
];

// Bucketed rather than an exact day so the log never pins down an admission
// date.
export const HOSPITAL_DAYS: ConsultOption<HospitalDay>[] = [
  { value: "0-1", label: "Day 0–1" },
  { value: "2-3", label: "Day 2–3" },
  { value: "4-7", label: "Day 4–7" },
  { value: "8+", label: "Day 8+" },
];

function labelFor<V extends string>(options: ConsultOption<V>[], value: V | undefined): string | null {
  if (!value) return null;
  return options.find(option => option.value === value)?.label ?? null;
}

export const consultSettingLabel = (value: ConsultSetting | undefined) => labelFor(CONSULT_SETTINGS, value);
export const consultServiceLabel = (value: ConsultService | undefined) => labelFor(CONSULT_SERVICES, value);
export const hospitalDayLabel = (value: HospitalDay | undefined) => labelFor(HOSPITAL_DAYS, value);

// "ICU · Cardiology · Day 2–3" — only the details that were picked.
export function consultDetailLabels(entry: { setting?: ConsultSetting; service?: ConsultService; hospitalDay?: HospitalDay }): string[] {
  return [
    consultSettingLabel(entry.setting),
    consultServiceLabel(entry.service),
    hospitalDayLabel(entry.hospitalDay),
  ].filter((label): label is string => !!label);
}
