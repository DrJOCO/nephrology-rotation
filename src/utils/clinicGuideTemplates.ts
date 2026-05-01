import { CLINIC_GUIDES, CLINIC_GUIDE_TOPICS, type ClinicGuideTemplate, type ClinicGuideTemplates, type ClinicGuideTopic } from "../data/clinicGuides";

type EditableClinicGuideTemplate = Partial<Omit<ClinicGuideTemplate, "sections">> & {
  sections?: Array<Partial<ClinicGuideTemplate["sections"][number]>>;
};

type ClinicGuideTemplateInput = Partial<Record<ClinicGuideTopic, EditableClinicGuideTemplate>>;

function cleanText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanSections(value: unknown, fallback: ClinicGuideTemplate["sections"]): ClinicGuideTemplate["sections"] {
  if (!Array.isArray(value)) {
    return fallback.map((section) => ({ heading: section.heading, items: [...section.items] }));
  }

  return value
    .filter((section): section is Partial<ClinicGuideTemplate["sections"][number]> => typeof section === "object" && section !== null)
    .map((section) => ({
      heading: cleanText(section.heading, "Section"),
      items: cleanList(section.items, []),
    }))
    .filter((section) => section.heading || section.items.length > 0);
}

export function cloneClinicGuideTemplate(template: ClinicGuideTemplate): ClinicGuideTemplate {
  return {
    ...template,
    beforePresenting: [...template.beforePresenting],
    sections: template.sections.map((section) => ({ heading: section.heading, items: [...section.items] })),
    commonMistakes: [...template.commonMistakes],
    teachingPoints: [...template.teachingPoints],
    discussionQuestions: [...template.discussionQuestions],
    guidelineBasis: [...template.guidelineBasis],
  };
}

export function normalizeClinicGuideTemplate(
  topic: ClinicGuideTopic,
  template?: EditableClinicGuideTemplate | null,
): ClinicGuideTemplate {
  const base = CLINIC_GUIDES[topic];

  return {
    topic,
    icon: cleanText(template?.icon, base.icon),
    title: cleanText(template?.title, base.title),
    subtitle: cleanText(template?.subtitle, base.subtitle),
    whyItMatters: cleanText(template?.whyItMatters, base.whyItMatters),
    teachingPearl: cleanText(template?.teachingPearl, base.teachingPearl),
    beforePresenting: cleanList(template?.beforePresenting, base.beforePresenting),
    howToPresent: cleanText(template?.howToPresent, base.howToPresent),
    sections: cleanSections(template?.sections, base.sections),
    commonMistakes: cleanList(template?.commonMistakes, base.commonMistakes),
    teachingPoints: cleanList(template?.teachingPoints, base.teachingPoints),
    discussionQuestions: cleanList(template?.discussionQuestions, base.discussionQuestions),
    guidelineBasis: cleanList(template?.guidelineBasis, base.guidelineBasis),
  };
}

export function normalizeClinicGuideTemplates(templates?: ClinicGuideTemplateInput | null): ClinicGuideTemplates {
  return CLINIC_GUIDE_TOPICS.reduce((acc, topic) => {
    acc[topic] = normalizeClinicGuideTemplate(topic, templates?.[topic]);
    return acc;
  }, {} as ClinicGuideTemplates);
}
