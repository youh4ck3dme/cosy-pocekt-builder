export interface DiffLine {
  type: "same" | "add" | "remove";
  text: string;
}

/**
 * Longest Common Subsequence (LCS) line-by-line diff algorithm.
 * Pure TypeScript, fast and robust for comparing original vs. improved prompts.
 */
export function diffLines(a: string, b: string): DiffLine[] {
  const left = a.split("\n");
  const right = b.split("\n");
  const n = left.length;
  const m = right.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const at = (i: number, j: number) => dp[i]?.[j] ?? 0;
  const l = (i: number) => left[i] ?? "";
  const r = (j: number) => right[j] ?? "";

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const row = dp[i];
      if (!row) continue;
      row[j] = l(i) === r(j) ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (l(i) === r(j)) {
      out.push({ type: "same", text: l(i) });
      i++;
      j++;
    } else if (at(i + 1, j) >= at(i, j + 1)) {
      out.push({ type: "remove", text: l(i) });
      i++;
    } else {
      out.push({ type: "add", text: r(j) });
      j++;
    }
  }
  while (i < n) out.push({ type: "remove", text: l(i++) });
  while (j < m) out.push({ type: "add", text: r(j++) });
  return out;
}
