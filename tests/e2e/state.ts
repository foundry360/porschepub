import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

export const STATE_FILE = ".artifacts/e2e-state.json";
export const EDITOR_AUTH = ".artifacts/e2e-editor-auth.json";
export const LEAD_IMAGE = ".artifacts/e2e-lead.jpg";
export const ADMIN_AUTH = ".artifacts/e2e-admin-auth.json";

export type E2EState = {
  run: string;
  editor: { id: string; email: string; password: string };
  admin: { id: string; email: string; password: string };
  stranger: { id: string; email: string; password: string };
  contributorName: string;
  contributorSlug: string;
  categoryName: string;
  categorySlug: string;
};

export function newRun() {
  return `e2e-${randomUUID().slice(0, 8)}`;
}

export function saveState(state: E2EState) {
  mkdirSync(".artifacts", { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state));
}

export function loadState(): E2EState {
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as E2EState;
}
