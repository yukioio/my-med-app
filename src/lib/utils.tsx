import React from "react";

/** 表示用の日本語日時（例: 2024年06月13日 21時24分17秒） */
export function getJapaneseDatetime() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(
    now.getHours()
  )}時${pad(now.getMinutes())}分${pad(now.getSeconds())}秒`;
}

/** セッションID用の短い日時文字列（例: 20240613_212417） */
export function getJapaneseSessionId() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/** Google Material 風 cubic-bezier(0.4, 0, 0.2, 1) イージング */
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** テーブルセル内の改行 / <br> を ul/li に変換する（複数行の場合のみ） */
export function splitCellTextToList(text: string): React.ReactNode {
  const items = text
    .split(/<br\s*\/?>|\n/g)
    .map((str) => str.trim())
    .filter(Boolean);
  if (items.length <= 1) return null;
  return (
    <ul className="gemini-fake-ul">
      {items.map((item, i) => (
        <li key={i} style={{ margin: "0.18em 0", paddingLeft: "0.1em", fontSize: "0.92em" }}>
          {item}
        </li>
      ))}
    </ul>
  );
}
