import { useMemo, useState, type ReactNode } from "react";
import { Activity, Calculator, Clipboard, History, Microscope, Pill, RotateCcw, ScanSearch } from "lucide-react";
import { T } from "../../data/constants";
import { useIsMobile } from "../../utils/helpers";
import {
  buildAkiAssessment,
  DEFAULT_AKI_INPUTS,
  type AkiBpPattern,
  type FractionalExcretionResult,
  type AkiToolInputs,
  type AkiUaGrade,
  type AkiUopStatus,
  type AkiRbcStatus,
  type AkiWbcStatus,
} from "../../utils/akiTool";
import { Chip, EduDisclaimer, HeadlineMetric, inputLabel, inputStyle, Panel, Section } from "./shared";

type ArrayInputKey = "selectedHistory" | "selectedContext" | "selectedNephrotoxins" | "selectedSediment";

interface Option<T extends string = string> {
  id: T;
  label: string;
  detail?: string;
}

const BP_OPTIONS: Option<AkiBpPattern>[] = [
  { id: "not_recorded", label: "Not recorded" },
  { id: "stable", label: "Stable" },
  { id: "low_normal", label: "Low-normal" },
  { id: "hypotension", label: "Hypotension" },
  { id: "shock", label: "Shock/pressors" },
  { id: "hypertensive", label: "Severe HTN" },
];

const UOP_OPTIONS: Option<AkiUopStatus>[] = [
  { id: "not_recorded", label: "Not recorded" },
  { id: "normal", label: ">0.5 mL/kg/hr" },
  { id: "low_6_12", label: "<0.5 x 6-12 hr" },
  { id: "low_12", label: "<0.5 x >=12 hr" },
  { id: "very_low_24", label: "<0.3 x >=24 hr" },
  { id: "anuria", label: "Anuria" },
];

const HISTORY_OPTIONS: Option[] = [
  { id: "known_ckd", label: "Known CKD" },
  { id: "dm2", label: "DM2" },
  { id: "htn", label: "HTN" },
  { id: "albuminuria", label: "Baseline albuminuria/proteinuria" },
  { id: "vascular_disease", label: "CAD/PAD/atherosclerosis" },
  { id: "mgus_myeloma", label: "MGUS/myeloma history" },
  { id: "transplant", label: "Kidney transplant" },
];

const CONTEXT_OPTIONS: Option[] = [
  { id: "low_po", label: "Low PO intake" },
  { id: "gi_losses", label: "Diarrhea/vomiting" },
  { id: "sepsis_infection", label: "Sepsis/infection" },
  { id: "sepsis_shock", label: "Shock/pressors" },
  { id: "bleeding", label: "Bleeding/volume loss" },
  { id: "heart_failure", label: "Heart failure/congestion" },
  { id: "cirrhosis", label: "Cirrhosis/ascites" },
  { id: "surgery_icu", label: "Recent surgery/ICU" },
  { id: "rhabdo_ck", label: "Rhabdo/high CK" },
  { id: "tls_crystal", label: "TLS/crystal risk" },
  { id: "obstruction_risk", label: "BPH/retention risk" },
  { id: "recent_cath_vascular", label: "Recent cath/vascular procedure" },
  { id: "athero_clues", label: "Livedo/blue toes/eosinophilia" },
  { id: "myeloma_clues", label: "Anemia/Ca/protein gap" },
  { id: "rash_fever_eos", label: "Rash/fever/eosinophilia" },
  { id: "pulmonary_renal", label: "Pulmonary-renal concern" },
  { id: "tma_hemolysis", label: "TMA/hemolysis concern" },
];

