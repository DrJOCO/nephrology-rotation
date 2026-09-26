import type { CSSProperties } from "react";
import { T } from "../../data/constants";
import { CONSULT_SERVICES, CONSULT_SETTINGS, HOSPITAL_DAYS, type ConsultOption } from "../../data/consultFields";
import { useIsMobile } from "../../utils/helpers";
import type { ConsultService, ConsultSetting, HospitalDay } from "../../types";
import { inputLabel } from "./shared";

export interface ConsultDetails {
  setting?: ConsultSetting;
  service?: ConsultService;
  hospitalDay?: HospitalDay;
}

// Optional picklist details for a consult entry. Tapping the selected chip
// again clears it. Shared by the student Consults form and the admin
// seed-a-consult form so both can only ever store picklist values.
export function ConsultDetailPickers({ value, onChange, accent = T.brand, accentInk = T.brandInk }: {
  value: ConsultDetails;
  onChange: (next: ConsultDetails) => void;
  accent?: string;
  accentInk?: string;
}) {
  const isMobile = useIsMobile();

  const chipStyle = (selected: boolean): CSSProperties => ({
    padding: isMobile ? "8px 12px" : "6px 11px",
    minHeight: 34,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: selected ? 600 : 400,
    cursor: "pointer",
    background: selected ? accent : T.card,
    color: selected ? accentInk : T.sub,
    border: `1.5px solid ${selected ? accent : T.line}`,
  });

  function row<V extends string>(label: string, options: ConsultOption<V>[], current: V | undefined, set: (next: V | undefined) => void) {
    return (
      <div role="group" aria-label={label} style={{ marginBottom: 10 }}>
        <div style={inputLabel}>{label} <span style={{ textTransform: "none", fontWeight: 500, color: T.muted }}>(optional)</span></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {options.map(option => {
            const selected = current === option.value;
            return (
              <button key={option.value} type="button" aria-pressed={selected}
                onClick={() => set(selected ? undefined : option.value)}
                style={chipStyle(selected)}>
                {selected ? "✓ " : ""}{option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {row("Setting", CONSULT_SETTINGS, value.setting, setting => onChange({ ...value, setting }))}
      {row("Requesting service", CONSULT_SERVICES, value.service, service => onChange({ ...value, service }))}
      {row("Hospital day at consult", HOSPITAL_DAYS, value.hospitalDay, hospitalDay => onChange({ ...value, hospitalDay }))}
    </div>
  );
}

// Drops unset keys so stored entries never carry `setting: undefined` (the
// store strips undefined anyway, but this keeps content keys stable).
export function compactConsultDetails(details: ConsultDetails): ConsultDetails {
  const compact: ConsultDetails = {};
  if (details.setting) compact.setting = details.setting;
  if (details.service) compact.service = details.service;
  if (details.hospitalDay) compact.hospitalDay = details.hospitalDay;
  return compact;
}
