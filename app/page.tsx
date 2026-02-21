"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- 設定 ---
const BACKEND_URL = "https://medical-ai-engine-backend-895886568528.asia-northeast1.run.app";

// メッセージの型定義
type Message = {
  id: string;
  role: string;
  content: string;
};

const markdownStyle = `
.prose {
  line-height: 1.92 !important;
  font-size: 1.08rem;
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
}
.prose thead {
  background-color: #f4f4f5;
}
.prose thead tr th {
  color: #1e293b;
  font-weight: 700;
  background-color: #f4f4f5;
  padding: 1em 1.25em;
  font-size: 1rem;
  border-bottom: 2px solid #e4e4e7;
}
.prose tbody tr {
  border-top: none !important;
}
.prose tbody tr:nth-child(even) {
  background-color: rgba(244,244,245,0.58);
}
.prose tbody td {
  border-top: 1px solid #e4e4e7;
  padding: 0.95em 1.25em;
  vertical-align: top;
}
.prose code {
  font-size: 0.98em;
  background: #f5f7fa;
  padding: 0.19em 0.42em;
  border-radius: 0.35em;
}
.prose pre {
  background: #f5f7fa;
  border-radius: 0.5em;
  padding: 1.1em 1.3em;
  font-size: 0.98em;
}
`;