const NEPHROTOXIN_GROUPS: Array<{ label: string; options: Option[] }> = [
  {
    label: "Hemodynamic",
    options: [
      { id: "nsaid", label: "NSAID" },
      { id: "ace_arb", label: "ACEi/ARB/MRA" },
      { id: "diuretics", label: "Diuretics" },
      { id: "sglt2i", label: "SGLT2 inhibitor" },
      { id: "calcineurin", label: "Tacrolimus/cyclosporine" },
    ],
  },
  {
    label: "Tubular / crystal",
    options: [
      { id: "contrast", label: "Iodinated contrast" },
      { id: "vancomycin", label: "Vancomycin" },
      { id: "aminoglycoside", label: "Aminoglycoside" },
      { id: "amphotericin", label: "Amphotericin" },
      { id: "chemo", label: "Cisplatin/chemo" },
      { id: "acyclovir_tenofovir", label: "Acyclovir/tenofovir" },
    ],
  },
  {
    label: "AIN-prone",
    options: [
      { id: "ppi", label: "PPI" },
      { id: "beta_lactam", label: "Beta-lactam/FQ" },
      { id: "tmp_smx", label: "TMP-SMX" },
      { id: "checkpoint", label: "Checkpoint inhibitor" },
    ],
  },
];

const UA_GRADE_OPTIONS: Option<AkiUaGrade>[] = [
  { id: "not_checked", label: "Not checked" },
  { id: "negative", label: "Neg/trace" },
  { id: "trace_1", label: "1+" },
  { id: "two_plus", label: "2+" },
  { id: "three_plus", label: "3+/4+" },
  { id: "nephrotic", label: "Nephrotic range" },
];

const BLOOD_GRADE_OPTIONS: Option<AkiUaGrade>[] = UA_GRADE_OPTIONS.filter((item) => item.id !== "nephrotic");

const RBC_OPTIONS: Option<AkiRbcStatus>[] = [
  { id: "not_checked", label: "Not checked" },
  { id: "none", label: "0-2/hpf" },
  { id: "few", label: "3-10/hpf" },
  { id: "many", label: ">10/hpf" },
  { id: "dysmorphic", label: "Dysmorphic RBCs" },
];

const WBC_OPTIONS: Option<AkiWbcStatus>[] = [
  { id: "not_checked", label: "Not checked" },
  { id: "none", label: "None" },
  { id: "pyuria", label: "Pyuria" },
  { id: "wbc_casts", label: "WBC casts" },
];

const SEDIMENT_OPTIONS: Option[] = [
  { id: "bland", label: "Bland sediment" },
  { id: "muddy_casts", label: "Muddy/granular casts" },
  { id: "rbc_casts", label: "RBC casts" },
  { id: "wbc_casts", label: "WBC casts" },
  { id: "eosinophils", label: "Urine eosinophils" },
  { id: "heme_no_rbc", label: "Heme+ with few RBCs" },
  { id: "crystals", label: "Crystals" },
];

