import { ResultCard } from './ResultCard';
import { useChatStore } from '../../stores/chatStore';

interface ResultPanelProps {
  className?: string;
}

export const ResultPanel = ({ className = '' }: ResultPanelProps) => {
  const { currentResult, clearResult, messages } = useChatStore();

  // 최근 메시지들의 도구 결과 수집
  const recentToolResults = messages
    .filter((msg) => msg.toolResults && msg.toolResults.length > 0)
    .flatMap((msg) => msg.toolResults || [])
    .slice(-5); // 최근 5개만

  const hasContent = currentResult || recentToolResults.length > 0;

  return (
    <div
      className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            결과 패널
          </h2>
        </div>

        {/* 결과 개수 배지 */}
        {recentToolResults.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {recentToolResults.length}개 결과
          </span>
        )}
      </div>

      {/* 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 현재 활성 결과 */}
        {currentResult && (
          <div className="relative">
            <div className="absolute -top-2 left-3 px-2 py-0.5 bg-primary text-white text-xs font-medium rounded-full">
              현재 결과
            </div>
            <ResultCard result={currentResult} onClose={clearResult} />
          </div>
        )}

        {/* 최근 결과 히스토리 */}
        {recentToolResults.length > 0 && (
          <div className="space-y-3">
            {!currentResult && (
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                최근 결과
              </h3>
            )}
            {recentToolResults.map((result, index) => (
              <ResultCard key={`history-${index}`} result={result} />
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!hasContent && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <svg
              className="w-16 h-16 mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-lg font-medium">결과가 없습니다</p>
            <p className="text-sm mt-1 text-center">
              AI 어시스턴트에게 질문하면
              <br />
              결과가 여기에 표시됩니다
            </p>
          </div>
        )}
      </div>

      {/* 푸터 - 빠른 액션 */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl">
        <div className="flex flex-wrap gap-2">
          <QuickActionButton label="주문 조회" icon="📦" />
          <QuickActionButton label="고객 검색" icon="👤" />
          <QuickActionButton label="재고 확인" icon="📊" />
          <QuickActionButton label="매출 분석" icon="📈" />
        </div>
      </div>
    </div>
  );
};

// 빠른 액션 버튼 컴포넌트
const QuickActionButton = ({
  label,
  icon,
}: {
  label: string;
  icon: string;
}) => {
  return (
    <button
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700
                 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full
                 transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
};

export default ResultPanel;
