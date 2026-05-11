import { useMemo, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, Calculator, Clipboard, Droplet, History, Microscope, Pill, RotateCcw, Scale } from "lucide-react";
import { T } from "../../data/constants";
import { useIsMobile } from "../../utils/helpers";
import {
  buildHyponatremiaAssessment,
  DEFAULT_HYPO_INPUTS,
  type HypoDuration,
  type HyponatremiaInputs,
  type HypoSymptomSeverity,
  type HypoVolumeStatus,
} from "../../utils/hyponatremiaTool";
import { Chip, EduDisclaimer, HeadlineMetric, inputLabel, inputStyle, Panel, Section } from "./shared";

type ArrayInputKey = "selectedTonicityFlags" | "selectedVolumeClues" | "selectedHistory" | "selectedDrugs" | "selectedOdsRisk";

interface Option<T extends string = string> {
  id: T;
  label: string;
  detail?: string;
}

const DURATION_OPTIONS: Option<HypoDuration>[] = [
  { id: "unknown", label: "Unknown" },
  { id: "acute_under_48", label: "Acute (<48 h)" },
  { id: "chronic_over_48", label: "Chronic (≥48 h)" },
];

const SEVERITY_OPTIONS: Option<HypoSymptomSeverity>[] = [
  { id: "asymptomatic", label: "Asymptomatic" },
  { id: "mild_mod", label: "Mild–moderate" },
  { id: "severe", label: "Severe (sz/coma/resp)" },
  { id: "intracranial", label: "Intracranial pathology" },
];

const VOLUME_OPTIONS: Option<HypoVolumeStatus>[] = [
  { id: "unknown", label: "Unknown" },
  { id: "hypovolemic", label: "Hypovolemic" },
  { id: "euvolemic", label: "Euvolemic" },
  { id: "hypervolemic", label: "Hypervolemic" },
];

const VOLUME_CLUE_OPTIONS: Option[] = [
  { id: "edema", label: "Peripheral edema" },
  { id: "ascites", label: "Ascites" },
  { id: "jvd", label: "Elevated JVP" },
  { id: "orthostasis", label: "Orthostasis" },
  { id: "dry_mucosa", label: "Dry mucous membranes / poor turgor" },
];

const TONICITY_FLAG_OPTIONS: Option[] = [
  { id: "lipemic", label: "Lipemic serum / hypertriglyceridemia" },
  { id: "plasma_dyscrasia", label: "Paraprotein / myeloma" },
  { id: "jaundice", label: "Obstructive jaundice (lipoprotein-X)" },
  { id: "mannitol_ivig", label: "Mannitol / glycerol / IVIG" },
  { id: "post_turp_hysteroscopy", label: "Recent TURP / hysteroscopy" },
  { id: "severe_azotemia", label: "Severe azotemia (urea raises measured osm)" },
];

const HISTORY_OPTIONS: Option[] = [
  { id: "heart_failure", label: "Heart failure" },
  { id: "cirrhosis", label: "Cirrhosis" },
  { id: "nephrotic", label: "Nephrotic syndrome" },
  { id: "malignancy_lung", label: "Lung malignancy (small-cell)" },
  { id: "malignancy_other", label: "Other malignancy" },
  { id: "pulmonary_disease", label: "Pulmonary disease (PNA, asthma, etc.)" },
  { id: "cns_event", label: "CNS event / disease" },
  { id: "sah_tbi", label: "Recent SAH / TBI" },
  { id: "post_op", label: "Recent surgery / post-op" },
  { id: "pain_nausea", label: "Pain / nausea / vomiting" },
  { id: "gi_losses", label: "Diarrhea / vomiting losses" },
  { id: "bleeding", label: "Bleeding / volume loss" },
  { id: "hypothyroid", label: "Hypothyroidism" },
  { id: "adrenal_insufficiency", label: "Primary adrenal insufficiency" },
  { id: "glucocorticoid_deficiency", label: "Secondary AI / glucocorticoid def." },
  { id: "primary_polydipsia", label: "Primary / psychogenic polydipsia" },
  { id: "self_induced_water", label: "Acute self-induced water loading" },
  { id: "exercise_associated", label: "Endurance exercise (marathon)" },
  { id: "low_solute_intake", label: "Low solute intake (beer, tea-and-toast)" },
  { id: "reset_osmostat", label: "Suspected reset osmostat" },
  { id: "hiv", label: "HIV infection" },
];

