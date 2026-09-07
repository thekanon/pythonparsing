import type { ContentItem, OfficialDomainId } from "./content-schema";
import {
  type DiagnosticAssessmentSet,
  validateDiagnosticAssessmentSet,
} from "./diagnostics";
import { C_CONCEPTS, SQL_CONCEPTS } from "./learning-engine";

type WeeklyDomain = Extract<OfficialDomainId, "sql" | "programming-language">;

type WeeklyDraft = Pick<
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
  | "estimatedMinutes"
> & {
  domainId: WeeklyDomain;
};

const WEEKLY_SET_ID = "weekly.sql-c.2026.v1";

const SOURCE_BY_DOMAIN: Record<WeeklyDomain, string> = {
  sql: "2026 Q-Net 정보처리기사 SQL 응용 범위",
  "programming-language": "2026 Q-Net 정보처리기사 프로그래밍 언어 활용 범위",
};

function weeklyItem(draft: WeeklyDraft): ContentItem {
  const [conceptId] = draft.conceptIds;
  if (!conceptId || draft.conceptIds.length !== 1) {
    throw new Error("weekly assessment items require exactly one concept");
  }

  return {
    schemaVersion: 1,
    id: `${WEEKLY_SET_ID}.${conceptId}`,
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
    estimatedMinutes: draft.estimatedMinutes,
    author: "doo-study",
    reviewStatus: "draft",
    rights: {
      source: SOURCE_BY_DOMAIN[draft.domainId],
      license: "original",
      notes: "공식 범위를 근거로 직접 작성한 주간 미니 테스트 문항",
    },
    changeReason: "주간 SQL/C 평가 v1",
    memoryInheritance: "reset",
    assessment: {
      setId: WEEKLY_SET_ID,
      pairId: conceptId,
      form: "weekly",
    },
  };
}

