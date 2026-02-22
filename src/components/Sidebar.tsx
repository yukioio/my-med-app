"use client";

import type { Session } from "@/src/hooks/useMedicalChat";

type SidebarProps = {
  sessionId: string;
  sessionList: Session[];
  editingSessionId: string | null;
  editingName: string;
  setEditingName: (v: string) => void;
  createNewSession: () => void;
  loadHistory: (id: string) => void;
  startEditingName: (id: string, curName: string, e?: React.MouseEvent) => void;
  cancelEditingName: () => void;
  saveSessionName: (id: string) => void;
  editingInputRef: React.RefObject<HTMLInputElement | null>;
};

export function Sidebar({
  sessionId,
  sessionList,
  editingSessionId,
  editingName,
  setEditingName,
  createNewSession,
  loadHistory,
  startEditingName,
  cancelEditingName,
  saveSessionName,
  editingInputRef,
}: SidebarProps) {
  return (
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
            <span
              className="mr-1 flex items-center z-10"
              style={{ width: 28, minWidth: 28, cursor: "pointer" }}
              onClick={(e) => startEditingName(session.id, session.name, e)}
              title="名前を編集"
              tabIndex={0}
              onKeyDown={(e) => {
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
                  cancelEditingName();
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
  );
}
