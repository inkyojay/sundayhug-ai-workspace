import type { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-white rounded-br-md'
            : isAssistant
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
            : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800'
        }`}
      >
        {/* 역할 표시 */}
        <div
          className={`text-xs font-medium mb-1 ${
            isUser
              ? 'text-white/80'
              : isAssistant
              ? 'text-primary dark:text-primary-400'
              : 'text-yellow-600 dark:text-yellow-400'
          }`}
        >
          {isUser ? '나' : isAssistant ? 'AI 어시스턴트' : '시스템'}
        </div>

        {/* 메시지 내용 */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>

        {/* 시간 표시 */}
        <div
          className={`text-xs mt-2 ${
            isUser
              ? 'text-white/60'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {formatTime(message.createdAt)}
        </div>

        {/* 도구 결과 배지 */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.toolResults.map((result, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200"
              >
                {result.toolName}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default MessageBubble;
