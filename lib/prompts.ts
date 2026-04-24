/**
 * Interpolates {{variableName}} placeholders in a prompt template.
 * Variables must match the page's variables[] array.
 * This runs server-side only — users never see raw templates.
 */
export function interpolatePrompt(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

/**
 * Extracts variable names from a prompt template.
 * Used in Admin UI to show which variables a template uses.
 */
export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  return Array.from(new Set([...matches].map((m) => m[1])));
}
