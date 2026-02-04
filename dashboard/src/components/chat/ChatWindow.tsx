import { useCallback } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '../../stores/chatStore';
import { chatService } from '../../services/chat';
import type { ChatMessage } from '../../types';

interface ChatWindowProps {
  className?: string;
}

export const ChatWindow = ({ className = '' }: ChatWindowProps) => {
  const { messages, isLoading, addMessage, setLoading, clearMessages } =
    useChatStore();

  // 메시지 전송 처리
  const handleSendMessage = useCallback(
    async (content: string) => {
      // 사용자 메시지 추가
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      };
      addMessage(userMessage);
      setLoading(true);

      try {
        // AI 응답 요청
        const response = await chatService.sendMessage(content, messages);

        // AI 응답 메시지 추가
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content,
          toolResults: response.toolResults,
          createdAt: new Date(),
        };
        addMessage(assistantMessage);
      } catch (error) {
        console.error('메시지 전송 실패:', error);
        // 에러 메시지 추가
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.',
          createdAt: new Date(),
        };
        addMessage(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [messages, addMessage, setLoading]
  );

  // 대화 초기화
  const handleClearChat = useCallback(() => {
    if (window.confirm('대화 내용을 모두 삭제하시겠습니까?')) {
      clearMessages();
    }
  }, [clearMessages]);

  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* AI 아바타 */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI 어시스턴트
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isLoading ? '응답 생성 중...' : '온라인'}
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          {/* 대화 초기화 버튼 */}
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="대화 초기화"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>

          {/* 설정 버튼 */}
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="설정"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 메시지 목록 */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* 입력창 */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder="AI 어시스턴트에게 질문하세요..."
      />
    </div>
  );
};

export default ChatWindow;
