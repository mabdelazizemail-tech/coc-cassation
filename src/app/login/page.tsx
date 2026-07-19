"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "./actions";
import { APP_NAME, APP_SHORT } from "@/lib/constants";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
      {pending ? "جارٍ الدخول..." : "تسجيل الدخول"}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, null as null | { error: string });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-800 to-brand-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.avif"
            alt="شعار مجلس القضاء الأعلى"
            className="mx-auto mb-4 h-28 w-28 object-contain drop-shadow-lg"
          />
          <h1 className="text-xl font-bold">{APP_SHORT}</h1>
          <p className="text-brand-100 text-sm mt-1">{APP_NAME}</p>
        </div>

        <div className="card p-6">
          <form action={action} className="space-y-4">
            <div>
              <label className="label" htmlFor="username">اسم المستخدم</label>
              <input id="username" name="username" className="input" autoComplete="username" required />
            </div>
            <div>
              <label className="label" htmlFor="password">كلمة المرور</label>
              <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
            </div>

            {state?.error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{state.error}</p>
            )}

            <SubmitButton />
          </form>

          <div className="mt-4 text-xs text-muted-foreground border-t pt-3 leading-relaxed">
            حسابات تجريبية: <code>admin</code>, <code>secretary</code>, <code>member1</code>, <code>judge1</code> — كلمة المرور الافتراضية <code>Admin@12345</code>
          </div>
        </div>

        <p className="text-center text-brand-200 text-xs mt-4">
          سري - وزارة العدل المصرية
        </p>
      </div>
    </div>
  );
}
