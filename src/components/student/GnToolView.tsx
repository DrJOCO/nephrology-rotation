import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Calculator, Clipboard, Droplet, History, Microscope, Pill, ScanSearch } from "lucide-react";
import { T } from "../../data/constants";
import { useIsMobile } from "../../utils/helpers";
import {
  buildGnAssessment,
  DEFAULT_GN_INPUTS,
  type GnComplementStatus,
  type GnRbcCastStatus,
  type GnRbcStatus,
  type GnSyndrome,
  type GnTempo,
  type GnToolInputs,
  type GnUaGrade,
} from "../../utils/gnTool";
import {
  DifferentialSignalBadge,
  EduDisclaimer,
  inputLabel,
  NumberInput,
  OptionGrid,
  OptionGroupGrid,
  Panel,
  ResultBadge,
  SegmentedGroup,
  ToolResetButton,
  ToolShell,
  type ToolOption,
} from "./shared";

type ArrayInputKey = "selectedPositive" | "selectedSentNegative" | "selectedHistory";

type Option<T extends string = string> = ToolOption<T>;

const SYNDROME_OPTIONS: Option<GnSyndrome>[] = [
  { id: "unclear", label: "Unclear" },
  { id: "nephritic", label: "Nephritic" },
  { id: "nephrotic", label: "Nephrotic" },
  { id: "mixed", label: "Mixed" },
  { id: "rpgn", label: "RPGN" },
  { id: "asymptomatic", label: "Asymptomatic UA" },
  { id: "pulmonary_renal", label: "Pulmonary–renal" },
];

const TEMPO_OPTIONS: Option<GnTempo>[] = [
  { id: "unknown", label: "Unknown" },
  { id: "acute", label: "Acute (days)" },
  { id: "subacute", label: "Subacute (weeks)" },
  { id: "chronic", label: "Chronic (months+)" },
];

const UA_PROTEIN_OPTIONS: Option<GnUaGrade>[] = [
  { id: "not_checked", label: "Not checked" },
  { id: "negative", label: "Neg/trace" },
  { id: "trace_1", label: "1+" },
  { id: "two_plus", label: "2+" },
  { id: "three_plus", label: "3+/4+" },
  { id: "nephrotic", label: "Nephrotic range" },
];

const UA_BLOOD_OPTIONS: Option<GnUaGrade>[] = UA_PROTEIN_OPTIONS.filter((o) => o.id !== "nephrotic");

const RBC_OPTIONS: Option<GnRbcStatus>[] = [
  { id: "not_checked", label: "Not checked" },
  { id: "none", label: "0–2/hpf" },
  { id: "few", label: "Few" },
  { id: "many", label: "Many" },
  { id: "dysmorphic", label: "Dysmorphic" },
];

const RBC_CAST_OPTIONS: Option<GnRbcCastStatus>[] = [
  { id: "not_checked", label: "Not checked" },
  { id: "absent", label: "Absent" },
  { id: "present", label: "Present" },
];

const COMPLEMENT_OPTIONS: Option<GnComplementStatus>[] = [
  { id: "not_checked", label: "Not checked" },
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
];

const POSITIVE_SEROLOGY_GROUPS: Array<{ label: string; options: Option[] }> = [
  {
    label: "Lupus",
    options: [
      { id: "ana", label: "ANA +" },
      { id: "anti_dsdna", label: "anti-dsDNA +" },
      { id: "anti_smith", label: "anti-Smith +" },
    ],
  },
  {
    label: "Pauci-immune / anti-GBM",
    options: [
      { id: "anca_pr3", label: "ANCA: PR3 +" },
      { id: "anca_mpo", label: "ANCA: MPO +" },
      { id: "anti_gbm", label: "anti-GBM +" },
    ],
  },
  {
    label: "Membranous",
    options: [
      { id: "anti_pla2r", label: "anti-PLA2R +" },
      { id: "anti_thsd7a", label: "anti-THSD7A +" },
    ],
  },
  {
    label: "Infection / cryo",
    options: [
      { id: "aso_dnaseB", label: "ASO / anti-DNase B +" },
      { id: "blood_cx", label: "Blood cx + (endocarditis)" },
      { id: "hbv", label: "HBV +" },
      { id: "hcv", label: "HCV +" },
      { id: "hiv", label: "HIV +" },
      { id: "syphilis_rpr", label: "RPR +" },
      { id: "cryoglobulin", label: "Cryoglobulins +" },
    ],
  },
  {
    label: "Monoclonal",
    options: [
      { id: "spep_sfle_abnl", label: "SPEP / UPEP / SFLC abnormal" },
    ],
  },
];

