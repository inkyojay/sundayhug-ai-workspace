import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import PageMeta from '../../components/common/PageMeta';
import Badge from '../../components/ui/badge/Badge';
import {
  agentService,
  DUMMY_AGENTS,
  LANES,
  AGENT_LANE_MAP,
  type LaneType,
} from '../../services/agents';
import type { Agent, AgentStatus } from '../../types/database';

// 상태별 배지 색상
const getStatusBadge = (status: AgentStatus) => {
  const config: Record<AgentStatus, { color: 'success' | 'error' | 'warning' | 'light'; label: string }> = {
    active: { color: 'success', label: '활성' },
    inactive: { color: 'light', label: '비활성' },
    maintenance: { color: 'warning', label: '점검 중' },
    error: { color: 'error', label: '오류' },
  };
  return config[status];
};

// LANE별 색상
const getLaneColor = (lane: LaneType): string => {
  const colors: Record<LaneType, string> = {
    LANE_1: 'border-brand-500 bg-brand-50 dark:bg-brand-500/10',
    LANE_2: 'border-blue-500 bg-blue-50 dark:bg-blue-500/10',
    LANE_3: 'border-orange-500 bg-orange-50 dark:bg-orange-500/10',
    LANE_4: 'border-green-500 bg-green-50 dark:bg-green-500/10',
  };
  return colors[lane];
};

const getLaneBadgeColor = (lane: LaneType): 'primary' | 'info' | 'warning' | 'success' => {
  const colors: Record<LaneType, 'primary' | 'info' | 'warning' | 'success'> = {
    LANE_1: 'primary',
    LANE_2: 'info',
    LANE_3: 'warning',
    LANE_4: 'success',
  };
  return colors[lane];
};

// 에이전트 카드 컴포넌트
interface AgentCardProps {
  agent: Agent;
  lane: LaneType;
}

function AgentCard({ agent, lane }: AgentCardProps) {
  const statusBadge = getStatusBadge(agent.status);
  const capabilities = agent.capabilities as string[];
  const mcpTools = agent.mcp_tools as string[];

  return (
    <Link
      to={`/agents/${agent.id}`}
      className={`block rounded-xl border-l-4 ${getLaneColor(lane)} p-5 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-800 cursor-pointer`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {agent.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {agent.description}
          </p>
        </div>
        <Badge color={statusBadge.color} size="sm">
          {statusBadge.label}
        </Badge>
      </div>

      {/* 역량 태그 */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          주요 역량
        </p>
        <div className="flex flex-wrap gap-1.5">
          {capabilities.slice(0, 4).map((cap, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* MCP 도구 */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          연결된 MCP
        </p>
        <div className="flex flex-wrap gap-1.5">
          {mcpTools.map((tool, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          v{agent.version}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(agent.updated_at).toLocaleDateString('ko-KR')} 업데이트
        </span>
      </div>
    </Link>
  );
}

// LANE 섹션 컴포넌트
interface LaneSectionProps {
  lane: LaneType;
  agents: Agent[];
}

function LaneSection({ lane, agents }: LaneSectionProps) {
  const laneInfo = LANES[lane];

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Badge color={getLaneBadgeColor(lane)} variant="solid" size="md">
          {lane.replace('_', ' ')}
        </Badge>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {laneInfo.name}
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {laneInfo.description}
        </span>
        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {agents.length}개 에이전트
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} lane={lane} />
        ))}
      </div>
    </div>
  );
}

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

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<AgentStatus | 'all'>('all');
  const [filterLane, setFilterLane] = useState<LaneType | 'all'>('all');

  useEffect(() => {
    async function fetchAgents() {
      try {
        const data = await agentService.getAll();
        setAgents(data);
      } catch {
        setAgents(DUMMY_AGENTS);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  // 필터링된 에이전트
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const statusMatch = filterStatus === 'all' || agent.status === filterStatus;
      const laneMatch =
        filterLane === 'all' || AGENT_LANE_MAP[agent.agent_code] === filterLane;
      return statusMatch && laneMatch;
    });
  }, [agents, filterStatus, filterLane]);

  // LANE별 그룹핑
  const groupedAgents = useMemo(() => {
    return agentService.getGroupedByLane(filteredAgents);
  }, [filteredAgents]);

  // 상태별 카운트
  const statusCounts = useMemo(() => {
    return agentService.getStatusCounts(agents);
  }, [agents]);

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
        title="에이전트 관리 | 썬데이허그 AI"
        description="AI 에이전트 관리 페이지"
      />
      <div className="p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            에이전트 관리
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            LANE별로 구성된 AI 에이전트를 관리하고 모니터링합니다.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="전체 에이전트"
            value={agents.length}
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
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            }
          />
          <StatCard
            title="활성"
            value={statusCounts.active}
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            title="점검 중"
            value={statusCounts.maintenance}
            color="bg-warning-100 dark:bg-warning-500/20"
            icon={
              <svg
                className="w-6 h-6 text-warning-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            }
          />
          <StatCard
            title="비활성"
            value={statusCounts.inactive}
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
                onChange={(e) => setFilterStatus(e.target.value as AgentStatus | 'all')}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
              >
                <option value="all">전체</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
                <option value="maintenance">점검 중</option>
                <option value="error">오류</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                LANE:
              </label>
              <select
                value={filterLane}
                onChange={(e) => setFilterLane(e.target.value as LaneType | 'all')}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
              >
                <option value="all">전체</option>
                <option value="LANE_1">LANE 1 - Core Operations</option>
                <option value="LANE_2">LANE 2 - Specialized</option>
                <option value="LANE_3">LANE 3 - Management</option>
                <option value="LANE_4">LANE 4 - Analytics</option>
              </select>
            </div>
            <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
              {filteredAgents.length}개의 에이전트 표시 중
            </div>
          </div>
        </div>

        {/* LANE별 에이전트 목록 */}
        {filterLane === 'all' ? (
          Object.entries(groupedAgents).map(([lane, laneAgents]) =>
            laneAgents.length > 0 ? (
              <LaneSection
                key={lane}
                lane={lane as LaneType}
                agents={laneAgents}
              />
            ) : null
          )
        ) : (
          <LaneSection lane={filterLane} agents={filteredAgents} />
        )}

        {/* 에이전트가 없을 때 */}
        {filteredAgents.length === 0 && (
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
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              에이전트가 없습니다
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              필터 조건에 맞는 에이전트가 없습니다.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
