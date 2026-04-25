import { ARTICLES, WEEKLY } from "../../data/constants";
import type { AdminSubView } from "../../types";

export type NavigateFn = (tab: string, subView?: AdminSubView) => void;
export type WeeklyData = typeof WEEKLY;
export type ArticlesData = typeof ARTICLES;
export type AdminSession = { uid: string; email: string };
export type AdminAuthMode = "signin" | "signup";