const DRUG_GROUPS: Array<{ label: string; options: Option[] }> = [
  {
    label: "Diuretic",
    options: [
      { id: "thiazide", label: "Thiazide / thiazide-type" },
      { id: "loop", label: "Loop diuretic" },
    ],
  },
  {
    label: "ADH-active / SIAD-prone",
    options: [
      { id: "ssri_snri", label: "SSRI / SNRI" },
      { id: "carbamazepine", label: "Carbamazepine / oxcarb" },
      { id: "antiepileptic", label: "Other antiepileptic" },
      { id: "antipsychotic", label: "Antipsychotic" },
      { id: "ddavp", label: "Desmopressin / vasopressin" },
      { id: "mdma", label: "MDMA / ecstasy" },
      { id: "cyclophosphamide", label: "Cyclophosphamide" },
      { id: "ppi", label: "PPI" },
    ],
  },
  {
    label: "Translational / non-hypotonic",
    options: [
      { id: "mannitol_ivig", label: "Mannitol / IVIG (sucrose)" },
    ],
  },
];

const ODS_RISK_OPTIONS: Option[] = [
  { id: "alcohol", label: "Alcohol use disorder" },
  { id: "malnutrition", label: "Malnutrition" },
  { id: "liver_disease", label: "Advanced liver disease" },
  { id: "hypoK", label: "Hypokalemia (K <3)" },
  { id: "hypoP", label: "Hypophosphatemia" },
];

function OptionGrid({ options, selectedIds, onToggle }: { options: Option[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {options.map((option) => (
        <Chip key={option.id} selected={selectedIds.includes(option.id)} onClick={() => onToggle(option.id)}>
          {option.label}
        </Chip>
      ))}
    </div>
  );
}

function OptionGroupGrid({ groups, selectedIds, onToggle }: { groups: Array<{ label: string; options: Option[] }>; selectedIds: string[]; onToggle: (id: string) => void }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {groups.map((group) => (
        <div key={group.label}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>{group.label}</div>
          <OptionGrid options={group.options} selectedIds={selectedIds} onToggle={onToggle} />
        </div>
      ))}
    </div>
  );
}