const NEGATIVE_SEROLOGY_OPTIONS: Option[] = [
  { id: "ana", label: "ANA neg" },
  { id: "anti_dsdna", label: "anti-dsDNA neg" },
  { id: "anca_pr3", label: "ANCA PR3 neg" },
  { id: "anca_mpo", label: "ANCA MPO neg" },
  { id: "anti_gbm", label: "anti-GBM neg" },
  { id: "anti_pla2r", label: "anti-PLA2R neg" },
  { id: "anti_thsd7a", label: "anti-THSD7A neg" },
  { id: "aso_dnaseB", label: "ASO / DNase B neg" },
  { id: "cryoglobulin", label: "Cryos neg" },
  { id: "hbv", label: "HBV neg" },
  { id: "hcv", label: "HCV neg" },
  { id: "hiv", label: "HIV neg" },
  { id: "spep_sfle_abnl", label: "SPEP/SFLC neg" },
  { id: "blood_cx", label: "Blood cx neg" },
];

const HISTORY_OPTIONS: Option[] = [
  { id: "recent_strep_skin", label: "Recent strep / skin infection (1–4 wk)" },
  { id: "synpharyngitic", label: "URI + synpharyngitic gross hematuria" },
  { id: "hemoptysis", label: "Hemoptysis / pulmonary hemorrhage" },
  { id: "sinus_ent_chronic", label: "Sinusitis / saddle nose / septal perforation" },
  { id: "asthma_eos", label: "Asthma + peripheral eosinophilia" },
  { id: "palpable_purpura", label: "Palpable purpura (LE)" },
  { id: "abdominal_pain_purpura", label: "Abdominal pain + purpura (IgA-V)" },
  { id: "lupus_features", label: "Lupus features (arthritis, oral ulcers, photo, serositis)" },
  { id: "vasculitis_systemic", label: "Mononeuritis / livedo / systemic vasculitis" },
  { id: "iv_drug_use", label: "IV drug use" },
  { id: "endocarditis_features", label: "Endocarditis features (fever, new murmur, emboli)" },
  { id: "shunt_device", label: "VP shunt / indwelling device" },
  { id: "known_hbv", label: "Known HBV" },
  { id: "known_hcv", label: "Known HCV" },
  { id: "known_hiv", label: "Known HIV" },
  { id: "solid_tumor", label: "Solid tumor (lung / GI / prostate)" },
  { id: "lymphoma_heme_malignancy", label: "Lymphoma / heme malignancy" },
  { id: "long_dm_retinopathy", label: "Long-standing DM + retinopathy" },
  { id: "chronic_nsaid", label: "Chronic NSAID use" },
  { id: "family_kidney_alport", label: "Family kidney disease / hearing loss / eye anomalies" },
  { id: "tma_features", label: "MAHA + thrombocytopenia (TMA)" },
];

