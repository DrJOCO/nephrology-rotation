import { Check, RotateCcw, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { T } from "../../data/constants";

// ═══════════════════════════════════════════════════════════════════════
//  Shared styles used across multiple student components
// ═══════════════════════════════════════════════════════════════════════

const floatingBackButtonStyle: CSSProperties = { position: "fixed", bottom: 72, right: 16, background: T.card, border: `1px solid ${T.line}`, color: T.brand, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", fontWeight: 700, minHeight: 40, borderRadius: 8, boxShadow: "none", zIndex: 99 };

const inlineBackButtonStyle: CSSProperties = {
  position: "static",
  background: T.card,
  border: `1.5px solid ${T.line}`,
  color: T.brand,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 16px",
  fontWeight: 600,
  minHeight: 44,
  borderRadius: 22,
  marginTop: 8,
};

export function BackButton({
  onClick,
  label = "Back",
  placement = "floating",
  style,
}: {
  onClick: () => void;
  label?: ReactNode;
  placement?: "floating" | "inline";
  style?: CSSProperties;
}) {
  const base = placement === "floating" ? floatingBackButtonStyle : inlineBackButtonStyle;
  return <button onClick={onClick} style={{ ...base, ...style }}>{"\u2190"} {label}</button>;
}

export const inputLabel: CSSProperties = { fontSize: 13, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1.5px solid ${T.line}`,
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: T.sans,
  outline: "none",
  background: T.surface2,
  color: T.text,
};

type PanelTone = "info" | "warning" | "danger";

const TONE_COLOR: Record<PanelTone, string> = {
  info: T.info,
  warning: T.warning,
  danger: T.danger,
};

export function Panel({
  icon: Icon,
  title,
  action,
  tone,
  children,
  style,
}: {
  icon?: LucideIcon;
  title?: ReactNode;
  action?: ReactNode;
  tone?: PanelTone;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const accent = tone ? { borderLeft: `4px solid ${TONE_COLOR[tone]}` } : null;
  const hasHeader = Icon || title || action;
  return (
    <section style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 8, padding: 14, marginBottom: 12, ...accent, ...style }}>
      {hasHeader && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          {(Icon || title) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.ink, fontWeight: 600, fontSize: 14, fontFamily: T.serif, minWidth: 0 }}>
              {Icon && <Icon size={17} strokeWidth={2} aria-hidden="true" />}
              {title}
            </div>
          )}
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type EditorialTone = "neutral" | "ink" | "brand" | "success" | "warning" | "danger" | "info";

function toneColor(tone: EditorialTone): string {
  return {
    neutral: T.ink2,
    ink: T.ink,
    brand: T.brand,
    success: T.success,
    warning: T.warning,
    danger: T.danger,
    info: T.info,
  }[tone];
}

function toneBg(tone: EditorialTone): string {
  return {
    neutral: T.surface2,
    ink: T.surface2,
    brand: T.brandBg,
    success: T.successBg,
    warning: T.warningBg,
    danger: T.dangerBg,
    info: T.infoBg,
  }[tone];
}

function solidToneInk(tone: EditorialTone): string {
  return {
    neutral: T.ink,
    ink: T.bg,
    brand: T.brandInk,
    success: T.successInk,
    warning: T.warningInk,
    danger: T.dangerInk,
    info: T.infoInk,
  }[tone];
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
  level = 2,
  compact = false,
  style,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: 2 | 3;
  compact?: boolean;
  style?: CSSProperties;
}) {
  const Heading = (level === 2 ? "h2" : "h3") as "h2" | "h3";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: compact ? 10 : 14, ...style }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 0, marginBottom: 6 }}>
            {eyebrow}
          </div>
        )}
        <Heading style={{ color: T.ink, fontSize: level === 2 ? (compact ? 20 : 22) : 15, margin: 0, fontFamily: T.serif, fontWeight: level === 2 ? 600 : 700, lineHeight: 1.15 }}>
          {title}
        </Heading>
        {description && (
          <p style={{ color: T.ink2, fontSize: 13, margin: "6px 0 0", lineHeight: 1.5, maxWidth: 760 }}>
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

export function Button({
  children,
  tone = "brand",
  variant = "solid",
  size = "md",
  style,
  type = "button",
  ...buttonProps
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Extract<EditorialTone, "neutral" | "ink" | "brand" | "success" | "warning" | "danger" | "info">;
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md";
}) {
  const color = toneColor(tone);
  const solid = variant === "solid";
  const outline = variant === "outline";
  return (
    <button
      type={type}
      style={{
        minHeight: size === "sm" ? 34 : 40,
        padding: size === "sm" ? "7px 10px" : "10px 13px",
        borderRadius: 8,
        border: outline ? `1px solid ${color}` : "1px solid transparent",
        background: solid ? color : "transparent",
        color: solid ? solidToneInk(tone) : color,
        cursor: buttonProps.disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: size === "sm" ? 13 : 14,
        fontWeight: 700,
        fontFamily: T.sans,
        opacity: buttonProps.disabled ? 0.55 : 1,
        ...style,
      }}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

export function InfoBar({
  label,
  title,
  children,
  action,
  tone = "info",
  style,
}: {
  label?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  tone?: Exclude<EditorialTone, "ink">;
  style?: CSSProperties;
}) {
  const color = toneColor(tone);
  return (
    <div style={{ background: toneBg(tone), borderRadius: 8, padding: "12px 13px", borderLeft: `4px solid ${color}`, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", ...style }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        {label && (
          <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: title || children ? 4 : 0, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 0 }}>
            {label}
          </div>
        )}
        {title && <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{title}</div>}
        {children && <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, marginTop: title ? 4 : 0 }}>{children}</div>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

export function Chip({
  children,
  selected = false,
  onClick,
  tone = "ink",
  showCheck = true,
  style,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  tone?: Extract<EditorialTone, "ink" | "brand" | "success" | "warning" | "danger" | "info">;
  showCheck?: boolean;
  style?: CSSProperties;
}) {
  const color = toneColor(tone);
  const chipStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    minHeight: 34,
    padding: "7px 10px",
    borderRadius: 8,
    border: `1.5px solid ${selected ? color : T.line}`,
    background: selected ? color : T.surface2,
    color: selected ? solidToneInk(tone) : T.text,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: T.sans,
    textAlign: "left",
    ...style,
  };
  const content = (
    <>
      {selected && showCheck && <Check size={13} strokeWidth={2.5} aria-hidden="true" />}
      <span>{children}</span>
    </>
  );

  if (!onClick) {
    return <span style={chipStyle}>{content}</span>;
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={selected} style={{ cursor: "pointer", ...chipStyle }}>
      {content}
    </button>
  );
}

export interface ToolOption<T extends string = string> {
  id: T;
  label: string;
  detail?: string;
}

export function OptionGrid({ options, selectedIds, onToggle }: { options: ToolOption[]; selectedIds: string[]; onToggle: (id: string) => void }) {
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

export function OptionGroupGrid({ groups, selectedIds, onToggle }: { groups: Array<{ label: string; options: ToolOption[] }>; selectedIds: string[]; onToggle: (id: string) => void }) {
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

export function SegmentedGroup<TVal extends string>({ options, value, onChange }: { options: ToolOption<TVal>[]; value: TVal; onChange: (value: TVal) => void }) {
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

export function NumberInput({
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

export type ResultBadgeTone = "brand" | "success" | "warning" | "danger" | "info";

export function ResultBadge({ tone, children }: { tone: ResultBadgeTone; children: ReactNode }) {
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

export function DifferentialSignalBadge({ signal }: { signal: string }) {
  if (signal === "High") return <ResultBadge tone="danger">{signal}</ResultBadge>;
  if (signal === "Moderate") return <ResultBadge tone="warning">{signal}</ResultBadge>;
  return <ResultBadge tone="info">{signal}</ResultBadge>;
}

export function ToolResetButton({ onClick, label = "Reset", ariaLabel = "Reset tool" }: { onClick: () => void; label?: string; ariaLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={ariaLabel}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, padding: "8px 11px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface2, color: T.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
    >
      <RotateCcw size={15} strokeWidth={2} aria-hidden="true" />
      {label}
    </button>
  );
}

export function ToolShell({
  title,
  description,
  eyebrow,
  onBack,
  backLabel = "Tools",
  action,
  info,
  children,
  footer,
  style,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  onBack?: () => void;
  backLabel?: ReactNode;
  action?: ReactNode;
  info?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ padding: 16, ...style }}>
      {onBack && <BackButton onClick={onBack} label={backLabel} />}
      <SectionTitle eyebrow={eyebrow} title={title} description={description} action={action} />
      {info && <div style={{ marginBottom: 14 }}>{info}</div>}
      {children}
      {footer}
    </div>
  );
}

export function Section({ eyebrow, title, description, action, children, style }: { eyebrow?: ReactNode; title?: ReactNode; description?: ReactNode; action?: ReactNode; children?: ReactNode; style?: CSSProperties }) {
  return (
    <section style={{ borderTop: `1px solid ${T.line}`, paddingTop: 18, marginTop: 28, marginBottom: 14, ...style }}>
      {(eyebrow || title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: title || description ? 12 : 0 }}>
          <div style={{ minWidth: 0 }}>
            {eyebrow && (
              <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 0, marginBottom: title ? 6 : 0 }}>
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 style={{ color: T.ink, fontSize: 22, margin: 0, fontFamily: T.serif, fontWeight: 600, lineHeight: 1.15 }}>{title}</h2>
            )}
            {description && (
              <p style={{ color: T.sub, fontSize: 13, margin: "6px 0 0", lineHeight: 1.5, maxWidth: 760 }}>{description}</p>
            )}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function LabRow({ label, value, unit, reference, alarm }: { label: string; value: string | number; unit?: string; reference?: string; alarm?: boolean }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr auto auto",
      gap: 14,
      alignItems: "baseline",
      padding: "10px 0",
      borderBottom: `1px dotted ${T.line}`,
      fontFamily: T.mono,
      fontSize: 13,
    }}>
      <span style={{ fontFamily: T.sans, fontWeight: 500, color: T.ink }}>{label}</span>
      <span style={{ color: alarm ? T.danger : T.ink, fontWeight: 500 }}>
        {value}
        {unit && <span style={{ color: T.muted, fontWeight: 400 }}>{unit}</span>}
      </span>
      <span style={{ color: T.muted, fontSize: 11 }}>{reference}</span>
    </div>
  );
}

export function HeadlineMetric({ value, unit, caption, tone = "ink", variant = "headline" }: { value: ReactNode; unit?: string; caption?: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "ink"; variant?: "headline" | "compact" }) {
  const toneColor = {
    success: T.success,
    warning: T.warning,
    danger: T.danger,
    info: T.info,
    ink: T.ink,
  }[tone];
  const isCompact = variant === "compact";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, color: toneColor, fontFamily: T.serif, fontWeight: isCompact ? 700 : 600, lineHeight: 1, letterSpacing: 0 }}>
        <span style={{ fontSize: isCompact ? 32 : 64 }}>{value ?? "—"}</span>
        {unit && <span style={{ fontSize: isCompact ? 16 : 32, color: isCompact ? toneColor : T.muted, fontWeight: isCompact ? 600 : 500 }}>{unit}</span>}
      </div>
      {!isCompact && <div style={{ height: 1, background: T.ink, margin: "8px 0 6px", width: 48 }} />}
      {caption && (
        <div style={{ color: T.muted, fontSize: isCompact ? 12 : 11, fontFamily: isCompact ? T.sans : T.mono, fontWeight: isCompact ? 600 : 400, marginTop: isCompact ? 4 : 0, textTransform: isCompact ? "uppercase" : undefined, letterSpacing: 0 }}>{caption}</div>
      )}
    </div>
  );
}

export function EduDisclaimer() {
  return (
    <div style={{
      marginTop: 24,
      paddingTop: 12,
      borderTop: `1px solid ${T.line}`,
      fontSize: 12,
      lineHeight: 1.5,
      color: T.muted,
      textAlign: "center",
    }}>
      For educational use only. Not medical advice. Always use clinical judgment.
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Pro Tips — Nephrology clinical pearls
// ═══════════════════════════════════════════════════════════════════════

export const PRO_TIPS = [
  // Secrets 1-17: Patient Assessment & AKI
  "A spot urine protein-to-creatinine ratio correlates well with a 24-hour collection — use it as a quick quantitative screen.",
  "Bleeding is the most common kidney biopsy complication, but it's usually self-limited and rarely life-threatening.",
  "AKI differential: prerenal (perfusion problem), intrinsic (kidney damage), or postrenal (obstruction). Always think in three buckets.",
  "Hepatorenal syndrome is functional kidney failure in decompensated liver disease — the kidneys themselves are structurally normal.",
  "HRS treatment: albumin + vasoconstrictors (midodrine/octreotide or terlipressin), but liver transplant is the definitive cure.",
  "Drug-induced AKI is extremely common. Always do a thorough med review — NSAIDs, ACEi/ARBs, aminoglycosides, and contrast are frequent culprits.",
  "Sepsis is one of the leading causes of AKI in the ICU and carries a high mortality rate.",
  "In sepsis, early administration of appropriate antibiotics is critical and is associated with better outcomes.",
  "In rhabdomyolysis/crush injury, early aggressive IV fluids — even before extrication — are critical for preventing AKI.",
  "The risk of AKI rises with severe rhabdomyolysis and very high CK levels, especially in the setting of volume depletion, sepsis, or delayed resuscitation.",
  "Acute GN presents with the classic nephritic syndrome: edema, new or worsening HTN, and active urine sediment with RBC casts.",
  "RPGN (rapidly progressive GN) causes kidney function loss over days to weeks — without urgent treatment it often leads to ESKD.",
  "Primary nephrotic syndrome in adults commonly includes membranous nephropathy, FSGS, and minimal change disease. Diagnosis usually integrates clinical features, serologies, and kidney biopsy; genetic testing is selective, not universal.",
  "After relieving urinary obstruction, watch for post-obstructive diuresis — check electrolytes frequently and replace fluids appropriately.",
  "Struvite stones are caused by urease-producing bacteria, especially Proteus mirabilis. E. coli almost never produces urease.",
  "Uric acid stones are radiolucent on plain X-ray but readily visible on CT scan — always use CT for stone evaluation.",
  "Uric acid stones form in acidic urine — the primary treatment is urinary alkalinization with potassium citrate, not allopurinol.",
  // Secrets 18-26: CKD & Management
  "Enteric hyperoxaluria requires an intact colon — it results from increased oxalate absorption in the setting of fat malabsorption.",
  "Low-calcium diets are NOT recommended for calcium stone formers — they can worsen bone health without reducing stone formation.",
  "Diabetes and hypertension are the leading causes of CKD, with glomerular diseases and hereditary disorders such as ADPKD also important.",
  "ESA therapy: target hemoglobin should be individualized and should not exceed 12 g/dL. Higher targets increase cardiovascular risk.",
  "Most patients on ESAs need iron supplementation. Oral iron often fails due to poor absorption — IV iron is frequently necessary.",
  "CKD-MBD involves abnormal calcium, phosphorus, PTH, and vitamin D metabolism, leading to bone disease and vascular calcification.",
  "Cardiovascular disease is the #1 cause of death in CKD. Traditional CV risk factors behave differently in this population — study the evidence carefully.",
  "Most adults age 50 or older with CKD not on dialysis, and adult kidney transplant recipients, are candidates for statin therapy per KDIGO lipid guidance.",
  "Plan vascular access early in progressive CKD — an AV fistula needs several months to mature before it can be used for hemodialysis.",
  // Secrets 27-34: Glomerular Disease
  "Minimal change disease is the #1 cause of nephrotic syndrome in children. In adults it's the third most common, after membranous and FSGS.",
  "Categorizing FSGS as genetic, secondary, or primary guides treatment decisions and helps predict posttransplant recurrence risk.",
  "High-risk APOL1 genotypes are associated with a greater risk of FSGS progression to ESKD.",
  "Membranous nephropathy: ~80% of primary cases have anti-PLA\u2082R antibodies. Always rule out secondary causes like malignancy, hepatitis B, and lupus.",
  "IgA nephropathy is the most common primary GN worldwide — a nephritic syndrome with outcomes ranging from benign hematuria to RPGN.",
  "MPGN results from immune complex deposition or complement dysregulation. It can progress to ESKD over 10-15 years.",
  "MPGN is a pattern of injury with heterogeneous causes. Management depends on the underlying mechanism, and recurrence after transplant can occur.",
  "Diabetic retinopathy is present in almost all type 1 diabetics with nephropathy. If absent, consider an alternative diagnosis.",
  // Secrets 35-42: Lupus, Vasculitis, Infections
  "In lupus nephritis, early diagnosis is key — kidney function at biopsy correlates strongly with remission rates.",
  "Most pauci-immune crescentic GN is ANCA-associated. PR3-ANCA is more often linked with GPA and MPO-ANCA with MPA, but serology and phenotype are not perfectly interchangeable.",
  "ANCA vasculitis induction typically uses glucocorticoids plus rituximab or cyclophosphamide. Plasma exchange is no longer routine, but can be considered in selected severe cases, especially diffuse alveolar hemorrhage with hypoxemia or very severe kidney involvement.",
  "Post-infectious GN occurs 1-3 weeks after streptococcal pharyngitis (longer for skin infections). It's usually self-limiting and doesn't require immunosuppression.",
  "In GN workup, always check hepatitis B status — HBeAg positivity predicts the type of glomerular disease and carries a higher kidney disease risk.",
  "Hepatitis C-related GN: think type 2 cryoglobulinemia with low C3/C4 (classical complement activation) and MPGN pattern on biopsy.",
  "HIVAN disproportionately affects people of African ancestry and is strongly associated with APOL1 high-risk variants — collapsing FSGS on biopsy is the classic finding.",
  "HAART is the primary treatment for HIVAN and can produce histologic reversal, but it's less effective for HIV immune complex disease (HIVICK).",
  // Secrets 43-53: Oncology, TMA, Genetic
  "Both rhabdomyolysis and tumor lysis syndrome cause the same electrolyte storm: hyperK, hyperPhos, hypoCa, and hyperuricemia.",
  "Rasburicase rapidly lowers uric acid and is the key agent for preventing AKI in tumor lysis syndrome.",
  "Myeloma cast nephropathy is a medical emergency — delay in diagnosis and treatment leads to irreversible kidney failure.",
  "In myeloma, light chains (not heavy chains) cause kidney damage. They're freely filtered at the glomerulus and are toxic to the proximal tubule.",
  "Bortezomib-based chemotherapy is the preferred regimen for AKI secondary to myeloma cast nephropathy.",
  "Serum-free light chains are the preferred initial study when suspecting myeloma kidney — more sensitive than SPEP alone.",
  "Amyloidosis typically presents with nephrotic syndrome and edema — always consider it in unexplained nephrotic-range proteinuria.",
  "Renal cell carcinoma treatments can be nephrotoxic: VEGF inhibitors \u2192 proteinuria, PD-1 inhibitors \u2192 autoimmune nephritis, nephrectomy \u2192 reduced nephron mass.",
  "TMAs present with microangiopathic hemolytic anemia, thrombocytopenia, and kidney dysfunction. Major causes: Shiga toxin-HUS, aHUS, and TTP.",
  "Fabry disease is an underrecognized X-linked lysosomal storage disease in ~0.2% of ESKD patients. Suspect it in males with low alpha-galactosidase A.",
  "Alport syndrome: X-linked collagen IV mutation causing microscopic hematuria, proteinuria, sensorineural hearing loss, and progressive kidney failure.",
  // Secrets 54-60: AIN, Pregnancy, Sickle Cell
  "Thin basement membrane nephropathy (TBMN) is benign — microscopic hematuria without proteinuria, hearing loss, or progressive kidney failure.",
  "The classic AIN triad (fever, rash, eosinophilia) is present in < 10% of cases. Don't rely on its absence to rule out AIN.",
  "Drug-induced AIN is typically idiosyncratic rather than dose-dependent, and re-exposure to the offending drug can trigger recurrence.",
  "Asymptomatic bacteriuria only needs treatment in two situations: pregnancy and before urologic procedures.",
  "During pregnancy, GFR increases by ~50%. A 'normal' creatinine in a pregnant patient may actually indicate kidney dysfunction.",
  "Prepregnancy kidney function is the single best predictor of maternal and fetal outcomes in women with preexisting kidney disease.",
  "Sickle cell patients are particularly vulnerable to AKI from hemodynamic insults, pyelonephritis, toxins, and urinary tract obstruction.",
  // Secrets 61-71: Dialysis & Transplant
  "Uremic toxin removal in dialysis depends on three factors: time on dialysis, dialysate flow rate, and dialyzer membrane efficiency.",
  "For conventional thrice-weekly HD, the minimum delivered spKt/V is 1.2, with a target around 1.4 per treatment. Adequacy should be individualized, especially when residual kidney function is present.",
  "Home hemodialysis offers real benefits over in-center: better volume/BP control, improved phosphorus levels, less LV hypertrophy, and better quality of life.",
  "PD is a valid first dialysis modality and may offer quality-of-life and access-related advantages in selected patients. Modality choice should be individualized.",
  "A high serum creatinine in an ESKD patient meeting dialysis adequacy targets may reflect greater muscle mass — and is actually associated with better outcomes.",
  "Reducing PD peritonitis requires a team approach: regular audits, quality improvement initiatives, and ongoing training for both patients and staff.",
  "In ANCA vasculitis, treatment decisions should be guided by phenotype, organ-threatening severity, and current guideline recommendations rather than reflexively escalating to plasma exchange.",
  "The kidney transplant allocation system uses estimated posttransplant survival score and kidney donor profile index (KDPI) to match donors and recipients.",
  "Wait time for a deceased-donor kidney transplant in the US varies widely by blood type, sensitization, geography, and allocation factors, and often spans multiple years.",
  "Living donor kidney transplant offers the best long-term outcomes for ESKD patients — always discuss it early.",
  "Calcineurin inhibitors (tacrolimus > cyclosporine) are the backbone of transplant immunosuppression. They block T-cell activation via the calcineurin/signal 3 pathway.",
  // Secrets 72-75: Transplant Complications
  "Chronic active antibody-mediated rejection is a major cause of late allograft dysfunction and loss.",
  "EBV is found in ~2/3 of patients with posttransplant lymphoproliferative disorder (PTLD). Reducing immunosuppression is the initial treatment.",
  "BK plasma PCR is an essential screening test for BK viremia, but biopsy may still be needed to confirm BK nephropathy or distinguish it from rejection.",
  "Proteinuria after kidney transplant is associated with cardiovascular events and increased mortality — monitor it regularly.",
  // Secrets 76-84: Hypertension
  "For most adults with hypertension, use a practical treatment goal of <130/80 mmHg. In CKD, standardized office SBP <120 mmHg is supported by KDIGO for most non-dialysis patients when tolerated.",
  "No randomized trial has clearly shown that revascularization beats medical management for atherosclerotic renal artery stenosis.",
  "Secondary causes are common enough in resistant hypertension that they should be actively considered, especially when there are clinical clues.",
  "Obstructive sleep apnea is one of the most common causes of secondary HTN (~20%). Treating it improves both BP and quality of life.",
  "Hypertensive emergencies cause acute target-organ damage. Reduce BP gradually over minutes to hours — don't slam it to normal.",
  "First-line antihypertensives: thiazide-like diuretic, ACE inhibitor, ARB, or calcium channel blocker.",
  "Spironolactone is highly effective for treatment-resistant HTN but requires careful monitoring of potassium and kidney function.",
  "The AHA recommends no more than 2,300 mg/day of sodium and an ideal target of 1,500 mg/day for most adults. Even reducing sodium intake by about 1,000 mg/day can improve BP and heart health.",
  "The DASH pattern and sodium restriction can produce clinically meaningful BP reduction, often on the order of several mmHg or more.",
  // Secrets 85-92: Acid-Base & Sodium
  "Diuretics in COPD/cor pulmonale can cause contraction alkalosis. Acetazolamide helps correct the alkalosis and may improve ventilation.",
  "In metabolic alkalosis with volume contraction, urine sodium may be misleadingly normal — urine chloride < 15 mEq/L is the more reliable marker.",
  "Unexplained hypokalemia or bicarb abnormalities with difficult-to-treat HTN \u2192 workup for secondary causes like primary aldosteronism.",
  "Hypotonic hyponatremia: inadequate solute intake, excess free water intake, or impaired free water excretion. Urine osmolality helps distinguish them.",
  "Acute hyponatremia can be corrected faster, but chronic hyponatremia must be corrected slowly (\u2264 8 mEq/L per 24h) to prevent osmotic demyelination.",
  "In severely symptomatic hyponatremia, raising Na\u207a by just 3-4 mEq/L with 100 mL boluses of 3% saline can stop seizures and herniation.",
  "Prediction formulas for sodium correction don't account for ongoing water losses — always measure serum sodium frequently to avoid overcorrection.",
  "When in doubt, assume hyponatremia is chronic — especially for patients presenting from outside the hospital with no clear time of onset.",
  // Secrets 93-100: Potassium, Phosphorus, Acid-Base, Palliative
  "The definitive ways to remove potassium from the body: hemodialysis or increasing fecal excretion with potassium binders.",
  "IV calcium in hyperkalemia stabilizes the myocardium but does NOT lower K\u207a — it buys time while you give definitive K\u207a-lowering therapies.",
  "Hyperphosphatemia with normal kidney function? Think: excessive intake, cellular breakdown (rhabdo/TLS), or hypoparathyroidism.",
  "Always check and correct magnesium in refractory hypokalemia — low Mg makes K\u207a correction nearly impossible.",
  "Surviving Sepsis recommends against routine bicarbonate solely to improve hemodynamics in hypoperfusion-related lactic acidosis, but suggests considering bicarbonate in septic shock patients with severe metabolic acidemia (pH \u22647.2) plus AKI.",
  "Measuring urine chloride is an excellent first step in evaluating metabolic alkalosis — it helps classify as chloride-responsive vs. resistant.",
  "Hypokalemia plays a key role in maintaining metabolic alkalosis — you must correct the K\u207a deficit to successfully fix the alkalosis.",
  "Palliative care is appropriate at any stage of serious illness, not just at end of life. It's distinct from hospice, which requires a prognosis < 6 months.",
];

// Map quiz question indices → week numbers
// W1: 0-6 (7 Qs), W2: 7-13 (7 Qs), W3: 14-19 (6 Qs), W4: 20-24 (5 Qs)
const QUIZ_WEEK_MAP = [
  ...Array(7).fill(1),  // indices 0-6
  ...Array(7).fill(2),  // indices 7-13
  ...Array(6).fill(3),  // indices 14-19
  ...Array(5).fill(4),  // indices 20-24
];

export const PRE_QUIZ_WEEK_MAP = [...QUIZ_WEEK_MAP];
export const POST_QUIZ_WEEK_MAP = [...QUIZ_WEEK_MAP];

// Week → topic area mapping for recommendation engine
export const WEEK_TOPIC_MAP = {
  1: { label: "AKI & Foundations", topics: ["AKI", "Post-Renal AKI", "Urinalysis", "CKD"] },
  2: { label: "Electrolytes & Acid-Base", topics: ["Hyponatremia", "Hypernatremia", "Hyperkalemia", "Hypokalemia", "Acid-Base", "Calcium/Phosphorus", "CKD-MBD"] },
  3: { label: "Glomerular Disease & CKD", topics: ["Glomerulonephritis", "Nephrotic Syndrome", "Kidney Biopsy", "CKD", "Anemia of CKD", "Hypertension", "Proteinuria"] },
  4: { label: "Dialysis & Therapeutics", topics: ["Dialysis", "Dialysis Access", "Transplant", "Kidney Stones", "AIN", "Diuretics"] },
};
