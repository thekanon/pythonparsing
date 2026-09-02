import type { ContentItem, OfficialDomainId } from "./content-schema";
import type { DiagnosticAssessmentSet } from "./diagnostics";

type DiagnosticDraft = Pick<
  ContentItem,
  | "conceptIds"
  | "prerequisites"
  | "objective"
  | "knowledgeType"
  | "prompt"
  | "answer"
  | "explanation"
  | "grading"
  | "difficulty"
> & {
  pairId: string;
  domainId: Extract<OfficialDomainId, "sql" | "programming-language">;
};

const SOURCE_BY_DOMAIN: Record<DiagnosticDraft["domainId"], string> = {
  sql: "2026 Q-Net 정보처리기사 SQL 응용 범위",
  "programming-language": "2026 Q-Net 정보처리기사 프로그래밍 언어 활용 범위",
};

function diagnosticItem(
  form: "baseline" | "followup",
  draft: DiagnosticDraft,
): ContentItem {
  return {
    schemaVersion: 1,
    id: `diagnostic.sql-c.2026.${form}.${draft.pairId}`,
    version: 1,
    officialYear: 2026,
    domainId: draft.domainId,
    conceptIds: draft.conceptIds,
    prerequisites: draft.prerequisites,
    objective: draft.objective,
    knowledgeType: draft.knowledgeType,
    prompt: draft.prompt,
    answer: draft.answer,
    explanation: draft.explanation,
    grading: draft.grading,
    difficulty: draft.difficulty,
    estimatedMinutes: 3,
    author: "doo-study",
    reviewStatus: "draft",
    rights: {
      source: SOURCE_BY_DOMAIN[draft.domainId],
      license: "original",
      notes: "공식 범위를 근거로 직접 작성한 동형 진단 문항",
    },
    changeReason: "8주 개인 검증 동형 진단 세트",
    memoryInheritance: "reset",
    assessment: {
      setId: "diagnostic.sql-c.2026",
      pairId: draft.pairId,
      form,
    },
  };
}

// prettier-ignore
const baselineDrafts: readonly DiagnosticDraft[] = [
  {
    pairId: "sql-filter",
    domainId: "sql",
    conceptIds: ["sql-select", "sql-where"],
    prerequisites: ["sql-table-row-column"],
    objective: "조건에 맞는 행에서 요구된 열만 조회하는 SQL을 작성한다.",
    knowledgeType: "sql",
    prompt:
      "employees(id, name, dept, salary)에서 dept가 '개발'인 직원의 name만 조회하는 SQL을 작성하시오.",
    answer: "SELECT name FROM employees WHERE dept = '개발';",
    explanation: "SELECT로 name을 지정하고 WHERE로 대상 행을 제한한다.",
    grading: {
      strategy: "sql",
      requiredSqlClauses: ["SELECT name", "FROM employees", "WHERE dept"],
      forbiddenSqlTokens: ["DELETE", "UPDATE", "INSERT"],
    },
    difficulty: 2,
  },
  {
    pairId: "sql-group",
    domainId: "sql",
    conceptIds: ["sql-group"],
    prerequisites: ["sql-where"],
    objective: "그룹별 합계를 계산하는 SQL을 작성한다.",
    knowledgeType: "sql",
    prompt:
      "orders(customer_id, amount)에서 고객별 주문 금액 합계를 customer_id와 total로 조회하시오.",
    answer:
      "SELECT customer_id, SUM(amount) AS total FROM orders GROUP BY customer_id;",
    explanation: "customer_id로 그룹화하고 amount의 합을 계산한다.",
    grading: {
      strategy: "sql",
      requiredSqlClauses: [
        "SUM(amount)",
        "FROM orders",
        "GROUP BY customer_id",
      ],
      forbiddenSqlTokens: ["DELETE", "UPDATE", "INSERT"],
    },
    difficulty: 3,
  },
  {
    pairId: "sql-join",
    domainId: "sql",
    conceptIds: ["sql-join"],
    prerequisites: ["sql-select"],
    objective: "키 관계를 이용해 두 테이블의 열을 결합한다.",
    knowledgeType: "sql",
    prompt:
      "users(id, name)와 tickets(user_id, title)에서 사용자 name과 티켓 title을 조회하시오.",
    answer:
      "SELECT users.name, tickets.title FROM users JOIN tickets ON users.id = tickets.user_id;",
    explanation: "users.id와 tickets.user_id를 조인 조건으로 연결한다.",
    grading: {
      strategy: "sql",
      requiredSqlClauses: ["JOIN tickets", "ON users.id", "tickets.user_id"],
      forbiddenSqlTokens: ["DELETE", "UPDATE", "INSERT"],
    },
    difficulty: 3,
  },
  {
    pairId: "c-control",
    domainId: "programming-language",
    conceptIds: ["c-control-flow"],
    prerequisites: ["c-operator"],
    objective: "C 반복문의 상태 변화를 실행 없이 추론한다.",
    knowledgeType: "code",
    prompt:
      "int x = 2; for (int i = 0; i < 3; i++) { x += i; } 실행 후 x는?",
    answer: "5",
    explanation: "x에 0, 1, 2가 더해져 5가 된다.",
    grading: { strategy: "exact", acceptedAnswers: ["5"] },
    difficulty: 2,
  },
  {
    pairId: "c-array",
    domainId: "programming-language",
    conceptIds: ["c-array"],
    prerequisites: ["c-control-flow"],
    objective: "C 배열 순회 결과를 실행 없이 추론한다.",
    knowledgeType: "code",
    prompt:
      "int a[] = {1,3,5,7}; int sum=0; 네 원소를 모두 더한 뒤 sum은?",
    answer: "16",
    explanation: "1+3+5+7은 16이다.",
    grading: { strategy: "exact", acceptedAnswers: ["16"] },
    difficulty: 2,
  },
  {
    pairId: "c-pointer",
    domainId: "programming-language",
    conceptIds: ["c-pointer"],
    prerequisites: ["c-array"],
    objective: "C 포인터 역참조가 원본 변수에 미치는 결과를 추론한다.",
    knowledgeType: "code",
    prompt: "int x=7; int *p=&x; *p += 3; 실행 후 x는?",
    answer: "10",
    explanation: "p가 x를 가리키므로 x도 10이 된다.",
    grading: { strategy: "exact", acceptedAnswers: ["10"] },
    difficulty: 3,
  },
];

