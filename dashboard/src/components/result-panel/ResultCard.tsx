import type { ToolResult } from '../../types';

interface ResultCardProps {
  result: ToolResult;
  onClose?: () => void;
}

export const ResultCard = ({ result, onClose }: ResultCardProps) => {
  const { toolName, data, displayType } = result;

  // 도구 이름에 따른 아이콘 및 색상
  const getToolConfig = (name: string) => {
    const configs: Record<string, { icon: string; color: string; label: string }> = {
      'order-search': { icon: '📦', color: 'blue', label: '주문 검색' },
      'customer-info': { icon: '👤', color: 'green', label: '고객 정보' },
      'inventory-check': { icon: '📊', color: 'purple', label: '재고 확인' },
      'ticket-search': { icon: '🎫', color: 'orange', label: '티켓 검색' },
      'analytics': { icon: '📈', color: 'indigo', label: '분석 결과' },
      default: { icon: '📋', color: 'gray', label: '결과' },
    };
    return configs[name] || configs['default'];
  };

  const config = getToolConfig(toolName);

  // 디스플레이 타입에 따른 렌더링
  const renderContent = () => {
    switch (displayType) {
      case 'card':
        return <CardDisplay data={data} />;
      case 'table':
        return <TableDisplay data={data} />;
      case 'chart':
        return <ChartPlaceholder />;
      case 'text':
      default:
        return <TextDisplay data={data} />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 카드 헤더 */}
      <div
        className={`flex items-center justify-between px-4 py-3 bg-${config.color}-50 dark:bg-${config.color}-900/20 border-b border-gray-200 dark:border-gray-700`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {config.label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {toolName}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 카드 내용 */}
      <div className="p-4">{renderContent()}</div>
    </div>
  );
};

// 카드형 디스플레이
const CardDisplay = ({ data }: { data: unknown }) => {
  if (!data || typeof data !== 'object') {
    return <TextDisplay data={data} />;
  }

  const entries = Object.entries(data as Record<string, unknown>);

  return (
    <div className="grid grid-cols-2 gap-3">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {formatLabel(key)}
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {formatValue(value)}
          </div>
        </div>
      ))}
    </div>
  );
};

// 테이블형 디스플레이
const TableDisplay = ({ data }: { data: unknown }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        표시할 데이터가 없습니다.
      </p>
    );
  }

  const headers = Object.keys(data[0] as Record<string, unknown>);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {headers.map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {formatLabel(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
            >
              {headers.map((header) => (
                <td
                  key={header}
                  className="px-3 py-2 text-gray-900 dark:text-white"
                >
                  {formatValue((row as Record<string, unknown>)[header])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// 차트 플레이스홀더
const ChartPlaceholder = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
      <svg
        className="w-12 h-12 mb-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p className="text-sm">차트 준비 중...</p>
    </div>
  );
};

// 텍스트형 디스플레이
const TextDisplay = ({ data }: { data: unknown }) => {
  const content =
    typeof data === 'string'
      ? data
      : typeof data === 'object'
      ? JSON.stringify(data, null, 2)
      : String(data);

  return (
    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg overflow-x-auto">
      {content}
    </pre>
  );
};

// 유틸리티 함수들
function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (typeof value === 'number') return value.toLocaleString('ko-KR');
  if (value instanceof Date) return value.toLocaleDateString('ko-KR');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default ResultCard;
