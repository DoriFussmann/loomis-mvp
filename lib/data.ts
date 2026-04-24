import fs from "fs";
import path from "path";
import type { User, AppPage, Prompt } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function readFile<T>(filename: string): T[] {
  const filepath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filepath, "utf-8");
  return JSON.parse(raw) as T[];
}

function writeFile<T>(filename: string, data: T[]): void {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

// Users
export function getUsers(): User[] { return readFile<User>("users.json"); }
export function saveUsers(users: User[]): void { writeFile("users.json", users); }
export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}
export function getUserByEmail(email: string): User | undefined {
  return getUsers().find((u) => u.email === email);
}

// Pages
export function getPages(): AppPage[] { return readFile<AppPage>("pages.json"); }
export function savePages(pages: AppPage[]): void { writeFile("pages.json", pages); }
export function getPageBySlug(slug: string): AppPage | undefined {
  return getPages().find((p) => p.slug === slug);
}

// Prompts
export function getPrompts(): Prompt[] { return readFile<Prompt>("prompts.json"); }
export function savePrompts(prompts: Prompt[]): void { writeFile("prompts.json", prompts); }
export function getPromptById(id: string): Prompt | undefined {
  return getPrompts().find((p) => p.id === id);
}
export function getPromptsByPage(slug: string): Prompt[] {
  return getPrompts().filter((p) => p.pageSlug === slug);
}
