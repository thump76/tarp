"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { importTraders, type NewTrader } from "../actions";

/** Minimal CSV/TSV parser: handles quoted fields, commas or tabs (pasted from a spreadsheet). */
function parse(text: string): string[][] {
  const delim = text.includes("\t") && !text.split("\n")[0].includes(",") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

const aliases: Record<keyof NewTrader, string[]> = {
  business_name: ["business_name", "business", "business name", "trading name", "stall", "name of business"],
  contact_name: ["contact_name", "contact", "contact name", "name", "your name"],
  email: ["email", "email address", "e-mail"],
  phone: ["phone", "mobile", "telephone", "phone number"],
  category: ["category", "type", "what they sell", "products"],
  markets: ["markets", "market", "venues", "locations"],
};

function toTraders(rows: string[][]): NewTrader[] {
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (k: keyof NewTrader) => head.findIndex((h) => aliases[k].includes(h));
  const idx = Object.fromEntries((Object.keys(aliases) as (keyof NewTrader)[]).map((k) => [k, col(k)])) as Record<keyof NewTrader, number>;
  return rows.slice(1).map((r) => {
    const v = (k: keyof NewTrader) => (idx[k] >= 0 ? (r[idx[k]] ?? "").trim() : "");
    return {
      business_name: v("business_name"), contact_name: v("contact_name"), email: v("email"), phone: v("phone"),
      category: v("category"), markets: v("markets").split(/[;|]/).map((s) => s.trim()).filter(Boolean),
    };
  });
}

export function ImportForm() {
  const [text, setText] = useState("");
  const [notify, setNotify] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: string[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const traders = useMemo(() => toTraders(parse(text)), [text]);

  async function onFile(f: File | undefined) {
    if (f) setText(await f.text());
  }

  function go() {
    setErr(null);
    start(async () => {
      try { setResult(await importTraders(traders, notify)); setText(""); }
      catch (e) { setErr(e instanceof Error ? e.message : "Import failed"); }
    });
  }

  if (result) {
    return (
      <div className="mt-8 rounded-2xl bg-card p-5">
        <p className="display text-xl font-semibold">{result.added} trader{result.added === 1 ? "" : "s"} added</p>
        {result.skipped.length > 0 && (
          <div className="mt-3 text-sm"><p className="font-semibold">Skipped</p>
            <ul className="mt-1 list-disc pl-5 text-muted">{result.skipped.map((s) => <li key={s}>{s}</li>)}</ul></div>
        )}
        <div className="mt-4 flex gap-2">
          <Link href="/admin/traders" className="btn btn-primary">See traders</Link>
          <button className="btn btn-ghost" onClick={() => setResult(null)}>Import more</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn btn-ghost cursor-pointer">Choose CSV file
          <input type="file" accept=".csv,text/csv,.tsv,text/plain" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <span className="text-sm text-muted">or paste below, including the header row</span>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} spellCheck={false}
        className="w-full rounded-xl border border-line bg-white/60 p-3 font-mono text-sm" placeholder="business_name,contact_name,email,phone,category,markets" />

      {traders.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl bg-card">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Business</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Markets</th>
              </tr></thead>
              <tbody>
                {traders.map((t, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2 font-semibold text-ink-strong">{t.business_name || <span className="text-red">missing</span>}</td>
                    <td className="px-3 py-2">{t.contact_name}</td>
                    <td className="px-3 py-2">{t.email || <span className="text-red">missing</span>}</td>
                    <td className="px-3 py-2">{t.category}</td>
                    <td className="px-3 py-2">{t.markets?.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[var(--ink-strong)]" />
            Email each trader a sign-in link now (leave off to add them quietly and tell them later)
          </label>
          {err && <p className="text-sm text-red">{err}</p>}
          <div><button className="btn btn-primary" onClick={go} disabled={pending}>{pending ? "Importing" : `Import ${traders.length} trader${traders.length === 1 ? "" : "s"}`}</button></div>
        </>
      )}
    </div>
  );
}
