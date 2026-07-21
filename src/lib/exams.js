import excelData from "../questions-excel.json";
import wordData from "../questions-word.json";
import powerpointData from "../questions-powerpoint.json";
import excelExpertData from "../questions-excel-expert.json";

export const EXAMS = {
  excel2016: {
    id: "excel2016",
    title: "Spécialiste en Microsoft Excel 2016",
    short: "Excel 2016",
    data: excelData,
    color: "#1D6F42",
    colorDark: "#14512F",
  },
  word2016: {
    id: "word2016",
    title: "Spécialiste en Microsoft Word 2016",
    short: "Word 2016",
    data: wordData,
    color: "#2B579A",
    colorDark: "#1B3F72",
  },
  powerpoint2016: {
    id: "powerpoint2016",
    title: "Spécialiste en Microsoft PowerPoint 2016",
    short: "PowerPoint 2016",
    data: powerpointData,
    color: "#B7472A",
    colorDark: "#8A3520",
  },
  excelexpert2016: {
    id: "excelexpert2016",
    title: "Spécialiste Expert en Microsoft Excel 2016",
    short: "Excel Expert 2016",
    data: excelExpertData,
    color: "#0F6B3A",
    colorDark: "#0A4A28",
  },
};

export const DEFAULT_EXAM = "excel2016";

export function buildBank(examId) {
  const exam = EXAMS[examId] || EXAMS[DEFAULT_EXAM];
  const DOMAINS = exam.data;
  const FLAT = DOMAINS.flatMap((d, di) =>
    d.questions.map((q, qi) => ({
      ...q,
      domain: d.domain,
      domainIndex: di,
      id: `${di}-${qi}`,
    }))
  );
  return { exam, DOMAINS, FLAT, TOTAL: FLAT.length };
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleQuestionOptions(q) {
  const order = shuffleArray(q.opts.map((_, i) => i));
  return {
    ...q,
    opts: order.map((i) => q.opts[i]),
    ans: order.indexOf(q.ans),
  };
}

// Domains stay in their defined order; within each domain, the questions are
// shuffled, and within each question, the answer options are shuffled.
export function shuffleExam(flat) {
  const byDomain = [];
  flat.forEach((q) => {
    (byDomain[q.domainIndex] ??= []).push(q);
  });
  const ordered = [];
  byDomain.forEach((group) => {
    shuffleArray(group).forEach((q) => ordered.push(shuffleQuestionOptions(q)));
  });
  return ordered;
}

export const PASS_PCT = 70;
export const DURATION_MIN = 60;
export const LETTERS = ["A", "B", "C", "D"];