// prettier-ignore
const followupDrafts: readonly DiagnosticDraft[] = [
  {
    ...baselineDrafts[0]!,
    prompt:
      "members(id, name, team)에서 team이 'QA'인 구성원의 name만 조회하는 SQL을 작성하시오.",
    answer: "SELECT name FROM members WHERE team = 'QA';",
    grading: {
      strategy: "sql",
      requiredSqlClauses: ["SELECT name", "FROM members", "WHERE team"],
      forbiddenSqlTokens: ["DELETE", "UPDATE", "INSERT"],
    },
  },
  {
    ...baselineDrafts[1]!,
    prompt:
      "sales(product_id, quantity)에서 상품별 판매 수량 합계를 product_id와 total로 조회하시오.",
    answer:
      "SELECT product_id, SUM(quantity) AS total FROM sales GROUP BY product_id;",
    grading: {
      strategy: "sql",
      requiredSqlClauses: [
        "SUM(quantity)",
        "FROM sales",
        "GROUP BY product_id",
      ],
      forbiddenSqlTokens: ["DELETE", "UPDATE", "INSERT"],
    },
  },
  {
    ...baselineDrafts[2]!,
    prompt:
      "authors(id, name)와 books(author_id, title)에서 저자 name과 도서 title을 조회하시오.",
    answer:
      "SELECT authors.name, books.title FROM authors JOIN books ON authors.id = books.author_id;",
    grading: {
      strategy: "sql",
      requiredSqlClauses: ["JOIN books", "ON authors.id", "books.author_id"],
      forbiddenSqlTokens: ["DELETE", "UPDATE", "INSERT"],
    },
  },
  {
    ...baselineDrafts[3]!,
    prompt:
      "int y = 4; for (int i = 1; i <= 3; i++) { y += i; } 실행 후 y는?",
    answer: "10",
    grading: { strategy: "exact", acceptedAnswers: ["10"] },
  },
  {
    ...baselineDrafts[4]!,
    prompt:
      "int a[] = {2,4,6,8}; int sum=0; 네 원소를 모두 더한 뒤 sum은?",
    answer: "20",
    grading: { strategy: "exact", acceptedAnswers: ["20"] },
  },
  {
    ...baselineDrafts[5]!,
    prompt: "int y=12; int *p=&y; *p -= 5; 실행 후 y는?",
    answer: "7",
    grading: { strategy: "exact", acceptedAnswers: ["7"] },
  },
];

export const BASELINE_DIAGNOSTIC: DiagnosticAssessmentSet = {
  schemaVersion: 1,
  id: "diagnostic.sql-c.2026.baseline",
  form: "baseline",
  estimatedMinutes: 18,
  items: baselineDrafts.map((draft) => diagnosticItem("baseline", draft)),
};

export const FOLLOWUP_DIAGNOSTIC: DiagnosticAssessmentSet = {
  schemaVersion: 1,
  id: "diagnostic.sql-c.2026.followup",
  form: "followup",
  estimatedMinutes: 18,
  items: followupDrafts.map((draft) => diagnosticItem("followup", draft)),
};
