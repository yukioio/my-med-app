"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { markdownStyle, markdownComponents } from "@/src/styles/markdown-theme";
import { useMedicalChat } from "@/src/hooks/useMedicalChat";
import { Sidebar } from "@/src/components/Sidebar";
import { ChatInput } from "@/src/components/ChatInput";

export default function MedicalChatApp() {
  const {
    sessionId,
    sessionList,
    messages,
    input,
    isLoading,
    isThinking,
    editingSessionId,
    editingName,
    setEditingName,
    createNewSession,
    loadHistory,
    startEditingName,
    cancelEditingName,
    saveSessionName,
    sendMessage,
    messagesContainerRef,
    userMsgRef,
    aiMsgRef,
    editingInputRef,
    textareaRef,
    fillerHeight,
    handleInputChange,
    handleInputKeyDown,
    handleInputBlur,
    textareaHeight,
    minRows,
  } = useMedicalChat();

  return (
    <>
      <style>{markdownStyle}</style>
      <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans">
        <Sidebar
          sessionId={sessionId}
          sessionList={sessionList}
          editingSessionId={editingSessionId}
          editingName={editingName}
          setEditingName={setEditingName}
          createNewSession={createNewSession}
          loadHistory={loadHistory}
          startEditingName={startEditingName}
          cancelEditingName={cancelEditingName}
          saveSessionName={saveSessionName}
          editingInputRef={editingInputRef}
        />

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
                const rendered: React.ReactNode[] = [];
                for (let idx = 0; idx < messages.length; idx++) {
                  const msg = messages[idx];
                  if (msg.role === "user") {
                    const isLastUser =
                      idx ===
                      messages.map((m) => m.role).lastIndexOf("user");
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

                    if (
                      isLastUser &&
                      isThinking &&
                      isLoading &&
                      messages[messages.length - 1]?.role === "assistant" &&
                      messages[messages.length - 1]?.content === ""
                    ) {
                      rendered.push(
                        <div
                          key="thiking-indicator"
                          className="flex justify-center"
                          style={{ pointerEvents: "none" }}
                        >
                          <div className="text-blue-600 text-lg font-semibold select-none py-8 leading-relaxed flex items-center gap-2">
                            <svg
                              className="animate-spin h-6 w-6 text-blue-400"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-70"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              />
                            </svg>
                            思考中...
                          </div>
                        </div>
                      );
                    }
                  } else {
                    const isLastAI =
                      idx ===
                      messages.map((m) => m.role).lastIndexOf("assistant");
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
                if (fillerHeight > 0 && isLoading) {
                  rendered.push(
                    <div
                      key="gemini-filler"
                      style={{
                        minHeight: Math.ceil(fillerHeight),
                        width: "100%",
                        transition:
                          "min-height 0.08s cubic-bezier(.6,1,.16,1)",
                      }}
                      aria-hidden="true"
                    />
                  );
                }
                return rendered;
              })()}
            </div>
          </div>

          <ChatInput
            input={input}
            isLoading={isLoading}
            sendMessage={sendMessage}
            textareaRef={textareaRef}
            handleInputChange={handleInputChange}
            handleInputKeyDown={handleInputKeyDown}
            handleInputBlur={handleInputBlur}
            textareaHeight={textareaHeight}
            minRows={minRows}
          />
        </div>
      </div>
    </>
  );
}
