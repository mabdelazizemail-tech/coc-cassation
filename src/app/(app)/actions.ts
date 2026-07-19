"use server";

import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function logoutAction() {
  const s = await getSession();
  if (s) await writeAudit({ actorId: s.id, action: "LOGOUT", entity: "User", entityId: s.id });
  await destroySession();
  redirect("/login");
}
