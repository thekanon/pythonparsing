import type { ConceptNode } from "./types";

export const SQL_CONCEPTS: readonly ConceptNode[] = [
  {
    id: "sql-table-row-column",
    domainId: "sql",
    title: "테이블·행·열",
    prerequisites: [],
  },
  {
    id: "sql-select",
    domainId: "sql",
    title: "SELECT와 FROM",
    prerequisites: ["sql-table-row-column"],
  },
  {
    id: "sql-where",
    domainId: "sql",
    title: "WHERE 조건",
    prerequisites: ["sql-select"],
  },
  {
    id: "sql-group",
    domainId: "sql",
    title: "집계와 GROUP BY",
    prerequisites: ["sql-where"],
  },
  {
    id: "sql-join",
    domainId: "sql",
    title: "JOIN",
    prerequisites: ["sql-select"],
  },
] as const;

export const C_CONCEPTS: readonly ConceptNode[] = [
  {
    id: "c-value-type",
    domainId: "programming-language",
    title: "값·변수·자료형",
    prerequisites: [],
  },
  {
    id: "c-operator",
    domainId: "programming-language",
    title: "연산자",
    prerequisites: ["c-value-type"],
  },
  {
    id: "c-control-flow",
    domainId: "programming-language",
    title: "조건문과 반복문",
    prerequisites: ["c-operator"],
  },
  {
    id: "c-array",
    domainId: "programming-language",
    title: "배열",
    prerequisites: ["c-control-flow"],
  },
  {
    id: "c-pointer",
    domainId: "programming-language",
    title: "포인터",
    prerequisites: ["c-array"],
  },
] as const;

export function validateConceptGraph(nodes: readonly ConceptNode[]): string[] {
  const errors: string[] = [];
  const ids = new Set(nodes.map((node) => node.id));
  if (ids.size !== nodes.length) errors.push("concept ids must be unique");

  for (const node of nodes) {
    for (const prerequisite of node.prerequisites) {
      if (!ids.has(prerequisite)) {
        errors.push(`${node.id}: unknown prerequisite ${prerequisite}`);
      }
      if (prerequisite === node.id) {
        errors.push(`${node.id}: cannot depend on itself`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(nodes.map((node) => [node.id, node]));

  function visit(id: string): void {
    if (visiting.has(id)) {
      errors.push(`${id}: prerequisite cycle detected`);
      return;
    }
    if (visited.has(id)) return;

    visiting.add(id);
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) {
      visit(prerequisite);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const node of nodes) visit(node.id);
  return [...new Set(errors)];
}