const IMAGING_OPTIONS: Option[] = [
  { id: "not_done", label: "Not done" },
  { id: "no_hydro", label: "No hydronephrosis" },
  { id: "hydro", label: "Hydronephrosis" },
  { id: "retention", label: "Bladder retention/Foley issue" },
  { id: "stones", label: "Stone(s)" },
  { id: "cortical_thinning", label: "Cortical thinning" },
  { id: "small_echogenic", label: "Small echogenic kidneys" },
  { id: "single_kidney", label: "Solitary kidney" },
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

function SegmentedGroup<T extends string>({ options, value, onChange }: { options: Option<T>[]; value: T; onChange: (value: T) => void }) {
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

function IndexPanel({
  result,
  formula,
  getTone,
}: {
  result: FractionalExcretionResult;
  formula: string;
  getTone: (value: number | null) => "success" | "warning" | "info";
}) {
  return (
    <div style={{ background: T.surface2, borderRadius: 8, border: `1px solid ${T.line}`, padding: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, auto) minmax(0, 1fr)", gap: 12, alignItems: "start" }}>
        <HeadlineMetric
          value={result.value !== null ? result.value.toFixed(1) : null}
          unit={result.value !== null ? "%" : undefined}
          caption={result.label}
          tone={getTone(result.value)}
          variant="compact"
        />
        <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5, fontFamily: T.serif, fontStyle: "italic" }}>
          {result.interpretation}
        </div>
      </div>
      <div style={{ borderTop: `1px dotted ${T.line}`, marginTop: 10, paddingTop: 8, color: T.muted, fontSize: 11, fontFamily: T.mono }}>
        {formula}
      </div>
    </div>
  );
}

export default function AkiToolView({ onBack, onOpenCalculator }: { onBack: () => void; onOpenCalculator?: (id: "fena" | "feurea") => void }) {
  const isMobile = useIsMobile(960);
  const [inputs, setInputs] = useState<AkiToolInputs>(DEFAULT_AKI_INPUTS);
  const [copied, setCopied] = useState(false);
  const assessment = useMemo(() => buildAkiAssessment(inputs), [inputs]);

  const updateField = <K extends keyof AkiToolInputs>(key: K, value: AkiToolInputs[K]) => {
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

  const toggleImaging = (id: string) => {
    setInputs((prev) => {
      if (id === "not_done") {
        return { ...prev, selectedImaging: prev.selectedImaging.includes(id) ? [] : ["not_done"] };
      }
      let next = prev.selectedImaging.includes(id)
        ? prev.selectedImaging.filter((item) => item !== id)
        : [...prev.selectedImaging.filter((item) => item !== "not_done"), id];
      if (id === "hydro") next = next.filter((item) => item !== "no_hydro");
      if (id === "no_hydro") next = next.filter((item) => item !== "hydro");
      return { ...prev, selectedImaging: next.length ? next : ["not_done"] };
    });
  };

  const copyAssessment = async () => {
    const topDiffs = assessment.differentials.slice(0, 5).map((item, index) => {
      const support = item.supports.slice(0, 3).join("; ");
      return `${index + 1}. ${item.title} (${item.signal}) - ${support}`;
    });
    const text = [
      assessment.summary,
      assessment.fena.value !== null ? assessment.fena.label : "",
      assessment.feurea.value !== null ? assessment.feurea.label : "",
      "",
      "Differential:",
      ...topDiffs,
      "",
      "Next checks:",
      ...assessment.nextSteps.map((step) => `- ${step}`),
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const creatinineTone = assessment.stage.overallStage === 3 ? "danger" : assessment.stage.overallStage ? "warning" : "info";
  const showDiureticCaveat = inputs.selectedNephrotoxins.includes("diuretics") && assessment.fena.value !== null;

  const breadcrumb = (
    <button
      type="button"
      onClick={onBack}
      style={{ background: "none", border: "none", padding: 0, color: T.muted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, cursor: "pointer" }}
    >
      {"\u2190"} Tools / AKI Differential
    </button>
  );

  const resetAction = (
    <button
      type="button"
      onClick={() => setInputs(DEFAULT_AKI_INPUTS)}
      title="Reset"
      aria-label="Reset AKI tool"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, padding: "8px 11px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface2, color: T.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
    >
      <RotateCcw size={15} strokeWidth={2} aria-hidden="true" />
      Reset
    </button>
  );

  return (
    <div style={{ padding: 16 }}>
      <Section
        eyebrow={breadcrumb}
        title="AKI Differential Tool"
        description="Build a quick AKI problem representation from creatinine trend, UOP, exposures, urine findings, imaging, and urine indices."
        action={resetAction}
      />

      {isMobile && (
        <Panel title="Live differential" style={{ borderLeft: `4px solid ${T.info}` }}>
          <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5 }}>{assessment.summary}</div>
          <a href="#aki-results" style={{ display: "inline-flex", marginTop: 8, color: T.brand, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            View full differential
          </a>
        </Panel>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(380px, 0.95fr)", gap: 14, alignItems: "start" }}>
        <div>
          <Panel icon={Activity} title="Creatinine, BP, UOP">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <NumberInput label="Baseline Cr" value={inputs.baselineCr} placeholder="e.g. 1.0" onChange={(value) => updateField("baselineCr", value)} />
              <NumberInput label="Current Cr" value={inputs.currentCr} placeholder="e.g. 2.4" onChange={(value) => updateField("currentCr", value)} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <ResultBadge tone={creatinineTone}>{assessment.stage.label}</ResultBadge>
              {assessment.stage.delta !== null && <ResultBadge tone="info">Delta Cr {assessment.stage.delta.toFixed(2)}</ResultBadge>}
              {assessment.stage.ratio !== null && <ResultBadge tone="info">{assessment.stage.ratio.toFixed(1)}x baseline</ResultBadge>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <NumberInput label="Lowest SBP" value={inputs.bpMinSbp} placeholder="optional" step="1" onChange={(value) => updateField("bpMinSbp", value)} />
              <NumberInput label="Lowest MAP" value={inputs.bpMinMap} placeholder="optional" step="1" onChange={(value) => updateField("bpMinMap", value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={inputLabel}>BP pattern</label>
              <SegmentedGroup options={BP_OPTIONS} value={inputs.bpPattern} onChange={(value) => updateField("bpPattern", value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={inputLabel}>Urine output category (use when no 24-h total)</label>
              <SegmentedGroup options={UOP_OPTIONS} value={inputs.uop} onChange={(value) => updateField("uop", value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr", gap: 10, marginBottom: 8 }}>
              <NumberInput label="UOP over 24 h (mL)" value={inputs.uop24hVolumeMl} placeholder="e.g. 480" step="1" onChange={(value) => updateField("uop24hVolumeMl", value)} />
              <NumberInput label="Weight (kg)" value={inputs.weightKg} placeholder="e.g. 70" step="1" onChange={(value) => updateField("weightKg", value)} />
            </div>
            {(() => {
              const total = Number(inputs.uop24hVolumeMl);
              const wt = Number(inputs.weightKg);
              if (!Number.isFinite(total) || !Number.isFinite(wt) || wt <= 0 || inputs.uop24hVolumeMl === "" || inputs.weightKg === "") return null;
              const rate = total / wt / 24;
              const tone = rate < 0.3 || total === 0 ? "danger" : rate < 0.5 ? "warning" : "success";
              return (
                <div style={{ marginBottom: 12 }}>
                  <ResultBadge tone={tone}>
                    {total.toFixed(0)} mL / 24 h ≈ {rate.toFixed(2)} mL/kg/hr
                  </ResultBadge>
                </div>
              );
            })()}
            <div>
              <Chip selected={inputs.krtInitiated} onClick={() => updateField("krtInitiated", !inputs.krtInitiated)}>
                KRT / dialysis already initiated for this AKI
              </Chip>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                Per KDIGO, initiation of kidney replacement therapy classifies AKI as stage 3 regardless of Cr or UOP.
              </div>
            </div>
          </Panel>

          <Panel icon={History} title="Kidney History / Risk">
            <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.45, marginBottom: 10 }}>
              These modify risk and chronicity. DM2/HTN/CKD make AKI more likely and recovery less predictable, but usually are not the acute etiology by themselves.
            </div>
            <OptionGrid options={HISTORY_OPTIONS} selectedIds={inputs.selectedHistory} onToggle={(id) => toggleArray("selectedHistory", id)} />
          </Panel>

          <Panel icon={Clipboard} title="Admission Context">
            <OptionGrid options={CONTEXT_OPTIONS} selectedIds={inputs.selectedContext} onToggle={(id) => toggleArray("selectedContext", id)} />
          </Panel>

          <Panel icon={Pill} title="Nephrotoxins / Exposures">
            <OptionGroupGrid groups={NEPHROTOXIN_GROUPS} selectedIds={inputs.selectedNephrotoxins} onToggle={(id) => toggleArray("selectedNephrotoxins", id)} />
          </Panel>

          <Panel icon={Microscope} title="Urine Findings">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={inputLabel}>Protein</label>
                <SegmentedGroup options={UA_GRADE_OPTIONS} value={inputs.protein} onChange={(value) => updateField("protein", value)} />
              </div>
              <div>
                <label style={inputLabel}>Blood</label>
                <SegmentedGroup options={BLOOD_GRADE_OPTIONS} value={inputs.blood} onChange={(value) => updateField("blood", value)} />
              </div>
              <div>
                <label style={inputLabel}>RBCs</label>
                <SegmentedGroup options={RBC_OPTIONS} value={inputs.rbc} onChange={(value) => updateField("rbc", value)} />
              </div>
              <div>
                <label style={inputLabel}>WBCs</label>
                <SegmentedGroup options={WBC_OPTIONS} value={inputs.wbc} onChange={(value) => updateField("wbc", value)} />
              </div>
            </div>
            <label style={inputLabel}>Sediment clues</label>
            <OptionGrid options={SEDIMENT_OPTIONS} selectedIds={inputs.selectedSediment} onToggle={(id) => toggleArray("selectedSediment", id)} />
          </Panel>

          <Panel icon={ScanSearch} title="Renal Imaging">
            <OptionGrid options={IMAGING_OPTIONS} selectedIds={inputs.selectedImaging} onToggle={toggleImaging} />
          </Panel>

          <Panel
            icon={Calculator}
            title="Urine Electrolytes"
            action={onOpenCalculator && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => onOpenCalculator("fena")}
                    style={{ minHeight: 32, padding: "6px 9px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface2, color: T.brand, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Standalone FENa
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenCalculator("feurea")}
                    style={{ minHeight: 32, padding: "6px 9px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface2, color: T.brand, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Standalone FEUrea
                  </button>
                </div>
            )}
          >
            <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.45, marginBottom: 10 }}>
              These use the same formula helpers as the Quick Reference calculators, then feed the AKI differential.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
              <NumberInput label="Serum Na" value={inputs.serumNa} placeholder="140" onChange={(value) => updateField("serumNa", value)} />
              <NumberInput label="Urine Na" value={inputs.urineNa} placeholder="20" onChange={(value) => updateField("urineNa", value)} />
              <NumberInput label="Urine Cr" value={inputs.urineCr} placeholder="80" onChange={(value) => updateField("urineCr", value)} />
              <NumberInput label="Serum Cr for urine sample" value={inputs.serumCrForUrine} placeholder="uses current Cr" onChange={(value) => updateField("serumCrForUrine", value)} />
              <NumberInput label="Urine urea" value={inputs.urineUrea} placeholder="400" onChange={(value) => updateField("urineUrea", value)} />
              <NumberInput label="BUN" value={inputs.serumBun} placeholder="40" onChange={(value) => updateField("serumBun", value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              <IndexPanel
                result={assessment.fena}
                formula="FENa = (UNa x SCr) / (SNa x UCr) x 100"
                getTone={(value) => value === null ? "info" : value < 1 ? "success" : value > 2 ? "warning" : "info"}
              />
              <IndexPanel
                result={assessment.feurea}
                formula="FEUrea = (UUrea x SCr) / (BUN x UCr) x 100"
                getTone={(value) => value === null ? "info" : value < 35 ? "success" : value > 50 ? "warning" : "info"}
              />
            </div>
            {showDiureticCaveat && (
              <div style={{ marginTop: 10, background: T.warningBg, border: `1px solid ${T.warning}`, color: T.text, borderRadius: 8, padding: 10, fontSize: 13, lineHeight: 1.5 }}>
                Diuretics selected: FENa is often confounded. FEUrea can help, but it still needs clinical context.
              </div>
            )}
          </Panel>
        </div>

        <aside id="aki-results" style={{ position: isMobile ? "static" : "sticky", top: 70 }}>
          <Panel
            icon={Calculator}
            title="Generated Differential"
            action={(
              <button
                type="button"
                onClick={() => void copyAssessment()}
                title="Copy assessment"
                aria-label="Copy AKI assessment"
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
                Add a creatinine trend, UOP, exposures, UA findings, imaging, or urine electrolytes to generate a ranked differential.
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
                    <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 8, paddingTop: 8 }}>
                      {item.next.slice(0, 2).map((step) => (
                        <div key={step} style={{ color: T.text, fontSize: 12.5, lineHeight: 1.45, marginBottom: 3 }}>{step}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Next checks">
            {assessment.nextSteps.map((step) => (
              <div key={step} style={{ color: T.text, fontSize: 13, lineHeight: 1.45, marginBottom: 6 }}>{step}</div>
            ))}
            <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
              Uses KDIGO-style creatinine/UOP staging signals and standard FENa/FEUrea formulas. This is a reasoning aid, not a diagnosis.
            </div>
          </Panel>
        </aside>
      </div>

      <EduDisclaimer />
    </div>
  );
}
