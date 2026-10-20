import data from "../questions-anpi-demo.json";
import { shuffleArray, shuffleQuestionOptions } from "./exams";

export const ANPI_DOMAINS = data;
export const ANPI_DURATION_MIN = 30;
export const ANPI_PASS_PCT = 60;
export const ANPI_LETTERS = ["أ", "ب", "ج", "د"];

export function buildAnpiBank() {
  const flat = ANPI_DOMAINS.flatMap((domain, domainIndex) =>
    domain.questions.map((question, questionIndex) => ({
      ...question,
      domain: domain.domain,
      domainIndex,
      id: `anpi-${domainIndex}-${questionIndex}`,
    }))
  );
  return { domains: ANPI_DOMAINS, flat, total: flat.length };
}

export function shuffleAnpiBank(flat) {
  return shuffleArray(flat).map(shuffleQuestionOptions);
}
