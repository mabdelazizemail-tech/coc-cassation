"use client";

import { useState } from "react";
import { JUDGE_CATEGORIES } from "@/lib/constants";
import { Icon } from "./Icon";

export function JudgeCategories({
  sections,
}: {
  sections: Record<string, React.ReactNode>;
}) {
  const [active, setActive] = useState(JUDGE_CATEGORIES[0].key);
  const activeCat = JUDGE_CATEGORIES.find((c) => c.key === active);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="card p-2 h-fit lg:sticky lg:top-24">
        <nav className="space-y-0.5">
          {JUDGE_CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`w-full text-right rounded-lg px-3 py-2 text-[13px] flex items-center gap-2.5 transition-colors ${
                active === c.key
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon
                name={c.icon}
                className={`h-4 w-4 shrink-0 ${active === c.key ? "text-gold" : "text-muted-foreground"}`}
              />
              {c.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="lg:col-span-3">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-tile !h-10 !w-10">
              <Icon name={activeCat?.icon ?? "file"} className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{activeCat?.label}</h2>
          </div>
          {sections[active] ?? (
            <p className="text-muted-foreground text-sm">لا توجد بيانات مسجّلة في هذه الفئة.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number | null | undefined)[][];
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">لا توجد سجلات.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th key={c} className="th">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-muted/40">
              {r.map((cell, j) => (
                <td key={j} className="td">{cell ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
