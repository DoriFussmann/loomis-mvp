import * as XLSX from "xlsx";
import type { EmployerExtractionResult } from "@/lib/employerApplication/schema";

export function exportEmployerApplicationToExcel(result: EmployerExtractionResult) {
  const rows: Array<[string, string]> = [];

  for (const section of result.sections) {
    rows.push([section.title, ""]);
    for (const field of section.fields) {
      rows.push([field.label, field.value || ""]);
    }
    rows.push(["", ""]);
  }

  const ws = XLSX.utils.aoa_to_sheet([["Field", "Value"], ...rows]);
  ws["!cols"] = [{ wch: 56 }, { wch: 72 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employer Application");
  XLSX.writeFile(wb, `Employer_Application_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
