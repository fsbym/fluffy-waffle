import { GENESIS_HASH, type LedgerEntry } from "./types";

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type VerifyResult = { ok: true; count: number; head: string } | { ok: false; seq: number; problem: string };

/**
 * 逐条验证：hash 必须等于 sha256(prev_hash + "\n" + body)，并且 prev_hash 必须等于上一条的 hash。
 * 任何一条被改过、删过或插队，都会在这里对不上。
 */
export async function verifyLedger(entries: LedgerEntry[]): Promise<VerifyResult> {
  let prev = GENESIS_HASH;
  for (const entry of entries) {
    if (entry.prev_hash !== prev) return { ok: false, seq: entry.seq, problem: "和上一条记录接不上（有记录被删除或插入）" };
    if ((await sha256Hex(`${entry.prev_hash}\n${entry.body}`)) !== entry.hash) return { ok: false, seq: entry.seq, problem: "内容被改动过（哈希不符）" };
    prev = entry.hash;
  }
  return { ok: true, count: entries.length, head: prev };
}