function SegmentedGroup<TVal extends string>({ options, value, onChange }: { options: Option<TVal>[]; value: TVal; onChange: (value: TVal) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {options.map((option) => (
        <Chip key={option.id} selected={value === option.id} onClick={() => onChange(option.id)}>
          {option.label}
        </Chip>
      ))}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  step = "0.1",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div>
      <label style={inputLabel}>{label}</label>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function ResultBadge({ tone, children }: { tone: "brand" | "success" | "warning" | "danger" | "info"; children: ReactNode }) {
  const tones = {
    brand: { bg: T.brandBg, text: T.brand },
    success: { bg: T.successBg, text: T.success },
    warning: { bg: T.warningBg, text: T.warning },
    danger: { bg: T.dangerBg, text: T.danger },
    info: { bg: T.infoBg, text: T.info },
  }[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", background: tones.bg, color: tones.text, borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function DifferentialSignalBadge({ signal }: { signal: string }) {
  if (signal === "High") return <ResultBadge tone="danger">{signal}</ResultBadge>;
  if (signal === "Moderate") return <ResultBadge tone="warning">{signal}</ResultBadge>;
  return <ResultBadge tone="info">{signal}</ResultBadge>;
}

export default function HyponatremiaToolView({ onBack }: { onBack: () => void }) {
  const isMobile = useIsMobile(960);
  const [inputs, setInputs] = useState<HyponatremiaInputs>(DEFAULT_HYPO_INPUTS);
  const [copied, setCopied] = useState(false);
  const assessment = useMemo(() => buildHyponatremiaAssessment(inputs), [inputs]);

  const updateField = <K extends keyof HyponatremiaInputs>(key: K, value: HyponatremiaInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArray = (key: ArrayInputKey, id: string) => {
    setInputs((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      };
    });
  };

  const copyAssessment = async () => {
    const topDiffs = assessment.differentials.slice(0, 5).map((item, index) => {
      const support = item.supports.slice(0, 3).join("; ");
      return `${index + 1}. ${item.title} (${item.signal}) — ${support}`;
    });
    const lines = [
      assessment.summary,
      assessment.correctedNa.correctedKatz !== null
        ? `Corrected Na (Katz/Hillier): ${assessment.correctedNa.correctedKatz.toFixed(1)} / ${(assessment.correctedNa.correctedHillier ?? 0).toFixed(1)}`
        : "",
      assessment.effectiveOsm.value !== null ? `Effective osm ~${assessment.effectiveOsm.value.toFixed(0)}` : "",
      assessment.feUricAcid.value !== null ? assessment.feUricAcid.label : "",
      `Correction cap: ${assessment.correctionTarget.perDayCap} mEq/L per 24h${assessment.correctionTarget.highOdsRisk ? " (HIGH ODS RISK)" : ""}`,
      "",
      "Alerts:",
      ...assessment.alerts.map((a) => `- ${a}`),
      "",
      "Differential:",
      ...topDiffs,
      "",
      "Next checks:",
      ...assessment.nextSteps.map((step) => `- ${step}`),
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const breadcrumb = (
    <button
      type="button"
      onClick={onBack}
      style={{ background: "none", border: "none", padding: 0, color: T.muted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, cursor: "pointer" }}
    >
      {"←"} Tools / Hyponatremia
    </button>
  );

  const resetAction = (
    <button
      type="button"
      onClick={() => setInputs(DEFAULT_HYPO_INPUTS)}
      title="Reset"
      aria-label="Reset hyponatremia tool"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, padding: "8px 11px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface2, color: T.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
    >
      <RotateCcw size={15} strokeWidth={2} aria-hidden="true" />
      Reset
    </button>
  );

  const tonalityTone =
    assessment.effectiveOsm.classification === "hypotonic"
      ? "info"
      : assessment.effectiveOsm.classification === "hypertonic"
        ? "warning"
        : assessment.effectiveOsm.classification === "isotonic"
          ? "success"
          : "info";

  return (
    <div style={{ padding: 16 }}>
      <Section
        eyebrow={breadcrumb}
        title="Hyponatremia Tool"
        description="UpToDate-style algorithm: tonicity → impaired water excretion (GFR, thiazide, edematous state) → volume status with urine indices. Plus correction-rate caps, ODS risk, and Adrogue–Madias estimates."
        action={resetAction}
      />

      {isMobile && (
        <Panel title="Live differential" tone="info">
          <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5 }}>{assessment.summary}</div>
          <a href="#hypona-results" style={{ display: "inline-flex", marginTop: 8, color: T.brand, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            View full differential
          </a>
        </Panel>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(380px, 0.95fr)", gap: 14, alignItems: "start" }}>
        <div>
          {/* Sodium / tonicity */}
          <Panel icon={Droplet} title="Sodium & Tonicity">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
              <NumberInput label="Serum Na" value={inputs.serumNa} placeholder="125" step="1" onChange={(value) => updateField("serumNa", value)} />
              <NumberInput label="Glucose" value={inputs.serumGlucose} placeholder="100" step="1" onChange={(value) => updateField("serumGlucose", value)} />
              <NumberInput label="Measured osm" value={inputs.measuredOsm} placeholder="optional" step="1" onChange={(value) => updateField("measuredOsm", value)} />
              <NumberInput label="Weight (kg)" value={inputs.weightKg} placeholder="for fluids" step="1" onChange={(value) => updateField("weightKg", value)} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <ResultBadge tone={tonalityTone}>
                {assessment.effectiveOsm.classification === "hypotonic" && "Hypotonic"}
                {assessment.effectiveOsm.classification === "isotonic" && "Isotonic"}
                {assessment.effectiveOsm.classification === "hypertonic" && "Hypertonic"}
                {assessment.effectiveOsm.classification === "indeterminate" && "Tonicity TBD"}
              </ResultBadge>
              {assessment.effectiveOsm.value !== null && (
                <ResultBadge tone="info">Effective osm ~{assessment.effectiveOsm.value.toFixed(0)}</ResultBadge>
              )}
              {assessment.correctedNa.correctedKatz !== null && (
                <ResultBadge tone="warning">
                  Corrected Na {assessment.correctedNa.correctedKatz.toFixed(1)} / {assessment.correctedNa.correctedHillier?.toFixed(1)}
                </ResultBadge>
              )}
              {assessment.effectiveOsm.osmolarGap !== null && Math.abs(assessment.effectiveOsm.osmolarGap) > 10 && (
                <ResultBadge tone="warning">Osmolar gap {assessment.effectiveOsm.osmolarGap.toFixed(0)} — unmeasured osmole?</ResultBadge>
              )}
            </div>
            <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5, marginBottom: 12, fontFamily: T.serif, fontStyle: "italic" }}>
              {assessment.effectiveOsm.note}
            </div>
            <label style={inputLabel}>Non-hypotonic flags</label>
            <OptionGrid
              options={TONICITY_FLAG_OPTIONS}
              selectedIds={inputs.selectedTonicityFlags}
              onToggle={(id) => toggleArray("selectedTonicityFlags", id)}
            />
          </Panel>

          {/* Acuity / symptoms */}
          <Panel icon={AlertTriangle} title="Acuity & Symptoms">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <div>
                <label style={inputLabel}>Duration</label>
                <SegmentedGroup options={DURATION_OPTIONS} value={inputs.duration} onChange={(value) => updateField("duration", value)} />
              </div>
              <div>
                <label style={inputLabel}>Symptom severity</label>
                <SegmentedGroup options={SEVERITY_OPTIONS} value={inputs.symptomSeverity} onChange={(value) => updateField("symptomSeverity", value)} />
              </div>
            </div>
            <div style={{ marginTop: 12, color: T.sub, fontSize: 12.5, lineHeight: 1.5 }}>
              UpToDate: severe symptoms (seizure, obtundation, coma, respiratory arrest) or known intracranial pathology → 100 mL bolus 3% saline, may repeat ×2 (300 mL total) over 30 min.
            </div>
          </Panel>

          {/* Volume status */}
          <Panel icon={Scale} title="Volume Status">
            <div style={{ marginBottom: 12 }}>
              <label style={inputLabel}>Clinician assessment</label>
              <SegmentedGroup options={VOLUME_OPTIONS} value={inputs.volumeStatus} onChange={(value) => updateField("volumeStatus", value)} />
            </div>
            <label style={inputLabel}>Exam clues</label>
            <OptionGrid options={VOLUME_CLUE_OPTIONS} selectedIds={inputs.selectedVolumeClues} onToggle={(id) => toggleArray("selectedVolumeClues", id)} />
          </Panel>

          {/* History / context */}
          <Panel icon={History} title="History & Context">
            <OptionGrid options={HISTORY_OPTIONS} selectedIds={inputs.selectedHistory} onToggle={(id) => toggleArray("selectedHistory", id)} />
          </Panel>

          {/* Drugs */}
          <Panel icon={Pill} title="Medications">
            <OptionGroupGrid groups={DRUG_GROUPS} selectedIds={inputs.selectedDrugs} onToggle={(id) => toggleArray("selectedDrugs", id)} />
          </Panel>

          {/* Renal / urine */}
          <Panel icon={Microscope} title="Renal Function & Urine">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
              <NumberInput label="Serum Cr" value={inputs.serumCr} placeholder="mg/dL" onChange={(value) => updateField("serumCr", value)} />
              <NumberInput label="BUN" value={inputs.serumBun} placeholder="mg/dL" step="1" onChange={(value) => updateField("serumBun", value)} />
              <NumberInput label="Urine osm" value={inputs.urineOsm} placeholder="mOsm/kg" step="1" onChange={(value) => updateField("urineOsm", value)} />
              <NumberInput label="Urine Na" value={inputs.urineNa} placeholder="mEq/L" step="1" onChange={(value) => updateField("urineNa", value)} />
              <NumberInput label="Urine K" value={inputs.urineK} placeholder="mEq/L" step="1" onChange={(value) => updateField("urineK", value)} />
              <NumberInput label="Urine Cr" value={inputs.urineCr} placeholder="mg/dL" step="1" onChange={(value) => updateField("urineCr", value)} />
              <NumberInput label="Urine UN" value={inputs.urineUreaNitrogen} placeholder="mg/dL" step="1" onChange={(value) => updateField("urineUreaNitrogen", value)} />
              <NumberInput label="Serum uric acid" value={inputs.serumUricAcid} placeholder="mg/dL" onChange={(value) => updateField("serumUricAcid", value)} />
              <NumberInput label="Urine uric acid" value={inputs.urineUricAcid} placeholder="mg/dL" onChange={(value) => updateField("urineUricAcid", value)} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {assessment.feUricAcid.value !== null && (
                <ResultBadge tone={assessment.feUricAcid.value > 12 ? "warning" : assessment.feUricAcid.value < 8 ? "success" : "info"}>
                  {assessment.feUricAcid.label}
                </ResultBadge>
              )}
              {assessment.estimatedDailySolute.value !== null && (
                <ResultBadge tone={assessment.estimatedDailySolute.value < 150 ? "warning" : "info"}>
                  Est. urea ~{assessment.estimatedDailySolute.value.toFixed(0)} mmol/d
                </ResultBadge>
              )}
            </div>
            <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, fontFamily: T.mono }}>
              FEUA = (UUA × SCr) / (SUA × UCr) × 100. UpToDate: FEUA &lt;8% essentially excludes SIAD; &gt;10–12% supports it.
            </div>
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dotted ${T.line}` }}>
              <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.5 }}>{assessment.feUricAcid.interpretation}</div>
              <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>{assessment.estimatedDailySolute.note}</div>
            </div>
          </Panel>

          {/* K / HCO3 */}
          <Panel icon={Activity} title="K / HCO3 Patterns">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 8 }}>
              <NumberInput label="Serum K" value={inputs.serumK} placeholder="mEq/L" onChange={(value) => updateField("serumK", value)} />
              <NumberInput label="Serum HCO3" value={inputs.serumBicarb} placeholder="mEq/L" step="1" onChange={(value) => updateField("serumBicarb", value)} />
            </div>
            <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.5 }}>
              ↓K + ↑HCO3 → diuretic / vomiting · ↓K + ↓HCO3 → diarrhea · ↑K + ↓HCO3 → primary AI.
            </div>
          </Panel>

          {/* ODS risk */}
          <Panel icon={AlertTriangle} title="ODS Risk Modifiers">
            <OptionGrid options={ODS_RISK_OPTIONS} selectedIds={inputs.selectedOdsRisk} onToggle={(id) => toggleArray("selectedOdsRisk", id)} />
            <div style={{ marginTop: 10, color: T.sub, fontSize: 12.5, lineHeight: 1.5 }}>
              UpToDate high-risk groups: Na ≤105, hypoK, alcohol use disorder, malnutrition, advanced liver disease, hypophosphatemia. Cap at 8 mEq/L per 24 h.
            </div>
          </Panel>
        </div>

        {/* Right column — results */}
        <aside id="hypona-results" style={{ position: isMobile ? "static" : "sticky", top: 70 }}>
          <Panel
            icon={Calculator}
            title="Generated Differential"
            action={(
              <button
                type="button"
                onClick={() => void copyAssessment()}
                title="Copy assessment"
                aria-label="Copy hyponatremia assessment"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: 34, padding: "7px 9px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface2, color: T.brand, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
              >
                <Clipboard size={14} strokeWidth={2} aria-hidden="true" />
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          >
            <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>{assessment.summary}</div>

            {assessment.alerts.length > 0 && (
              <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <div style={{ color: T.danger, fontWeight: 600, fontSize: 13, marginBottom: 5 }}>High-risk signals</div>
                {assessment.alerts.map((alert) => (
                  <div key={alert} style={{ color: T.text, fontSize: 13, lineHeight: 1.45, marginBottom: 4 }}>{alert}</div>
                ))}
              </div>
            )}

            {assessment.differentials.length === 0 ? (
              <div style={{ background: T.surface2, border: `1px dashed ${T.line}`, borderRadius: 8, padding: 14, color: T.sub, fontSize: 13, lineHeight: 1.5 }}>
                Add Na, glucose, urine osm/Na, volume status, drugs, and history to generate a ranked differential.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 9 }}>
                {assessment.differentials.map((item, index) => (
                  <div key={item.id} style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, background: T.surface }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: T.navy, fontSize: 13, lineHeight: 1.35 }}>
                          <span style={{ fontWeight: 700 }}>{index + 1}.</span> <span style={{ fontWeight: 600 }}>{item.title}</span>
                        </div>
                        <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{item.bucket}</div>
                      </div>
                      <DifferentialSignalBadge signal={item.signal} />
                    </div>
                    <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.45 }}>
                      {item.supports.slice(0, 4).map((support) => (
                        <div key={support} style={{ marginBottom: 3 }}>{support}</div>
                      ))}
                    </div>
                    {item.next.length > 0 && (
                      <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 8, paddingTop: 8 }}>
                        {item.next.slice(0, 2).map((step) => (
                          <div key={step} style={{ color: T.text, fontSize: 12.5, lineHeight: 1.45, marginBottom: 3 }}>{step}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Correction planner */}
          <Panel icon={Calculator} title="Correction Planner">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, auto) minmax(0, 1fr)", gap: 12, alignItems: "start", marginBottom: 10 }}>
              <HeadlineMetric
                value={`${assessment.correctionTarget.perDayCap}`}
                unit="mEq/L/24h cap"
                caption={assessment.correctionTarget.highOdsRisk ? "High ODS risk" : "Standard cap"}
                tone={assessment.correctionTarget.highOdsRisk ? "warning" : "info"}
                variant="compact"
              />
              <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5 }}>
                Target ~4–6 mEq/L rise in the first 24 h to relieve severe symptoms. Then keep total under the cap. Most ODS cases occurred with &gt;10–12 mEq/L in 24 h or &gt;18 mEq/L in 48 h.
              </div>
            </div>
            {assessment.correctionTarget.reasons.length > 0 && (
              <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 8, marginBottom: 10 }}>
                {assessment.correctionTarget.reasons.map((r) => (
                  <div key={r} style={{ color: T.text, fontSize: 12.5, lineHeight: 1.45, marginBottom: 4 }}>{r}</div>
                ))}
              </div>
            )}
            <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
                Adrogue–Madias (ΔNa per 1 L)
              </div>
              {assessment.adrogueMadias[0]?.changePerLiter === null ? (
                <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.5 }}>
                  Enter serum Na and weight to compute fluid effects.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {assessment.adrogueMadias.map((row) => (
                    <div key={row.fluidId} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, color: T.text }}>
                      <span style={{ color: T.sub }}>{row.label}</span>
                      <span style={{ fontFamily: T.mono }}>
                        {row.changePerLiter !== null ? `${row.changePerLiter > 0 ? "+" : ""}${row.changePerLiter.toFixed(2)} mEq/L` : "—"}
                        {row.litersForTarget !== null && row.changePerLiter !== null && row.changePerLiter > 0 && (
                          <span style={{ color: T.muted, marginLeft: 8 }}>({row.litersForTarget.toFixed(2)} L → +4)</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 8, color: T.muted, fontSize: 11.5, fontFamily: T.mono }}>
                ΔNa/L = (fluidNa + fluidK − serumNa) / (TBW + 1); TBW ≈ weight × 0.6.
              </div>
            </div>
          </Panel>

          <Panel title="Next checks">
            {assessment.nextSteps.map((step) => (
              <div key={step} style={{ color: T.text, fontSize: 13, lineHeight: 1.45, marginBottom: 6 }}>{step}</div>
            ))}
            <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
              Algorithm follows UpToDate "Diagnostic evaluation of adults with hyponatremia" and "Overview of the treatment of hyponatremia in adults". Reasoning aid, not a diagnosis.
            </div>
          </Panel>
        </aside>
      </div>

      <EduDisclaimer />
    </div>
  );
}
