import type { Department } from "./types";

export function getDefaultRouteForDepartments(departments: Department[]): "/admin" | "/pnc" | "/benefits" | "/login" {
  const hasPnC = departments.includes("P&C");
  const hasBenefits = departments.includes("Benefits");

  if (hasPnC && hasBenefits) return "/admin";
  if (hasPnC) return "/pnc";
  if (hasBenefits) return "/benefits";
  return "/login";
}
