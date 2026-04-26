import {
  ArrowLeftRight,
  Beaker,
  BookOpen,
  Bone,
  Cable,
  Circle,
  Container,
  Dna,
  Droplet,
  Droplets,
  Gauge,
  Gem,
  Heart,
  Microscope,
  Pill,
  RefreshCw,
  TestTube,
  TrendingDown,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Per-topic icon assignments for TopicBrowseView tiles. Topics not in this map
// fall through to BookOpen — the app stays shippable when curriculum adds new
// topics, with soft pressure to assign something more specific later.
//
// Pick icons that are clinically obvious (Heart for cardiorenal, Bone for MBD).
// If nothing obvious exists, leave the topic out and let it fall through —
// reaching for a clever icon hurts more than the generic fallback.
const TOPIC_ICONS: Record<string, LucideIcon> = {
  AKI: Zap,
  "Cardiorenal Syndrome": Heart,
  "Fluid Management": Droplet,
  CKD: TrendingDown,
  "Anemia of CKD": Droplets,
  "CKD-MBD": Bone,
  "Polycystic Kidney Disease": Circle,
  "APOL1-Associated Kidney Disease": Dna,
  "SGLT2 Inhibitors": Pill,
  Hyponatremia: Waves,
  Hypernatremia: Waves,
  "Acid-Base": Beaker,
  Glomerulonephritis: Microscope,
  Urinalysis: TestTube,
  Dialysis: RefreshCw,
  "Dialysis Access": Cable,
  "Peritoneal Dialysis": Container,
  Transplant: ArrowLeftRight,
  Hypertension: Gauge,
  "Kidney Stones": Gem,
};

export function getTopicIcon(topic: string): LucideIcon {
  return TOPIC_ICONS[topic] ?? BookOpen;
}