export default function GnToolView({ onBack }: { onBack: () => void }) {
  const isMobile = useIsMobile(960);
  const [inputs, setInputs] = useState<GnToolInputs>(DEFAULT_GN_INPUTS);
  const [copied, setCopied] = useState(false);
  const assessment = useMemo(() => buildGnAssessment(inputs), [inputs]);

  const updateField = <K extends keyof GnToolInputs>(key: K, value: GnToolInputs[K]) => {
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
      `Complement: ${assessment.complementPattern.label} — ${assessment.complementPattern.interpretation}`,
      "",
      "Alerts:",
      ...assessment.alerts.map((a) => `- ${a}`),
      "",
      "Differential:",
      ...topDiffs,
      "",
      "Serologies still to send:",
      ...assessment.serologyPlan.needed.map((n) => `- ${n.label}: ${n.reason}`),
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

  const resetAction = <ToolResetButton onClick={() => setInputs(DEFAULT_GN_INPUTS)} ariaLabel="Reset GN tool" />;

  const complementTone =
    assessment.complementPattern.pattern === "low_c3_low_c4"
      ? "danger"
      : assessment.complementPattern.pattern === "low_c3_normal_c4"
        ? "warning"
        : assessment.complementPattern.pattern === "normal"
          ? "success"
          : "info";

  const proteinTierTone =
    assessment.quantitative.proteinTier === "nephrotic_range"
      ? "danger"
      : assessment.quantitative.proteinTier === "subnephrotic"
        ? "warning"
        : assessment.quantitative.proteinTier === "minimal"
          ? "success"
          : "info";

  const proteinTierLabel =
    assessment.quantitative.proteinTier === "nephrotic_range"
      ? "Nephrotic range (≥3.5 g/d)"
      : assessment.quantitative.proteinTier === "subnephrotic"
        ? "Subnephrotic (0.5–3.5 g/d)"
        : assessment.quantitative.proteinTier === "minimal"
          ? "Minimal (<0.5 g/d)"
          : "Proteinuria not quantified";

  return (
    <ToolShell
      onBack={onBack}
      eyebrow="Tools"
      title="Glomerular Disease Tool"
      description="Map syndrome × complement → ranked GN differential, with what the positive serologies mean and which ones still need to be sent. Aligned with KDIGO 2021 GN guidance and UpToDate evaluation algorithms."
      action={resetAction}
      footer={<EduDisclaimer />}
    >
      {isMobile && (
        <Panel title="Live differential" tone="info">
          <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5 }}>{assessment.summary}</div>
          <a href="#gn-results" style={{ display: "inline-flex", marginTop: 8, color: T.brand, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            View full differential
          </a>
        </Panel>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(380px, 0.95fr)", gap: 14, alignItems: "start" }}>
        <div>
          {/* Syndrome / tempo */}
          <Panel icon={Activity} title="Clinical Syndrome & Tempo">
            <div style={{ marginBottom: 12 }}>
              <label style={inputLabel}>Syndrome</label>
              <SegmentedGroup options={SYNDROME_OPTIONS} value={inputs.syndrome} onChange={(value) => updateField("syndrome", value)} />
            </div>
            <div>
              <label style={inputLabel}>Tempo of Cr rise</label>
              <SegmentedGroup options={TEMPO_OPTIONS} value={inputs.tempo} onChange={(value) => updateField("tempo", value)} />
            </div>
            <div style={{ marginTop: 12, color: T.sub, fontSize: 12.5, lineHeight: 1.5 }}>
              Leave syndrome on “Unclear” to let the tool derive it from your UA + UPCR + Cr trajectory.
            </div>
          </Panel>

          {/* Quantitative / Cr */}
          <Panel icon={Droplet} title="Quantitative & Renal Function">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
              <NumberInput label="UPCR (mg/g)" value={inputs.upcr} placeholder="spot" step="1" onChange={(value) => updateField("upcr", value)} />
              <NumberInput label="24h protein (g/d)" value={inputs.protein24h} placeholder="optional" onChange={(value) => updateField("protein24h", value)} />
              <NumberInput label="Albumin (g/dL)" value={inputs.serumAlbumin} placeholder="2.5" onChange={(value) => updateField("serumAlbumin", value)} />
              <div />
              <NumberInput label="Baseline Cr" value={inputs.baselineCr} placeholder="mg/dL" onChange={(value) => updateField("baselineCr", value)} />
              <NumberInput label="Current Cr" value={inputs.currentCr} placeholder="mg/dL" onChange={(value) => updateField("currentCr", value)} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ResultBadge tone={proteinTierTone}>{proteinTierLabel}</ResultBadge>
              {assessment.quantitative.proteinGramsPerDay !== null && (
                <ResultBadge tone="info">
                  ~{assessment.quantitative.proteinGramsPerDay.toFixed(1)} g/d
                  {assessment.quantitative.proteinSource === "upcr" && " (from UPCR)"}
                </ResultBadge>
              )}
              {assessment.quantitative.crRatio !== null && (
                <ResultBadge tone={assessment.quantitative.rpgnTrajectory ? "danger" : "info"}>
                  Cr ×{assessment.quantitative.crRatio.toFixed(1)}
                </ResultBadge>
              )}
              {assessment.quantitative.albumin !== null && assessment.quantitative.albumin < 2.5 && (
                <ResultBadge tone="warning">Albumin {assessment.quantitative.albumin.toFixed(1)} (VTE risk)</ResultBadge>
              )}
            </div>
          </Panel>

          {/* UA findings */}
          <Panel icon={Microscope} title="Urinalysis & Microscopy">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <div>
                <label style={inputLabel}>Dipstick protein</label>
                <SegmentedGroup options={UA_PROTEIN_OPTIONS} value={inputs.protein} onChange={(value) => updateField("protein", value)} />
              </div>
              <div>
                <label style={inputLabel}>Dipstick blood</label>
                <SegmentedGroup options={UA_BLOOD_OPTIONS} value={inputs.blood} onChange={(value) => updateField("blood", value)} />
              </div>
              <div>
                <label style={inputLabel}>RBC morphology</label>
                <SegmentedGroup options={RBC_OPTIONS} value={inputs.rbc} onChange={(value) => updateField("rbc", value)} />
              </div>
              <div>
                <label style={inputLabel}>RBC casts</label>
                <SegmentedGroup options={RBC_CAST_OPTIONS} value={inputs.rbcCasts} onChange={(value) => updateField("rbcCasts", value)} />
              </div>
            </div>
            <div style={{ marginTop: 12, color: T.sub, fontSize: 12.5, lineHeight: 1.5 }}>
              Dysmorphic RBCs and RBC casts are the bedside signature of glomerular hematuria — the highest-yield clue you can get without a biopsy.
            </div>
          </Panel>

          {/* Complement */}
          <Panel icon={ScanSearch} title="Complement">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 12 }}>
              <div>
                <label style={inputLabel}>C3</label>
                <SegmentedGroup options={COMPLEMENT_OPTIONS} value={inputs.c3} onChange={(value) => updateField("c3", value)} />
              </div>
              <div>
                <label style={inputLabel}>C4</label>
                <SegmentedGroup options={COMPLEMENT_OPTIONS} value={inputs.c4} onChange={(value) => updateField("c4", value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <ResultBadge tone={complementTone}>{assessment.complementPattern.label}</ResultBadge>
            </div>
            <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5, fontFamily: T.serif, fontStyle: "italic" }}>
              {assessment.complementPattern.interpretation}
            </div>
          </Panel>

          {/* Positive serologies */}
          <Panel icon={Pill} title="Positive Serologies">
            <OptionGroupGrid groups={POSITIVE_SEROLOGY_GROUPS} selectedIds={inputs.selectedPositive} onToggle={(id) => toggleArray("selectedPositive", id)} />
            <div style={{ marginTop: 10, color: T.sub, fontSize: 12.5, lineHeight: 1.5 }}>
              Mark anything that has come back positive. The differential will weight these heavily; anti-GBM and PR3/MPO ANCA force urgent action.
            </div>
          </Panel>

          {/* Sent-negative serologies */}
          <Panel icon={Pill} title="Tests Sent & Negative">
            <OptionGrid options={NEGATIVE_SEROLOGY_OPTIONS} selectedIds={inputs.selectedSentNegative} onToggle={(id) => toggleArray("selectedSentNegative", id)} />
            <div style={{ marginTop: 10, color: T.sub, fontSize: 12.5, lineHeight: 1.5 }}>
              Marking a test as negative removes it from the “still to send” list and downweights the relevant differentials. Leave blank for tests not yet sent.
            </div>
          </Panel>

          {/* History / exam */}
          <Panel icon={History} title="History & Exam">
            <OptionGrid options={HISTORY_OPTIONS} selectedIds={inputs.selectedHistory} onToggle={(id) => toggleArray("selectedHistory", id)} />
          </Panel>
        </div>

        {/* Right column — results */}
        <aside id="gn-results" style={{ position: isMobile ? "static" : "sticky", top: 70 }}>
          <Panel
            icon={Calculator}
            title="Generated Differential"
            action={(
              <button
                type="button"
                onClick={() => void copyAssessment()}
                title="Copy assessment"
                aria-label="Copy GN assessment"
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
                Add UA, UPCR, complement, and any positive serologies to generate a ranked differential.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 9 }}>
                {assessment.differentials.map((item, index) => (
                  <div key={item.id} style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, background: T.surface }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: T.ink, fontSize: 13, lineHeight: 1.35 }}>
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

          {/* Serology plan */}
          <Panel icon={AlertTriangle} title="Serology Plan — What to Send Next">
            {assessment.serologyPlan.needed.length === 0 ? (
              <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5 }}>
                The standard battery for this syndrome has been resolved. Reassess if the picture changes.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {assessment.serologyPlan.needed.map((item) => (
                  <div key={item.id} style={{ borderBottom: `1px dotted ${T.line}`, paddingBottom: 6 }}>
                    <div style={{ color: T.ink, fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.45, marginTop: 2 }}>{item.reason}</div>
                  </div>
                ))}
              </div>
            )}
            {(assessment.serologyPlan.positive.length > 0 || assessment.serologyPlan.sentNegative.length > 0) && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}`, color: T.muted, fontSize: 12, lineHeight: 1.45 }}>
                {assessment.serologyPlan.positive.length > 0 && (
                  <div>Positive: {assessment.serologyPlan.positive.length} test(s).</div>
                )}
                {assessment.serologyPlan.sentNegative.length > 0 && (
                  <div>Sent-negative: {assessment.serologyPlan.sentNegative.length} test(s).</div>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Next checks">
            {assessment.nextSteps.length === 0 ? (
              <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5 }}>Add inputs to generate next-step suggestions.</div>
            ) : (
              assessment.nextSteps.map((step) => (
                <div key={step} style={{ color: T.text, fontSize: 13, lineHeight: 1.45, marginBottom: 6 }}>{step}</div>
              ))
            )}
            <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
              Algorithm draws on UpToDate evaluation algorithms, KDIGO 2021 GN guidelines, and standard nephrology teaching. Reasoning aid, not a diagnosis.
            </div>
          </Panel>
        </aside>
      </div>
    </ToolShell>
  );
}
