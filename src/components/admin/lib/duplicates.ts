import type { AdminStudent } from "../../../types";

function normalizeStudentName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildDuplicateNameGroups(students: AdminStudent[]): AdminStudent[][] {
  const groups = students.reduce((map, student) => {
    const key = normalizeStudentName(student.name);
    if (!key) return map;
    const current = map.get(key) || [];
    current.push(student);
    map.set(key, current);
    return map;
  }, new Map<string, AdminStudent[]>());

  return Array.from(groups.values())
    .filter((group) => group.length > 1)
    .sort((a, b) => a[0].name.localeCompare(b[0].name));
}

export function buildDuplicateStudentIdSet(groups: AdminStudent[][]): Set<string | number> {
  return groups.reduce((ids, group) => {
    group.forEach((student) => ids.add(student.id));
    return ids;
  }, new Set<string | number>());
}
