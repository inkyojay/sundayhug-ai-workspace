import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import ReactMarkdown from 'react-markdown';
import PageMeta from '../../../components/common/PageMeta';
import Badge from '../../../components/ui/badge/Badge';
import {
  agentService,
  DUMMY_AGENTS,
  AGENT_LANE_MAP,
  LANES,
  type LaneType,
} from '../../../services/agents';
import type { Agent, AgentStatus, Workflow } from '../../../types/database';

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

// LANE별 배지 색상
const getLaneBadgeColor = (lane: LaneType): 'primary' | 'info' | 'warning' | 'success' => {
  const colors: Record<LaneType, 'primary' | 'info' | 'warning' | 'success'> = {
    LANE_1: 'primary',
    LANE_2: 'info',
    LANE_3: 'warning',
    LANE_4: 'success',
  };
  return colors[lane];
};

// 탭 타입 정의
type TabType = 'info' | 'instructions' | 'workflows' | 'history';

// 더미 워크플로우 데이터 (에이전트와 연결된)
const DUMMY_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-001',
    workflow_code: 'order_processing',
    name: '주문 처리 워크플로우',
    description: '새 주문이 들어오면 자동으로 처리하는 워크플로우',
    trigger_type: 'event',
    trigger_config: { event: 'order.created' },
    steps: [],
    is_active: true,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'wf-002',
    workflow_code: 'refund_automation',
    name: '환불 자동화 워크플로우',
    description: '환불 요청 시 자동 검증 및 처리',
    trigger_type: 'event',
    trigger_config: { event: 'order.refund_requested' },
    steps: [],
    is_active: true,
    created_at: '2025-01-16T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'wf-003',
    workflow_code: 'cs_ticket_routing',
    name: 'CS 티켓 라우팅',
    description: 'CS 티켓을 적절한 담당자에게 자동 할당',
    trigger_type: 'event',
    trigger_config: { event: 'ticket.created' },
    steps: [],
    is_active: false,
    created_at: '2025-01-17T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
];

// 에이전트별 더미 지침 (instructions)
const AGENT_INSTRUCTIONS: Record<string, string> = {
  order: `# Order Agent 지침

## 역할
주문 처리 및 관리를 담당하는 핵심 운영 에이전트입니다.

## 주요 책임
1. **주문 조회**: 고객 또는 관리자가 요청한 주문 정보를 조회합니다.
2. **주문 상태 변경**: 주문의 상태를 업데이트합니다.
3. **배송 추적**: 배송 현황을 실시간으로 추적합니다.
4. **환불 처리**: 환불 요청을 검토하고 처리합니다.

## 제약 사항
- 100만원 이상의 환불은 자동 처리하지 않고 승인 요청을 생성합니다.
- 배송 완료 후 7일이 지난 주문의 환불은 추가 검토가 필요합니다.

## 사용 가능한 MCP 도구
- \`supabase\`: 데이터베이스 조회 및 수정
- \`slack\`: 알림 전송
- \`coupang-api\`: 쿠팡 주문 연동

## 예시 시나리오
\`\`\`
사용자: 주문번호 ORD-20250127-001 조회해줘
에이전트: 해당 주문을 조회하겠습니다.
         [supabase 도구로 주문 조회]
         결과: 주문 상태 - 배송 중, 예상 도착일 - 2025-01-29
\`\`\`
`,
  cs: `# CS Agent 지침

## 역할
고객 문의 응대 및 CS 티켓 관리를 담당합니다.

## 주요 책임
1. **문의 분류**: 고객 문의를 적절한 카테고리로 분류합니다.
2. **자동 응답**: 자주 묻는 질문에 대해 자동으로 응답합니다.
3. **에스컬레이션**: 복잡한 문의는 담당자에게 전달합니다.
4. **감성 분석**: 고객 메시지의 감성을 분석합니다.

## 응답 가이드라인
- 항상 친절하고 공감적인 톤을 유지합니다.
- 고객의 불편함에 대해 먼저 사과합니다.
- 명확하고 구체적인 해결책을 제시합니다.

## 에스컬레이션 기준
- 고객이 3번 이상 같은 문제로 문의한 경우
- 감성 분석 결과 "매우 부정적"인 경우
- 법적 이슈가 언급된 경우
`,
  marketing: `# Marketing Agent 지침

## 역할
마케팅 캠페인 및 프로모션 관리를 담당합니다.

## 주요 책임
1. **캠페인 생성**: 마케팅 캠페인을 기획하고 생성합니다.
2. **성과 분석**: 캠페인 성과를 분석하고 리포트합니다.
3. **타겟팅**: 적절한 고객 세그먼트를 선정합니다.
4. **A/B 테스트**: 다양한 변형을 테스트합니다.

## 캠페인 승인 기준
- 예산 100만원 미만: 자동 승인
- 예산 100만원~500만원: 팀장 승인 필요
- 예산 500만원 이상: 임원 승인 필요
`,
  inventory: `# Inventory Agent 지침

## 역할
재고 관리 및 발주 자동화를 담당합니다.

## 주요 책임
1. **재고 조회**: 실시간 재고 현황을 조회합니다.
2. **안전재고 알림**: 재고가 안전재고 이하로 떨어지면 알림을 전송합니다.
3. **자동 발주**: 재주문점 도달 시 자동으로 발주합니다.
4. **재고 예측**: 수요 예측 기반으로 재고를 최적화합니다.

## 발주 규칙
- 재주문점 = 평균 일 판매량 * 리드타임 + 안전재고
- 자동 발주 최대 금액: 1,000만원
- 초과 시 승인 요청 생성
`,
};

