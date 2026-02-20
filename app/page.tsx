"use client";

import { useState, useEffect } from "react";
import { useChat } from "ai/react";

// --- 設定 ---
// バックエンドのURL（デプロイ済みのCloud Runを指定）
const BACKEND_URL = "https://medical-ai-engine-backend-895886568528.asia-northeast1.run.app";

export default function MedicalChatApp() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionList, setSessionList] = useState<string[]>([]);

  // --- Vercel AI SDK (useChat) の設定 ---
  const { messages, setMessages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: `${BACKEND_URL}/chat`,
    // backendの ChatRequest モデルに合わせて session_id を追加で送信
    body: { session_id: sessionId }, 
    onFinish: () => {
      // AIの回答が最後まで表示され、GCS保存が終わったタイミングで履歴一覧を更新
      fetchSessions();
    },
    onError: (error) => {
      console.error("チャットエラー:", error);
    }
  });

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
    setMessages([]); // 画面のメッセージをクリア
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
    setMessages([]); // 一旦クリア
    try {
      const res = await fetch(`${BACKEND_URL}/history/${id}`);
      if (res.ok) {
        const data = await res.json();
        
        // 【重要】Vercel AI SDK の形式に合わせるため、各メッセージに "id" を付与する
        const formattedHistory = (data.history || []).map((msg: any, index: number) => ({
          id: `history-${id}-${index}`, // SDKがメッセージを区別するためのユニークID
          role: msg.role,
          content: msg.content,
        }));
        
        setMessages(formattedHistory);
      }
    } catch (error) {
      console.error("履歴読み込み失敗:", error);
    }
  };

  // --- 画面の描画 ---
  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans">
      
      {/* サイドバー */}
      <div className="w-72 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-4 border-b border-zinc-200">
          <h1 className="text-xl font-bold flex items-center gap-2">
            🏥 医療AIプラットフォーム
          </h1>
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
      <div className="flex-1 flex flex-col bg-zinc-50">
        
        {/* チャット履歴エリア */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-zinc-400">
              メッセージを入力して会話を始めましょう
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-2xl rounded-2xl px-5 py-3 ${
                msg.role === "user" 
                  ? "bg-blue-600 text-white rounded-br-none" 
                  : "bg-white border border-zinc-200 text-zinc-800 rounded-bl-none shadow-sm"
              }`}>
                {msg.content.split('\n').map((line, i) => (
                  <span key={i}>{line}<br/></span>
                ))}
              </div>
            </div>
          ))}

          {/* ストリーミング中（isLoading）で、まだAIの返答が配列に追加されていない一瞬のローディング */}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
             <div className="flex justify-start">
               <div className="bg-white border border-zinc-200 text-zinc-500 rounded-2xl rounded-bl-none px-5 py-3 shadow-sm flex items-center gap-2">
                 <span className="animate-pulse">思考中...</span>
               </div>
             </div>
          )}
        </div>

        {/* 入力エリア */}
        <div className="p-4 bg-white border-t border-zinc-200">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-3">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="症状や質問を入力..."
              disabled={isLoading}
              className="flex-1 border border-zinc-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              送信
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
