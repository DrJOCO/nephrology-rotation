import type { SubView } from "../../../types";

export interface NavAction {
  label: string;
  meta: string;
  tab: string;
  subView?: SubView;
  /** Optional override — when set, the hero button calls this instead of navigating. */
  onClick?: () => void;
}

export interface LearningPlan {
  label: string;
  detail: string;
  detailParts: string[];
  remaining: number;
  done: number;
  total: number;
  completionRatio: number;
  nextAction: NavAction;
}

export interface HeroCard {
  eyebrow: string;
  title: string;
  body: string;
  tone: "rounds" | "didactic" | "clinic" | "wrap";
  badge: string;
  actions: NavAction[];
}

export interface StartChecklistItem {
  label: string;
  meta: string;
  done: boolean;
  action?: NavAction;
  scrollTargetId?: string;
}
