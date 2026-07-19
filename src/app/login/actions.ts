"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function loginAction(_prev: unknown, formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "يرجى إدخال اسم المستخدم وكلمة المرور" };
  }

  const user = await authenticate(username, password);
  if (!user) {
    return { error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
  }

  await createSession(user);
  await writeAudit({ actorId: user.id, action: "LOGIN", entity: "User", entityId: user.id });
  redirect("/dashboard");
}
