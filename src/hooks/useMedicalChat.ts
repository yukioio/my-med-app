"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getJapaneseDatetime,
  getJapaneseSessionId,
  easeInOutCubic,
} from "@/src/lib/utils";

const BACKEND_URL =
  "https://medical-ai-engine-backend-895886568528.asia-northeast1.run.app";

export type Message = {
  id: string;
  role: string;
  content: string;
};

export type Session = {
  id: string;
  name: string;
};

const LIST_GAP = 40;

export function useMedicalChat() {
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

  const scrollAnimFrame = useRef<number | null>(null);
  const scrollAnimCancel = useRef(false);

  const [justSentUser, setJustSentUser] = useState(false);
  const [fillerHeight, setFillerHeight] = useState(0);
  const [isThinking, setIsThinking] = useState(false);

  const minRows = 1;
  const maxRows = 6;
  const [textareaHeight, setTextareaHeight] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    fetchSessions();
    createNewSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    } catch (err) {
      // ignore
    }
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
              data.sessions.map((s: { id?: string; name?: string }) => ({
                id: s.id ?? "",
                name: s.name || (s.id ?? ""),
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
          (msg: { role: string; content: string }, index: number) => ({
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

  const cancelEditingName = () => {
    setEditingSessionId(null);
    setEditingName("");
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
    } catch (e) {
      // ignore
    }
  };

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

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "" },
    ]);

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
          if (!hasOutput) {
            setIsThinking(false);
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

  const startScrollToUserMsgTop = useCallback(() => {
    if (!messagesContainerRef.current || !userMsgRef.current) return;
    const container = messagesContainerRef.current;
    let startTime: number | null = null;
    const from = container.scrollTop;
    function animate(now: number) {
      if (!userMsgRef.current || !messagesContainerRef.current) return;
      if (scrollAnimCancel.current) return;
      if (startTime == null) startTime = now;
      const elapsed = now - startTime;
      const duration = 1000;
      const t = Math.min(1, elapsed / duration);
      const eased = easeInOutCubic(t);

      const targetTop =
        userMsgRef.current.offsetTop - messagesContainerRef.current.offsetTop;
      const startScroll = from;
      const delta = targetTop - startScroll;

      container.scrollTop = startScroll + delta * eased;

      if (t < 1) {
        scrollAnimFrame.current = requestAnimationFrame(animate);
      } else {
        container.scrollTop = targetTop;
        scrollAnimFrame.current = null;
      }
    }
    if (scrollAnimFrame.current) {
      cancelAnimationFrame(scrollAnimFrame.current);
    }
    scrollAnimCancel.current = false;
    scrollAnimFrame.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (!justSentUser) return;
    startScrollToUserMsgTop();
    setJustSentUser(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSentUser, startScrollToUserMsgTop]);

  useEffect(() => {
    return () => {
      if (scrollAnimFrame.current) cancelAnimationFrame(scrollAnimFrame.current);
    };
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, messages[messages.length - 1]?.content]);

  useEffect(() => {
    const aiNode = aiMsgRef.current;
    if (!isLoading || !aiNode) return;
    const resizeObserver = new ResizeObserver(() => {
      calculateFillerHeight();
    });
    resizeObserver.observe(aiNode);
    return () => resizeObserver.disconnect();
  }, [isLoading, calculateFillerHeight]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const lineHeight = parseFloat(
        getComputedStyle(textarea).lineHeight || "24"
      );
      const rows = Math.floor(textarea.scrollHeight / lineHeight);
      const clampedRows = Math.min(Math.max(rows, minRows), maxRows);
      textarea.style.height = `${clampedRows * lineHeight}px`;
      setTextareaHeight(`${clampedRows * lineHeight}px`);
    }
  };

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

  return {
    sessionId,
    sessionList,
    messages,
    input,
    setInput,
    isLoading,
    isThinking,
    editingSessionId,
    editingName,
    setEditingName,
    createNewSession,
    fetchSessions,
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
    maxRows,
  };
}
