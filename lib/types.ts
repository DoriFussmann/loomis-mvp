export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "user";
  allowedPages: string[];
}

export interface PageVariable {
  name: string;
  description: string;
}

export interface AppPage {
  id: string;
  name: string;
  slug: string;
  description: string;
  variables: PageVariable[];
}

export interface Prompt {
  id: string;
  name: string;
  pageSlug: string;
  template: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionPayload {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  allowedPages: string[];
}