// prettier-ignore
const WEEKLY_DRAFTS: readonly WeeklyDraft[] = [
  {
    domainId: "sql",
    conceptIds: ["sql-table-row-column"],
    prerequisites: [],
    objective: "테이블의 열을 식별한다.",
    knowledgeType: "definition",
    prompt: "employees(id, name, dept) 테이블에서 name은 행, 열, 테이블 중 무엇인가?",
    answer: "열",
    explanation: "name은 각 행이 갖는 속성을 정의하는 열이다.",
    grading: { strategy: "exact", acceptedAnswers: ["열", "컬럼", "column"] },
    difficulty: 1,
    estimatedMinutes: 2,
  },
  {
    domainId: "sql",
    conceptIds: ["sql-select"],
    prerequisites: ["sql-table-row-column"],
    objective: "요구된 열을 조회하는 SQL을 작성한다.",
    knowledgeType: "sql",
    prompt: "employees(id, name)에서 name 열만 조회하는 SQL을 작성하시오.",
    answer: "SELECT name FROM employees;",
    explanation: "SELECT에 name을 지정하고 FROM에 employees를 지정한다.",
    grading: {
      strategy: "sql",
      requiredSqlClauses: ["SELECT name", "FROM employees"],
      forbiddenSqlTokens: ["DELETE", "UPDATE", "INSERT"],
    },
    difficulty: 2,
    estimatedMinutes: 3,
  },
  {
    domainId: "sql",
    conceptIds: ["sql-where"],
    prerequisites: ["sql-select"],
    objective: "WHERE로 조회 행을 제한한다.",
    knowledgeType: "sql",
    prompt: "employees(id, name, active)에서 active가 1인 직원의 name을 조회하는 SQL을 작성하시오.",
    answer: "SELECT name FROM employees WHERE active = 1;",
    explanation: "WHERE active = 1 조건으로 대상 행을 제한한다.",
    grading: {
      strategy: "sql",
      requiredSqlClauses: ["SELECT name", "FROM employees", "WHERE active"],
      forbiddenSqlTokens: ["DELETE", "UPDATE", "INSERT"],
    },
    difficulty: 2,
    estimatedMinutes: 3,
  },
  {
    domainId: "sql",
    conceptIds: ["sql-group"],
    prerequisites: ["sql-where"],
    objective: "그룹별 개수를 집계한다.",
    knowledgeType: "sql",
    prompt: "employees(id, dept)에서 부서별 직원 수를 dept와 cnt로 조회하는 SQL을 작성하시오.",
    answer: "SELECT dept, COUNT(*) AS cnt FROM employees GROUP BY dept;",
    explanation: "dept로 그룹화하고 COUNT(*)로 각 그룹의 행 수를 센다.",
    grading: {
      strategy: "sql",
      requiredSqlClauses: ["COUNT(*)", "FROM employees", "GROUP BY dept"],
      forbiddenSqlTokens: ["DELETE", "UPDATE", "INSERT"],
    },
    difficulty: 3,
    estimatedMinutes: 3,
  },
  {
    domainId: "sql",
    conceptIds: ["sql-join"],
    prerequisites: ["sql-select"],
    objective: "키 관계로 두 테이블을 결합한다.",
    knowledgeType: "sql",
    prompt: "users(id, name)와 orders(user_id, amount)에서 사용자 name과 주문 amount를 조회하는 SQL을 작성하시오.",
    answer: "SELECT users.name, orders.amount FROM users JOIN orders ON users.id = orders.user_id;",
    explanation: "users.id와 orders.user_id를 조인 조건으로 연결한다.",
    grading: {
      strategy: "sql",
      requiredSqlClauses: ["JOIN orders", "ON users.id", "orders.user_id"],
      forbiddenSqlTokens: ["DELETE", "UPDATE", "INSERT"],
    },
    difficulty: 3,
    estimatedMinutes: 3,
  },
  {
    domainId: "programming-language",
    conceptIds: ["c-value-type"],
    prerequisites: [],
    objective: "C 변수의 값을 추론한다.",
    knowledgeType: "code",
    prompt: "int x = 3; x += 2; 실행 후 x는?",
    answer: "5",
    explanation: "x에 2를 더하므로 최종 값은 5다.",
    grading: { strategy: "exact", acceptedAnswers: ["5"] },
    difficulty: 1,
    estimatedMinutes: 2,
  },
  {
    domainId: "programming-language",
    conceptIds: ["c-operator"],
    prerequisites: ["c-value-type"],
    objective: "C 나머지 연산 결과를 추론한다.",
    knowledgeType: "code",
    prompt: "int x = 7 % 3; 실행 후 x는?",
    answer: "1",
    explanation: "7을 3으로 나눈 나머지는 1이다.",
    grading: { strategy: "exact", acceptedAnswers: ["1"] },
    difficulty: 1,
    estimatedMinutes: 2,
  },
  {
    domainId: "programming-language",
    conceptIds: ["c-control-flow"],
    prerequisites: ["c-operator"],
    objective: "C 반복문의 누적 결과를 추론한다.",
    knowledgeType: "code",
    prompt: "int sum=0; for (int i=1; i<=3; i++) { sum += i; } 실행 후 sum은?",
    answer: "6",
    explanation: "1, 2, 3을 차례로 더하므로 6이다.",
    grading: { strategy: "exact", acceptedAnswers: ["6"] },
    difficulty: 2,
    estimatedMinutes: 2,
  },
  {
    domainId: "programming-language",
    conceptIds: ["c-array"],
    prerequisites: ["c-control-flow"],
    objective: "C 배열 인덱스로 값을 찾는다.",
    knowledgeType: "code",
    prompt: "int a[] = {3, 5, 7}; 실행 후 a[2]는?",
    answer: "7",
    explanation: "배열 인덱스는 0부터 시작하므로 a[2]는 세 번째 값 7이다.",
    grading: { strategy: "exact", acceptedAnswers: ["7"] },
    difficulty: 2,
    estimatedMinutes: 2,
  },
  {
    domainId: "programming-language",
    conceptIds: ["c-pointer"],
    prerequisites: ["c-array"],
    objective: "포인터 역참조가 원본 변수에 미치는 결과를 추론한다.",
    knowledgeType: "code",
    prompt: "int x=4; int *p=&x; *p += 5; 실행 후 x는?",
    answer: "9",
    explanation: "p가 x를 가리키므로 역참조 대입 후 x는 9다.",
    grading: { strategy: "exact", acceptedAnswers: ["9"] },
    difficulty: 3,
    estimatedMinutes: 3,
  },
];

export const WEEKLY_ASSESSMENT: DiagnosticAssessmentSet = {
  schemaVersion: 1,
  id: WEEKLY_SET_ID,
  form: "weekly",
  estimatedMinutes: 25,
  items: WEEKLY_DRAFTS.map(weeklyItem),
};

export function validateWeeklyAssessmentSet(value: unknown): string[] {
  const errors = validateDiagnosticAssessmentSet(value);
  if (errors.length > 0) return errors;

  const set = value as DiagnosticAssessmentSet;
  if (set.form !== "weekly") errors.push("weekly form is required");
  if (set.estimatedMinutes < 20 || set.estimatedMinutes > 30) {
    errors.push("weekly assessment must take 20 to 30 minutes");
  }
  const itemMinutes = set.items.reduce(
    (total, item) => total + item.estimatedMinutes,
    0,
  );
  if (itemMinutes !== set.estimatedMinutes) {
    errors.push("weekly item minutes must match set estimate");
  }

  const expectedConceptIds = [...SQL_CONCEPTS, ...C_CONCEPTS]
    .map((concept) => concept.id)
    .sort();
  const actualConceptIds = set.items.flatMap((item) => item.conceptIds).sort();
  if (actualConceptIds.join("\0") !== expectedConceptIds.join("\0")) {
    errors.push("weekly assessment must cover each SQL/C concept once");
  }

  return errors;
}
