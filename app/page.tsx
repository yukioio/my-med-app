"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// --- 設定 ---
const BACKEND_URL =
  "https://medical-ai-engine-backend-895886568528.asia-northeast1.run.app";

// メッセージの型定義
type Message = {
  id: string;
  role: string;
  content: string;
};

type Session = {
  id: string;
  name: string; // チャット名
};

const markdownStyle = `
.prose {
  line-height: 1.92 !important;
  font-size: 1.08rem;
  color: #1e293b;
  word-break: break-word;
}
.prose :where(p, ul, ol, blockquote, pre, table) {
  margin-bottom: 1.42em;
  margin-top: 1.18em;
}
.prose :where(h1, h2, h3, h4) {
  margin-top: 2.0em;
  margin-bottom: 1.1em;
  line-height: 1.22;
}
.prose h1, .prose h2, .prose h3 {
  color: #1e3a8a;
  font-weight: 800;
}
.prose h1 { font-size: 2.25rem; }
.prose h2 { font-size: 1.65rem; }
.prose h3 { font-size: 1.3rem; }
.prose ul, .prose ol { margin-left: 1.5em; }
.prose strong { font-weight: 700; color: #334155; }
.prose code {
  font-size: 0.98em;
  background: #f5f7fa;
  padding: 0.19em 0.42em;
  border-radius: 0.35em;
  color: #7c3aed;
}
.prose pre {
  background: #f5f7fa;
  border-radius: 0.5em;
  padding: 1.1em 1.3em;
  font-size: 0.98em;
  overflow-x: auto;
}
.prose blockquote {
  border-left: 4px solid #60a5fa;
  background: #f0f7fa;
  color: #12406a;
  padding: .75em 1.5em;
  border-radius: 0 0.5em 0.5em 0;
  font-style: italic;
}
.prose hr {
  border: none;
  border-top: 1.2px solid #e4e4e7;
  margin: 2em 0;
}
/* === テーブル内の行間・パディング・文字 ここで制御 === */
.prose table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid #e4e4e7;
  background-color: #fff;
  margin-bottom: 2em;
  margin-top: 2em;
  font-size: 0.94em;
}
.prose thead {
  background-color: #f4f4f5;
}
.prose thead tr th {
  color: #1e293b;
  font-weight: 700;
  background-color: #f4f4f5;
  padding: 1.05em 1.1em;
  font-size: 0.95em;
  border-bottom: 2px solid #e4e4e7;
  line-height: 1.35;
}
.prose tbody tr {
  border-top: none !important;
}
.prose tbody tr:nth-child(even) {
  background-color: rgba(244,244,245,0.58);
}
.prose tbody td {
  border-top: 1px solid #e4e4e7;
  padding: 1.09em 1.2em;
  vertical-align: top;
  font-size: 0.89em;
  line-height: 1.4 !important;
}
.prose tbody td ul {
  padding-left: 1.1em;
  margin: 0.20em 0;
}
.prose tbody td li {
  margin: 0.10em 0;
  padding-left: 0.2em;
  font-size: 0.92em;
  line-height: 1.3 !important;
  list-style-type: disc;
  list-style-position: inside;
}
`;

