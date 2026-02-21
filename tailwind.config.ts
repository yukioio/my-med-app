import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            // 全体の行間を広くして、文字を詰まらせない
            lineHeight: '1.75',
            // 見出し（h1〜h4）を力強く、色を濃いネイビーに
            'h1, h2, h3, h4': {
              color: '#1e3a8a', // text-blue-900
              fontWeight: '700',
              marginTop: '1.5em',
              marginBottom: '0.5em',
            },
            // 段落の余白
            p: {
              marginTop: '1em',
              marginBottom: '1em',
            },
            // リストの点をハッキリさせる
            'ul > li::marker': {
              color: '#3b82f6', // text-blue-500
            },
            // --- テーブルの設定（枠線・ヘッダー背景・セル余白で視認性確保） ---
            table: {
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              border: '1px solid #e2e8f0',
            },
            'thead th': {
              backgroundColor: '#f8fafc',
              padding: '0.75rem 1rem',
              border: '1px solid #e2e8f0',
              textAlign: 'left',
            },
            'tbody td': {
              padding: '0.75rem 1rem',
              border: '1px solid #e2e8f0',
              verticalAlign: 'top',
            },
          },
        },
      },
    },
  },
  plugins: [
    typography,
  ],
};

export default config;