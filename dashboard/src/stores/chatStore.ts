import { create } from 'zustand';
import type { ChatMessage, ToolResult } from '../types';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentResult: ToolResult | null;

  // 메시지 관련
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;

  // 결과 패널 관련
  showResult: (result: ToolResult) => void;
  clearResult: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  currentResult: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  clearMessages: () => set({ messages: [] }),

  setLoading: (isLoading) => set({ isLoading }),

  showResult: (result) => set({ currentResult: result }),

  clearResult: () => set({ currentResult: null }),
}));