// 기본 지침 (매핑되지 않은 에이전트용)
const DEFAULT_INSTRUCTIONS = `# 에이전트 지침

이 에이전트의 상세 지침이 아직 작성되지 않았습니다.

## 기본 동작
- 에이전트 정의에 따라 기본 작업을 수행합니다.
- 지침은 관리자 페이지에서 업데이트할 수 있습니다.
`;

// 기본 정보 탭 컴포넌트
function InfoTab({ agent }: { agent: Agent }) {
  const capabilities = agent.capabilities as string[];
  const mcpTools = agent.mcp_tools as string[];
  const statusBadge = getStatusBadge(agent.status);
  const lane = AGENT_LANE_MAP[agent.agent_code] || 'LANE_4';
  const laneInfo = LANES[lane];

  return (
    <div className="space-y-6">
      {/* 기본 정보 카드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          기본 정보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">에이전트 코드</p>
            <p className="text-base font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              {agent.agent_code}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">카테고리</p>
            <p className="text-base text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg capitalize">
              {agent.category}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">상태</p>
            <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              <Badge color={statusBadge.color} size="md">
                {statusBadge.label}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">버전</p>
            <p className="text-base text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              v{agent.version}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">LANE</p>
            <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg flex items-center gap-2">
              <Badge color={getLaneBadgeColor(lane)} variant="solid" size="sm">
                {lane.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {laneInfo.name}
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">메인 에이전트</p>
            <p className="text-base text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              {agent.is_main_agent ? '예' : '아니오'}
            </p>
          </div>
        </div>
      </div>

      {/* 역량 카드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          주요 역량
        </h3>
        <div className="flex flex-wrap gap-2">
          {capabilities.map((cap, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* MCP 도구 카드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          연결된 MCP 도구
        </h3>
        <div className="flex flex-wrap gap-2">
          {mcpTools.map((tool, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* 타임스탬프 카드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          시간 정보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">생성일</p>
            <p className="text-base text-gray-900 dark:text-white">
              {new Date(agent.created_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">최종 수정일</p>
            <p className="text-base text-gray-900 dark:text-white">
              {new Date(agent.updated_at).toLocaleString('ko-KR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 지침 탭 컴포넌트
function InstructionsTab({ agent }: { agent: Agent }) {
  const instructions = AGENT_INSTRUCTIONS[agent.agent_code] || DEFAULT_INSTRUCTIONS;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-gray-700 dark:text-gray-300">{children}</li>
            ),
            code: ({ className, children }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-brand-600 dark:text-brand-400 text-sm font-mono">
                    {children}
                  </code>
                );
              }
              return (
                <code className="block bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4">
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                {children}
              </pre>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-gray-900 dark:text-white">
                {children}
              </strong>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-brand-500 pl-4 py-1 my-4 text-gray-600 dark:text-gray-400 italic">
                {children}
              </blockquote>
            ),
          }}
        >
          {instructions}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// 워크플로우 탭 컴포넌트
function WorkflowsTab({ agent }: { agent: Agent }) {
  // 에이전트 코드 기반으로 관련 워크플로우 필터링 (더미 데이터)
  const relatedWorkflows = DUMMY_WORKFLOWS.filter((wf) => {
    // order 에이전트는 order 관련 워크플로우와 연결
    if (agent.agent_code === 'order') {
      return wf.workflow_code.includes('order') || wf.workflow_code.includes('refund');
    }
    // cs 에이전트는 ticket 관련 워크플로우와 연결
    if (agent.agent_code === 'cs') {
      return wf.workflow_code.includes('ticket') || wf.workflow_code.includes('cs');
    }
    return false;
  });

  if (relatedWorkflows.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm text-center">
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          연결된 워크플로우가 없습니다
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          이 에이전트에 연결된 워크플로우가 아직 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {relatedWorkflows.map((workflow) => (
        <div
          key={workflow.id}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {workflow.name}
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    workflow.is_active
                      ? 'bg-success-50 text-success-600 dark:bg-success-500/20 dark:text-success-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {workflow.is_active ? '활성' : '비활성'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {workflow.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
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
                  트리거: {workflow.trigger_type}
                </span>
                <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                  {workflow.workflow_code}
                </span>
              </div>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// 실행 이력 탭 컴포넌트 (추후 구현)
function HistoryTab() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm text-center">
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
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        실행 이력
      </h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        에이전트 실행 이력 기능은 추후 구현 예정입니다.
      </p>
    </div>
  );
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  useEffect(() => {
    async function fetchAgent() {
      if (!id) return;

      try {
        const data = await agentService.getById(id);
        setAgent(data);
      } catch {
        // Supabase 연결 실패 시 더미 데이터에서 찾기
        const dummyAgent = DUMMY_AGENTS.find((a) => a.id === id);
        setAgent(dummyAgent || null);
      } finally {
        setLoading(false);
      }
    }
    fetchAgent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
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
          <h3 className="mt-4 text-xl font-medium text-gray-900 dark:text-white">
            에이전트를 찾을 수 없습니다
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            요청하신 에이전트가 존재하지 않거나 삭제되었습니다.
          </p>
          <Link
            to="/agents"
            className="inline-flex items-center mt-6 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            에이전트 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(agent.status);
  const lane = AGENT_LANE_MAP[agent.agent_code] || 'LANE_4';

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'info',
      label: '기본 정보',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 'instructions',
      label: '지침',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: 'workflows',
      label: '워크플로우',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
    },
    {
      id: 'history',
      label: '실행 이력',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      <PageMeta
        title={`${agent.name} | 에이전트 상세`}
        description={agent.description || '에이전트 상세 정보'}
      />
      <div className="p-6">
        {/* 헤더 */}
        <div className="mb-6">
          {/* 뒤로가기 링크 */}
          <Link
            to="/agents"
            className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 mb-4"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            에이전트 목록
          </Link>

          {/* 에이전트 헤더 */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {agent.name}
                </h1>
                <Badge color={statusBadge.color} size="md">
                  {statusBadge.label}
                </Badge>
                <Badge color={getLaneBadgeColor(lane)} variant="light" size="sm">
                  {lane.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {agent.description}
              </p>
            </div>
            <button className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              편집
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <div>
          {activeTab === 'info' && <InfoTab agent={agent} />}
          {activeTab === 'instructions' && <InstructionsTab agent={agent} />}
          {activeTab === 'workflows' && <WorkflowsTab agent={agent} />}
          {activeTab === 'history' && <HistoryTab />}
        </div>
      </div>
    </>
  );
}