// 日時生成
function getJapaneseDatetime() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  // 例: 2024年06月13日 21時24分17秒
  return `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(
    now.getHours()
  )}時${pad(now.getMinutes())}分${pad(now.getSeconds())}秒`;
}
function getJapaneseSessionId() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// Google Material cubic-bezier(0.4, 0, 0.2, 1)
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ==== テーブルのbrをul/liへ変換するロジック =====
function splitCellTextToList(text: string) {
  // 改行または <br> で分割
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

const markdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    return (
      <code
        className={
          "font-mono px-1 py-0.5 rounded bg-[#f3f1fc] text-[#6d28d9] text-[.98em]"
        }
        style={{
          background: "#f3f1fc",
          color: "#6d28d9",
          borderRadius: "0.35em",
          fontSize: "0.96em",
          padding: "0.15em 0.32em",
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre({ node, ...props }: any) {
    return (
      <pre
        className="bg-[#eff6fb] border border-[#bae6fd] p-4 rounded-lg my-3 overflow-x-auto"
        {...props}
      />
    );
  },
  blockquote({ node, ...props }: any) {
    return (
      <blockquote
        className="border-l-4 border-blue-400 bg-[#f0f7fa] text-blue-900 font-normal pl-4 py-2 my-2"
        style={{ fontStyle: "italic" }}
        {...props}
      />
    );
  },
  table({ node, ...props }: any) {
    return (
      <table
        className="border rounded-lg overflow-hidden"
        style={{ fontSize: "0.95em" }}
        {...props}
      />
    );
  },
  thead({ node, ...props }: any) {
    return <thead className="bg-zinc-50" {...props} />;
  },
  th({ node, ...props }: any) {
    return (
      <th
        className="p-3 font-semibold border-b bg-zinc-100"
        style={{ fontSize: "0.93em", lineHeight: "1.36" }}
        {...props}
      />
    );
  },
  td({ node, children, ...props }: any) {
    // テーブルセル内の内容を文字列にして dash/ulに加工
    let raw = "";
    let useList: React.ReactNode | null = null;
    if (typeof children === "string") {
      raw = children;
    } else if (
      Array.isArray(children) &&
      children.length === 1 &&
      typeof children[0] === "string"
    ) {
      raw = children[0];
    } else if (
      Array.isArray(children) &&
      children.length >= 1 &&
      Array.isArray(children[0]?.props?.children)
    ) {
      // Markdownが <br> で複数エレメント・string時
      raw = children
        .map((c: any) =>
          typeof c === "string"
            ? c
            : typeof c?.props?.children === "string"
            ? c.props.children
            : Array.isArray(c?.props?.children)
            ? c.props.children.join("")
            : ""
        )
        .join("");
    }

    // カスタム: <br>や改行区切りを自動リスト化
    useList = splitCellTextToList(raw);

    return (
      <td
        className="p-3 border-b"
        style={{
          fontSize: "0.89em",
          lineHeight: "1.4",
          verticalAlign: "top",
          paddingTop: "1.09em",
          paddingBottom: "1.09em",
        }}
        {...props}
      >
        {useList || children}
      </td>
    );
  },
  ul({ node, ...props }: any) {
    return <ul className="list-disc ml-6 my-2" {...props} />;
  },
  ol({ node, ...props }: any) {
    return <ol className="list-decimal ml-6 my-2" {...props} />;
  },
  hr({ node, ...props }: any) {
    return <hr className="border-t border-blue-200 my-8" {...props} />;
  },
  a({ node, ...props }: any) {
    return (
      <a
        {...props}
        className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
        target="_blank"
        rel="noopener noreferrer"
      />
    );
  },
  strong({ node, ...props }: any) {
    return <strong className="text-[#334155] font-bold" {...props} />;
  },
  p({ node, ...props }: any) {
    return <p className="mb-3" {...props} />;
  },
};

export default function MedicalChatApp() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionList, setSessionList] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userMsgRef = useRef<HTMLDivElement>(null);
  const aiMsgRef = useRef<HTMLDivElement>(null);
  const editingInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // scroll アニメーション制御
  const scrollAnimFrame = useRef<number | null>(null);
  const scrollAnimCancel = useRef(false);

  const [justSentUser, setJustSentUser] = useState(false);
  const [fillerHeight, setFillerHeight] = useState(0);

  // パディング、ギャップ
  const LIST_GAP = 40;

  // 思考中アニメ表示制御
  const [isThinking, setIsThinking] = useState(false);

  // テキストエリアの自動リサイズ管理
  const minRows = 1;
  const maxRows = 6;
  const [textareaHeight, setTextareaHeight] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    fetchSessions();
    createNewSession();
    // eslint-disable-next-line
  }, []);

  // ========= チャット名機能 ===========
  // デフォルト名は即日本語の日付
  const createNewSession = async () => {
    const newId = getJapaneseSessionId();
    const dateName = getJapaneseDatetime();
    const name = dateName;
    setSessionId(newId);
    setMessages([]);
    setSessionList((prev) => [...prev, { id: newId, name }]);
    try {
      await fetch(`${BACKEND_URL}/new_session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: newId, name }),
      });
    } catch (err) {}
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/sessions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sessions)) {
          if (typeof data.sessions[0] === "string") {
            setSessionList(
              data.sessions.map((sid: string) => ({
                id: sid,
                name: sid,
              }))
            );
          } else {
            setSessionList(
              data.sessions.map((s: any) => ({
                id: s.id,
                name: s.name || s.id,
              }))
            );
          }
        } else {
          setSessionList([]);
        }
      }
    } catch (error) {
      console.error("セッション取得失敗:", error);
    }
  };

  const loadHistory = async (id: string) => {
    setSessionId(id);
    setMessages([]);
    try {
      const res = await fetch(`${BACKEND_URL}/history/${id}`);
      if (res.ok) {
        const data = await res.json();
        const formattedHistory = (data.history || []).map(
          (msg: any, index: number) => ({
            id: `history-${id}-${index}`,
            role: msg.role,
            content: msg.content,
          })
        );
        setMessages(formattedHistory);
      }
    } catch (error) {
      console.error("履歴読み込み失敗:", error);
    }
  };

  // 編集ボタンはチャット名の左1マス分だけ反応
  const startEditingName = (
    id: string,
    curName: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    setEditingSessionId(id);
    setEditingName(curName);
    setTimeout(() => {
      editingInputRef.current?.focus();
      editingInputRef.current?.select();
    }, 10);
  };

  const saveSessionName = async (id: string) => {
    setSessionList((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, name: editingName.trim() || s.id } : s
      )
    );
    setEditingSessionId(null);
    setEditingName("");
    try {
      await fetch(`${BACKEND_URL}/update_session_name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: id,
          name: editingName.trim() || id,
        }),
      });
    } catch (e) {}
  };

  // ======= Gemini風ストリーミング送信(思考中...) =======
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    setJustSentUser(true);
    setInput("");
    setIsLoading(true);
    setIsThinking(true);

    // AI回答を空で追加（思考中...を制御）
    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "" },
    ]);

    let anyChunk = false;

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          messages: newMessages,
        }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let hasOutput = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk && chunk.length > 0) {
          anyChunk = true;
          if (!hasOutput) {
            setIsThinking(false); // 初回何か出力がきたら思考中解除
            hasOutput = true;
          }
        }
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          const rest = prev.slice(0, -1);
          return [...rest, { ...last, content: last.content + chunk }];
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const rest = prev.slice(0, -1);
        return [
          ...rest,
          { ...last, content: last.content + "\n[通信エラーが発生しました]" },
        ];
      });
      setIsThinking(false);
    } finally {
      setIsLoading(false);
      fetchSessions();
      setIsThinking(false);
    }
  };

  // ==== Gemini風リッチ・1秒 アニメ付き最新Userメッセージ吸着 ====

  // アニメーションキャンセル
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    function onUserScroll() {
      scrollAnimCancel.current = true;
    }
    container.addEventListener("wheel", onUserScroll, { passive: true });
    container.addEventListener("touchstart", onUserScroll, { passive: true });
    return () => {
      container.removeEventListener("wheel", onUserScroll);
      container.removeEventListener("touchstart", onUserScroll);
    };
  }, []);

  // Gemini風ターゲット補正 1sカスタムイージング
  const startScrollToUserMsgTop = useCallback(() => {
    if (!messagesContainerRef.current || !userMsgRef.current) return;
    const container = messagesContainerRef.current;
    let startTime: number | null = null;
    let from = container.scrollTop;
    function animate(now: number) {
      if (!userMsgRef.current || !messagesContainerRef.current) return;
      if (scrollAnimCancel.current) return;
      if (startTime == null) startTime = now;
      const elapsed = now - startTime;
      const duration = 1000;
      let t = Math.min(1, elapsed / duration);
      let eased = easeInOutCubic(t);

      // 毎フレーム最新のターゲット
      let targetTop =
        userMsgRef.current.offsetTop - messagesContainerRef.current.offsetTop;
      let startScroll = from;
      let delta = targetTop - startScroll;

      container.scrollTop = startScroll + delta * eased;

      if (t < 1) {
        scrollAnimFrame.current = requestAnimationFrame(animate);
      } else {
        // 最終到着時ピタリ
        container.scrollTop = targetTop;
        scrollAnimFrame.current = null;
      }
    }
    // 前回アニメ停止
    if (scrollAnimFrame.current) {
      cancelAnimationFrame(scrollAnimFrame.current);
    }
    scrollAnimCancel.current = false;
    scrollAnimFrame.current = requestAnimationFrame(animate);
  }, []);

  // justSentUser: start scroll animation
  useEffect(() => {
    if (!justSentUser) return;
    startScrollToUserMsgTop();
    setJustSentUser(false);
    // eslint-disable-next-line
  }, [justSentUser, startScrollToUserMsgTop]);

  // ユーザーが手動でスクロールするとき、アニメーション止める
  useEffect(() => {
    return () => {
      if (scrollAnimFrame.current) cancelAnimationFrame(scrollAnimFrame.current);
    };
  }, []);

  // ========= Gemini風・動的スペーサー =========
  const calculateFillerHeight = useCallback(() => {
    if (
      !messagesContainerRef.current ||
      !userMsgRef.current ||
      !aiMsgRef.current
    ) {
      setFillerHeight(0);
      return;
    }
    const container = messagesContainerRef.current;
    const vh = container.clientHeight;
    const userRect = userMsgRef.current.getBoundingClientRect();
    const aiRect = aiMsgRef.current.getBoundingClientRect();
    const userHeight = userRect.height;
    const aiHeight = aiRect.height;
    const visibleContentHeight = userHeight + aiHeight + LIST_GAP;
    let filler = vh - visibleContentHeight;
    if (filler < 0) filler = 0;
    setFillerHeight(Math.round(filler));
  }, []);

  // AIメッセージやUserメッセージ更新時スペース再計算
  useEffect(() => {
    if (
      !messagesContainerRef.current ||
      !userMsgRef.current ||
      !aiMsgRef.current
    ) {
      setFillerHeight(0);
      return;
    }
    calculateFillerHeight();
    // eslint-disable-next-line
  }, [messages.length, messages[messages.length - 1]?.content]);

  // AIレスポンスが増える(Streaming)たび監視
  useEffect(() => {
    const aiNode = aiMsgRef.current;
    if (!isLoading || !aiNode) return;
    const resizeObserver = new ResizeObserver(() => {
      calculateFillerHeight();
    });
    resizeObserver.observe(aiNode);
    return () => resizeObserver.disconnect();
  }, [isLoading, calculateFillerHeight]);

  // ====== テキストエリアAuto-Resize/Key制御 ======
  // textarea用: 改行で自動リサイズ, 最大6行
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto"; // 一旦解放
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight || "24");
      const rows = Math.floor(textarea.scrollHeight / lineHeight);
      const clampedRows = Math.min(Math.max(rows, minRows), maxRows);
      textarea.style.height = `${clampedRows * lineHeight}px`;
      setTextareaHeight(`${clampedRows * lineHeight}px`);
    }
  };

  // イベント: Shift+Enterのみ改行、それ以外Enterで送信
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!isLoading && input.trim()) sendMessage();
    }
  };

  const handleInputBlur = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "";
      setTextareaHeight(undefined);
    }
  };

  return (
    <>
      <style>{markdownStyle}</style>
      <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans">
        {/* サイドバー */}
        <div className="w-72 bg-white border-r border-zinc-200 flex flex-col">
          <div className="p-4 border-b border-zinc-200">
            <h1 className="text-xl font-bold flex items-center gap-2 mb-2">
              🏥 医療AI
            </h1>
          </div>
          <div className="p-4">
            <button
              onClick={createNewSession}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              ＋ 新規チャット
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-sm font-semibold text-zinc-500 mb-2">履歴</p>
            {sessionList.map((session) => (
              <div key={session.id} className="flex items-center group w-full">
                {/* 名前編集ボタン/エリア: チャット名の左1マス分だけ押せる */}
                <span
                  className="mr-1 flex items-center z-10"
                  style={{ width: 28, minWidth: 28, cursor: "pointer" }}
                  onClick={(e) => startEditingName(session.id, session.name, e)}
                  title="名前を編集"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      startEditingName(session.id, session.name);
                    }
                  }}
                  aria-label="名前を編集"
                  role="button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    className="text-zinc-300 group-hover:text-blue-400 hover:scale-110 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ verticalAlign: "middle", cursor: "pointer" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232a2.5 2.5 0 013.536 3.536l-9.036 9.036a2 2 0 01-.878.515l-3.517.879.88-3.518a2 2 0 01.514-.877l9.037-9.037z"
                    />
                  </svg>
                </span>
                <button
                  onClick={() => loadHistory(session.id)}
                  className={`w-full text-left px-2 py-2 rounded-lg text-sm truncate transition-colors ${
                    sessionId === session.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "hover:bg-zinc-100"
                  }`}
                  style={{
                    outline:
                      editingSessionId === session.id
                        ? "2px solid #60a5fa"
                        : undefined,
                  }}
                  tabIndex={0}
                  title={session.name}
                >
                  💬{" "}
                  {editingSessionId === session.id ? (
                    <input
                      ref={editingInputRef}
                      type="text"
                      className="border-b border-blue-400 focus:outline-none bg-blue-50 px-1 py-0.5 w-36"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => saveSessionName(session.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveSessionName(session.id);
                        } else if (e.key === "Escape") {
                          setEditingSessionId(null);
                        }
                      }}
                      maxLength={30}
                    />
                  ) : (
                    <span className="inline-block align-middle">{session.name}</span>
                  )}
                </button>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-zinc-200 text-xs text-zinc-400 break-all">
            現在のID: {sessionId}
          </div>
        </div>

        {/* メインチャット画面 */}
        <div className="flex-1 flex flex-col justify-between bg-zinc-50">
          <div
            className="flex-1 overflow-y-auto flex flex-col items-center px-2 md:px-4 py-8"
            ref={messagesContainerRef}
            style={{ scrollBehavior: "auto" }}
          >
            <div
              className="w-full max-w-4xl mx-auto flex flex-col gap-10 min-h-full"
              style={{ position: "relative" }}
            >
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center text-zinc-400 py-24">
                  メッセージを入力して会話を始めましょう
                </div>
              )}

              {(() => {
                // レンダリング配列
                const rendered: React.ReactNode[] = [];
                for (let idx = 0; idx < messages.length; idx++) {
                  const msg = messages[idx];
                  if (msg.role === "user") {
                    // 最新Userのみref
                    const isLastUser =
                      idx ===
                      messages
                        .map((m) => m.role)
                        .lastIndexOf("user");
                    rendered.push(
                      <div
                        key={msg.id}
                        className="flex justify-end"
                        ref={isLastUser ? userMsgRef : undefined}
                      >
                        <div className="bg-zinc-100 text-zinc-900 rounded-2xl rounded-br-none px-6 py-4 shadow-sm max-w-[80%] text-base border border-zinc-200 whitespace-pre-wrap break-words leading-relaxed">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                              p({ children }) {
                                return <p className="mb-3">{children}</p>;
                              },
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );

                    // === ここが重要 ===
                    // isThinkingがtrue && isLoadingかつ直後がAI/空でまだAI出ていなければこの下に思考中...
                    if (
                      isLastUser &&
                      isThinking &&
                      isLoading &&
                      messages[messages.length - 1]?.role === "assistant" &&
                      messages[messages.length - 1]?.content === ""
                    ) {
                      rendered.push(
                        <div key="thiking-indicator" className="flex justify-center" style={{ pointerEvents: "none" }}>
                          <div className="text-blue-600 text-lg font-semibold select-none py-8 leading-relaxed flex items-center gap-2">
                            <svg className="animate-spin h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12" cy="12" r="10"
                                stroke="currentColor" strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-70"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              ></path>
                            </svg>
                            思考中...
                          </div>
                        </div>
                      );
                    }

                  } else {
                    // 最新AIのみref
                    const isLastAI =
                      idx ===
                      messages
                        .map((m) => m.role)
                        .lastIndexOf("assistant");
                    rendered.push(
                      <div
                        key={msg.id}
                        className="flex justify-center"
                        data-msg-ai={msg.id}
                        ref={isLastAI ? aiMsgRef : undefined}
                      >
                        <div className="prose prose-zinc dark:prose-invert max-w-none break-words w-full md:max-w-[96%] lg:max-w-[92%] xl:max-w-[72ch] mx-auto bg-transparent p-0 leading-relaxed">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={markdownComponents}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                  }
                }
                // 動的Geminiスペーサー
                if (fillerHeight > 0 && isLoading) {
                  rendered.push(
                    <div
                      key="gemini-filler"
                      style={{
                        minHeight: Math.ceil(fillerHeight),
                        width: "100%",
                        transition: "min-height 0.08s cubic-bezier(.6,1,.16,1)",
                      }}
                      aria-hidden="true"
                    />
                  );
                }
                return rendered;
              })()}
            </div>
          </div>
          {/* 入力エリア */}
          <div className="p-4 bg-white border-t border-zinc-200">
            <form
              onSubmit={sendMessage}
              className="max-w-4xl mx-auto flex gap-4 items-end"
            >
              <div className="flex-1 flex flex-col">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleInputKeyDown}
                  placeholder="症状や質問を入力..."
                  disabled={isLoading}
                  rows={minRows}
                  className={`
                    resize-none border border-zinc-300
                    rounded-xl px-4 py-3
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    disabled:bg-zinc-100 text-base
                    bg-white
                    max-h-[180px] min-h-[3rem]
                    scroll-pb-3
                    overflow-y-auto
                    leading-relaxed
                    transition-[box-shadow]
                  `}
                  style={{
                    height: textareaHeight,
                    minHeight: "3rem",
                    maxHeight: "180px",
                    boxSizing: "border-box",
                  }}
                  spellCheck={false}
                  aria-label="チャット入力"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white px-7 py-3 rounded-xl font-semibold transition-colors self-end"
                style={{ minHeight: "3rem" }}
              >
                送信
              </button>
            </form>
            <div className="text-xs text-zinc-400 mt-2 ml-1">
              Enterで送信 ・ Shift+Enterで改行
            </div>
          </div>
        </div>
      </div>
    </>
  );
}