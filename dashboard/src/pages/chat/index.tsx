import PageMeta from '../../components/common/PageMeta';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { ResultPanel } from '../../components/result-panel/ResultPanel';

export default function ChatPage() {
  return (
    <>
      <PageMeta title="AI 채팅 | 썬데이허그 AI" description="AI 어시스턴트와 대화하세요" />

      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* 페이지 헤더 */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI 어시스턴트
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            자연어로 질문하면 주문, 재고, CS 등 비즈니스 정보를 조회하고 분석해드립니다.
          </p>
        </div>

        {/* NotebookLM 스타일 레이아웃: 왼쪽 채팅, 오른쪽 결과 */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* 왼쪽: 채팅 윈도우 */}
          <ChatWindow className="h-full" />

          {/* 오른쪽: 결과 패널 */}
          <ResultPanel className="h-full hidden lg:flex" />
        </div>

        {/* 모바일에서 결과 패널 토글 (필요시) */}
        <div className="lg:hidden mt-4">
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                결과 패널 보기
              </span>
              <svg
                className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="mt-2">
              <ResultPanel className="h-[400px]" />
            </div>
          </details>
        </div>
      </div>
    </>
  );
}
