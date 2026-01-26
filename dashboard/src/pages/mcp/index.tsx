import { useState, useEffect, useMemo } from 'react';
import PageMeta from '../../components/common/PageMeta';
import Badge from '../../components/ui/badge/Badge';
import { mcpService, DUMMY_MCP_SERVERS } from '../../services/mcp';
import type { McpServer } from '../../types/database';

// 상태별 배지 색상
const getStatusBadge = (status: string): { color: 'success' | 'error' | 'warning' | 'light'; label: string } => {
  const config: Record<string, { color: 'success' | 'error' | 'warning' | 'light'; label: string }> = {
    connected: { color: 'success', label: '연결됨' },
    disconnected: { color: 'light', label: '연결 끊김' },
    error: { color: 'error', label: '오류' },
    maintenance: { color: 'warning', label: '점검 중' },
  };
  return config[status] || { color: 'light', label: status };
};

// 서버 타입 라벨
const getServerTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    stdio: 'STDIO',
    sse: 'SSE',
    http: 'HTTP/REST',
  };
  return labels[type] || type;
};

// 통계 카드 컴포넌트
interface StatCardProps {
  title: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, color, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// MCP 서버 카드 컴포넌트
interface McpServerCardProps {
  server: McpServer;
  onHealthCheck: (id: string) => void;
  onRestart: (id: string) => void;
}

function McpServerCard({ server, onHealthCheck, onRestart }: McpServerCardProps) {
  const statusBadge = getStatusBadge(server.status);
  const tools = server.available_tools as { name: string; description: string }[];
  const lastCheck = server.last_health_check
    ? new Date(server.last_health_check)
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* 헤더 */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* 서버 아이콘 */}
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                server.status === 'connected'
                  ? 'bg-success-100 dark:bg-success-500/20'
                  : server.status === 'error'
                  ? 'bg-error-100 dark:bg-error-500/20'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <svg
                className={`w-5 h-5 ${
                  server.status === 'connected'
                    ? 'text-success-500'
                    : server.status === 'error'
                    ? 'text-error-500'
                    : 'text-gray-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {server.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {server.server_code}
              </p>
            </div>
          </div>
          <Badge color={statusBadge.color} size="sm">
            {statusBadge.label}
          </Badge>
        </div>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {server.description}
        </p>
      </div>

      {/* 본문 */}
      <div className="p-5">
        {/* 서버 정보 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">타입:</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              {getServerTypeLabel(server.server_type)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">도구:</span>
            <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
              {tools.length}개
            </span>
          </div>
        </div>

        {/* 도구 목록 */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            사용 가능한 도구
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tools.slice(0, 4).map((tool, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                title={tool.description}
              >
                {tool.name}
              </span>
            ))}
            {tools.length > 4 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                +{tools.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* 마지막 헬스체크 */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            마지막 체크:{' '}
            {lastCheck
              ? `${lastCheck.toLocaleDateString('ko-KR')} ${lastCheck.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : '-'}
          </span>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
        <button
          onClick={() => onHealthCheck(server.id)}
          className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          헬스 체크
        </button>
        <button
          onClick={() => onRestart(server.id)}
          disabled={server.status === 'connected'}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            server.status === 'connected'
              ? 'text-gray-400 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
              : 'text-white bg-brand-500 hover:bg-brand-600'
          }`}
        >
          재시작
        </button>
      </div>
    </div>
  );
}

export default function MCPPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    async function fetchServers() {
      try {
        const data = await mcpService.getAll();
        setServers(data);
      } catch {
        setServers(DUMMY_MCP_SERVERS);
      } finally {
        setLoading(false);
      }
    }
    fetchServers();
  }, []);

  // 필터링된 서버
  const filteredServers = useMemo(() => {
    return servers.filter((server) => {
      const statusMatch =
        filterStatus === 'all' || server.status === filterStatus;
      const typeMatch =
        filterType === 'all' || server.server_type === filterType;
      return statusMatch && typeMatch;
    });
  }, [servers, filterStatus, filterType]);

  // 통계 계산
  const stats = useMemo(() => {
    const statusCounts = mcpService.getStatusCounts(servers);
    const totalTools = mcpService.getTotalToolCount(servers);
    return {
      total: servers.length,
      connected: statusCounts['connected'] || 0,
      disconnected: statusCounts['disconnected'] || 0,
      error: statusCounts['error'] || 0,
      totalTools,
    };
  }, [servers]);

  // 헬스 체크 핸들러
  const handleHealthCheck = async (id: string) => {
    const result = await mcpService.healthCheck(id);
    if (result.status === 'success') {
      // 실제로는 서버 상태를 새로고침해야 함
      alert('헬스 체크 완료');
    }
  };

  // 재시작 핸들러
  const handleRestart = async (id: string) => {
    const result = await mcpService.restart(id);
    if (result.status === 'success') {
      // 실제로는 서버 상태를 새로고침해야 함
      alert('서버 재시작 요청 완료');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="MCP 관리 | 썬데이허그 AI"
        description="MCP 서버 관리 페이지"
      />
      <div className="p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            MCP 서버 관리
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Model Context Protocol 서버 연결 상태를 관리하고 모니터링합니다.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="전체 서버"
            value={stats.total}
            color="bg-brand-100 dark:bg-brand-500/20"
            icon={
              <svg
                className="w-6 h-6 text-brand-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
            }
          />
          <StatCard
            title="연결됨"
            value={stats.connected}
            color="bg-success-100 dark:bg-success-500/20"
            icon={
              <svg
                className="w-6 h-6 text-success-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            }
          />
          <StatCard
            title="연결 끊김"
            value={stats.disconnected}
            color="bg-gray-100 dark:bg-gray-500/20"
            icon={
              <svg
                className="w-6 h-6 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            }
          />
          <StatCard
            title="오류"
            value={stats.error}
            color="bg-error-100 dark:bg-error-500/20"
            icon={
              <svg
                className="w-6 h-6 text-error-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            }
          />
          <StatCard
            title="총 도구 수"
            value={stats.totalTools}
            color="bg-purple-100 dark:bg-purple-500/20"
            icon={
              <svg
                className="w-6 h-6 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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
            }
          />
        </div>

        {/* 필터 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                상태:
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
              >
                <option value="all">전체</option>
                <option value="connected">연결됨</option>
                <option value="disconnected">연결 끊김</option>
                <option value="error">오류</option>
                <option value="maintenance">점검 중</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                타입:
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
              >
                <option value="all">전체</option>
                <option value="stdio">STDIO</option>
                <option value="http">HTTP/REST</option>
                <option value="sse">SSE</option>
              </select>
            </div>
            <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
              {filteredServers.length}개의 서버 표시 중
            </div>
          </div>
        </div>

        {/* MCP 서버 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServers.map((server) => (
            <McpServerCard
              key={server.id}
              server={server}
              onHealthCheck={handleHealthCheck}
              onRestart={handleRestart}
            />
          ))}
        </div>

        {/* 서버가 없을 때 */}
        {filteredServers.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              MCP 서버가 없습니다
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              필터 조건에 맞는 서버가 없습니다.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
