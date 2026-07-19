// Arabic-Indic numeral formatting (matches the reference UI: ٢٬١٤٧).
const nf = new Intl.NumberFormat("ar-EG");
const pf = new Intl.NumberFormat("ar-EG", { style: "percent", maximumFractionDigits: 0 });

export function fmtNum(n: number): string {
  return nf.format(n);
}

export function fmtPct(ratio: number): string {
  return pf.format(Number.isFinite(ratio) ? ratio : 0);
}

export function fmtDate(d?: Date | null): string {
  return d ? d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }) : "—";
}

export function fmtDateShort(d?: Date | null): string {
  return d ? d.toLocaleDateString("ar-EG") : "—";
}

export function timeAgo(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${fmtNum(mins)} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${fmtNum(hours)} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${fmtNum(days)} يوم`;
}