export default function MedicalChatApp() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionList, setSessionList] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Refs for scrolling management
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userMsgRef = useRef<HTMLDivElement>(null);

  // Track if user just sent a message to scroll
  const [justSentUser, setJustSentUser] = useState(false);

  // Tracks if empty filler should be shown between latest User and AI
  const [showSpacer, setShowSpacer] = useState(false);

  // 初回読み込み時の処理
  useEffect(() => {
    fetchSessions();
    createNewSessionId();
  }, []);

  // 新規チャットIDの生成
  const createNewSessionId = () => {
    const now = new Date();
    const newId = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    setSessionId(newId);
    setMessages([]);
  };

  // バックエンドからチャット一覧を取得
  const fetchSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessionList(data.sessions || []);
      }
    } catch (error) {
      console.error("セッション取得失敗:", error);
    }
  };

  // 履歴を読み込む
  const loadHistory = async (id: string) => {
    setSessionId(id);
    setMessages([]);
    try {
      const res = await fetch(`${BACKEND_URL}/history/${id}`);
      if (res.ok) {
        const data = await res.json();
        const formattedHistory = (data.history || []).map((msg: any, index: number) => ({
          id: `history-${id}-${index}`,
          role: msg.role,
          content: msg.content,
        }));
        setMessages(formattedHistory);
      }
    } catch (error) {
      console.error("履歴読み込み失敗:", error);
    }
  };

  // --- ストリーミング送信処理 ---
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    // 1. ユーザーのメッセージを画面に即座に追加
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setJustSentUser(true); // enable scroll for new User
    setInput("");
    setIsLoading(true);

    // 2. AIの回答エリア（空っぽの状態）を準備
    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);
    setShowSpacer(true); // Spacer表示ON

    try {
      // 3. APIに接続してストリーミング開始
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          session_id: sessionId,
          messages: newMessages 
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      // 4. 届いた文字を1文字ずつパースして画面に反映
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
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
        return [...rest, { ...last, content: last.content + "\n[通信エラーが発生しました]" }];
      });
    } finally {
      setIsLoading(false);
      fetchSessions();
    }
  };

  // ユーザー入力最新メッセージが送信されたタイミングで「画面最上部にユーザー発言」
  useEffect(() => {
    if (!justSentUser) return;

    setTimeout(() => {
      if (userMsgRef.current && messagesContainerRef.current) {
        // scroll so that user message sits at the top
        const userTop =
          userMsgRef.current.getBoundingClientRect().top -
          messagesContainerRef.current.getBoundingClientRect().top;
        messagesContainerRef.current.scrollTo({
          top: userTop,
          behavior: "smooth",
        });
      }
      setJustSentUser(false);
    }, 90); // DOM描画待ち
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSentUser]);

  // AIのメッセージ本文の高さが「画面残りスペースを超えたら」Spacerを消す
  useEffect(() => {
    if (!showSpacer) return;

    if (
      messages.length >= 2 &&
      messages[messages.length - 1].role === "assistant"
    ) {
      // User→Spacer→AI　全てが1画面分以内に収まっているか判定
      setTimeout(() => {
        if (messagesContainerRef.current && userMsgRef.current) {
          const container = messagesContainerRef.current;
          const userRect = userMsgRef.current.getBoundingClientRect();
          // AIメッセージ直後の要素を探す
          const aiIdx = messages.findIndex(
            (msg) => msg.role === "assistant" && msg.content.length > 0
          );
          let aiDiv: HTMLElement | null = null;
          if (aiIdx !== -1) {
            aiDiv =
              container.querySelector(
                '[data-msg-ai="' + messages[aiIdx].id + '"]'
              ) as HTMLElement | null;
          }
          if (aiDiv) {
            // containerトップ基準で計測
            const aiRect = aiDiv.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            // User入力(head/top)からAI末尾(bottom)まで＋spacerがcontainer高さを超えたらSpacerを消す
            const span =
              aiRect.bottom -
              userRect.top +
              60; // 補正padding余裕
            if (span > containerRect.height) {
              setShowSpacer(false);
            }
          }
        }
      }, 140);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages[messages.length - 1]?.content, showSpacer]);

  return (
    <>
      <style>{markdownStyle}</style>
      <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans">
        {/* サイドバー */}
        <div className="w-72 bg-white border-r border-zinc-200 flex flex-col">
          <div className="p-4 border-b border-zinc-200">
            <h1 className="text-xl font-bold flex items-center gap-2">🏥 医療AI</h1>
          </div>
          <div className="p-4">
            <button
              onClick={createNewSessionId}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              ＋ 新規チャット
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-sm font-semibold text-zinc-500 mb-2">履歴</p>
            {sessionList.map((sid) => (
              <button
                key={sid}
                onClick={() => loadHistory(sid)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                  sessionId === sid ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-zinc-100"
                }`}
              >
                💬 {sid}
              </button>
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
            style={{ scrollBehavior: "smooth" }}
          >
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-10 min-h-full">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center text-zinc-400 py-24">
                  メッセージを入力して会話を始めましょう
                </div>
              )}
              {messages.map((msg, idx) => {
                if (msg.role === "user") {
                  // 最新Userのみref
                  const isLastUser =
                    idx ===
                    messages
                      .map((m) => m.role)
                      .lastIndexOf("user");
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-end"
                      ref={isLastUser ? userMsgRef : undefined}
                    >
                      <div className="bg-zinc-100 text-zinc-900 rounded-2xl rounded-br-none px-6 py-4 shadow-sm max-w-[80%] text-base border border-zinc-200 whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  );
                } else {
                  // AIメッセージ
                  // id で次のdata属性で選択出来るように
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-center"
                      data-msg-ai={msg.id}
                    >
                      <div className="prose prose-zinc dark:prose-invert max-w-none break-words w-full md:max-w-[96%] lg:max-w-[92%] xl:max-w-[72ch] mx-auto bg-transparent p-0 leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({node, ...props}) => (
                              <table {...props} />
                            ),
                            thead: ({node, ...props}) => (
                              <thead {...props} />
                            ),
                            tbody: ({node, ...props}) => (
                              <tbody {...props} />
                            ),
                            tr: ({node, ...props}) => (
                              <tr {...props} />
                            ),
                            th: ({node, ...props}) => (
                              <th {...props} />
                            ),
                            td: ({node, ...props}) => (
                              <td {...props} />
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                }
              })}
              {/* 必要な場合だけ「余白スペーサ」= 空白Divを挿入 */}
              {showSpacer && (
                <div style={{ flex: 1, minHeight: "40vh" }} />
              )}

              {isLoading && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-center">
                  <div className="text-blue-600 text-lg font-semibold animate-pulse select-none py-8 leading-relaxed">
                    思考中...
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* 入力エリア */}
          <div className="p-4 bg-white border-t border-zinc-200">
            <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="症状や質問を入力..."
                disabled={isLoading}
                className="flex-1 border border-zinc-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white px-7 py-3 rounded-xl font-semibold transition-colors"
              >
                送信
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}