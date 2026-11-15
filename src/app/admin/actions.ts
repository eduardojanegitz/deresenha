"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ADMIN_GAMES,
  challengeSchema,
  createTheme,
  setChallengeStatus,
  themeSchema,
  updateGameSettings,
  updateTheme,
  upsertChallenge,
} from "@/server/admin/repo";
import { login, logout, requireAdmin } from "@/server/admin/session";
import { invalidateContent } from "@/server/content";

/**
 * Ações do painel. Toda ação confere a sessão antes de qualquer coisa (as Server Actions do
 * Next também conferem a origem do pedido, o que protege contra CSRF junto com o cookie
 * SameSite=Strict).
 */

export type FormState = { error?: string; ok?: string } | undefined;

const changed = () => {
  invalidateContent();
  revalidatePath("/admin", "layout");
};

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const res = await login(String(form.get("password") ?? ""));
  if (!res.ok) return { error: res.message };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/entrar");
}

export async function saveChallengeAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = challengeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  let id: string;
  try {
    id = await upsertChallenge(parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
  changed();
  redirect(`/admin/desafios?salvo=${encodeURIComponent(id)}`);
}

export async function setStatusAction(form: FormData) {
  await requireAdmin();
  const p = z.object({ id: z.string().min(1).max(120), status: z.enum(["published", "draft", "archived"]) }).safeParse(Object.fromEntries(form));
  if (!p.success) return;
  await setChallengeStatus(p.data.id, p.data.status);
  changed();
}

export async function createThemeAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const p = themeSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message };
  if (!(await createTheme(p.data))) return { error: `Já existe um tema com o identificador “${p.data.id}”.` };
  changed();
  return { ok: `Tema “${p.data.label}” criado.` };
}

export async function updateThemeAction(form: FormData) {
  await requireAdmin();
  const p = z
    .object({ id: z.string().min(1).max(30), label: z.string().trim().min(2).max(40).optional(), active: z.enum(["true", "false"]).optional() })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return;
  await updateTheme(p.data.id, { label: p.data.label, active: p.data.active === undefined ? undefined : p.data.active === "true" });
  changed();
}

export async function saveGameSettingsAction(form: FormData) {
  await requireAdmin();
  const p = z
    .object({ game: z.enum(ADMIN_GAMES), enabled: z.enum(["true", "false"]), defaultRounds: z.coerce.number().int().min(1).max(20) })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return;
  await updateGameSettings(p.data.game, p.data.enabled === "true", p.data.defaultRounds);
  changed();
}
