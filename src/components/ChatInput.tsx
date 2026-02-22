"use client";

type ChatInputProps = {
  input: string;
  isLoading: boolean;
  sendMessage: (e?: React.FormEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleInputBlur: () => void;
  textareaHeight: string | undefined;
  minRows: number;
};

export function ChatInput({
  input,
  isLoading,
  sendMessage,
  textareaRef,
  handleInputChange,
  handleInputKeyDown,
  handleInputBlur,
  textareaHeight,
  minRows,
}: ChatInputProps) {
  return (
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
  );
}
