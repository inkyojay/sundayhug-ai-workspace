import { supabase } from './supabase';
import type { Agent, AgentStatus } from '../types/database';

// LANE 정의
export type LaneType = 'LANE_1' | 'LANE_2' | 'LANE_3' | 'LANE_4';

export interface LaneInfo {
  id: LaneType;
  name: string;
  description: string;
  color: string;
}

export const LANES: Record<LaneType, LaneInfo> = {
  LANE_1: {
    id: 'LANE_1',
    name: 'Core Operations',
    description: '핵심 운영 에이전트',
    color: 'primary',
  },
  LANE_2: {
    id: 'LANE_2',
    name: 'Specialized',
    description: '전문 특화 에이전트',
    color: 'info',
  },
  LANE_3: {
    id: 'LANE_3',
    name: 'Management',
    description: '경영 관리 에이전트',
    color: 'warning',
  },
  LANE_4: {
    id: 'LANE_4',
    name: 'Analytics',
    description: '분석 및 전략 에이전트',
    color: 'success',
  },
};

// 에이전트별 LANE 매핑
export const AGENT_LANE_MAP: Record<string, LaneType> = {
  // LANE 1: Core Operations
  order: 'LANE_1',
  cs: 'LANE_1',
  marketing: 'LANE_1',
  inventory: 'LANE_1',
  logistics: 'LANE_1',
  // LANE 2: Specialized
  detail_page: 'LANE_2',
  media: 'LANE_2',
  // LANE 3: Management
  accounting: 'LANE_3',
  legal: 'LANE_3',
  ip: 'LANE_3',
  biz_support: 'LANE_3',
  // LANE 4: Analytics
  analytics: 'LANE_4',
  crisis: 'LANE_4',
  loyalty: 'LANE_4',
  partnership: 'LANE_4',
  product: 'LANE_4',
};

// 더미 에이전트 데이터
export const DUMMY_AGENTS: Agent[] = [
  // LANE 1: Core Operations
  {
    id: 'agent-001',
    agent_code: 'order',
    name: 'Order Agent',
    description: '주문 처리 및 관리를 담당하는 에이전트',
    category: 'operations',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['주문 조회', '주문 상태 변경', '배송 추적', '환불 처리'],
    mcp_tools: ['supabase', 'slack', 'coupang-api'],
    status: 'active',
    version: '1.0.0',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-002',
    agent_code: 'cs',
    name: 'CS Agent',
    description: '고객 문의 응대 및 CS 티켓 관리',
    category: 'customer',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['문의 분류', '자동 응답', '에스컬레이션', '감성 분석'],
    mcp_tools: ['supabase', 'slack', 'zendesk'],
    status: 'active',
    version: '1.0.0',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-003',
    agent_code: 'marketing',
    name: 'Marketing Agent',
    description: '마케팅 캠페인 및 프로모션 관리',
    category: 'marketing',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['캠페인 생성', '성과 분석', '타겟팅', 'A/B 테스트'],
    mcp_tools: ['supabase', 'google-analytics', 'meta-ads'],
    status: 'active',
    version: '1.0.0',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-004',
    agent_code: 'inventory',
    name: 'Inventory Agent',
    description: '재고 관리 및 발주 자동화',
    category: 'operations',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['재고 조회', '안전재고 알림', '자동 발주', '재고 예측'],
    mcp_tools: ['supabase', 'erp-connector'],
    status: 'active',
    version: '1.0.0',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-005',
    agent_code: 'logistics',
    name: 'Logistics Agent',
    description: '물류 및 배송 최적화',
    category: 'operations',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['배송 추적', '물류 최적화', '창고 관리', '반품 처리'],
    mcp_tools: ['supabase', 'cj-logistics', 'hanjin'],
    status: 'maintenance',
    version: '1.0.0',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  // LANE 2: Specialized
  {
    id: 'agent-006',
    agent_code: 'detail_page',
    name: 'Detail Page Agent',
    description: '상품 상세페이지 자동 생성',
    category: 'product',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['상세페이지 생성', '이미지 편집', 'SEO 최적화', '다국어 번역'],
    mcp_tools: ['supabase', 'canva', 'openai-dalle'],
    status: 'active',
    version: '1.0.0',
    created_at: '2025-01-16T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-007',
    agent_code: 'media',
    name: 'Media Agent',
    description: '미디어 콘텐츠 생성 및 관리',
    category: 'marketing',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['이미지 생성', '동영상 편집', 'SNS 콘텐츠', '썸네일 생성'],
    mcp_tools: ['supabase', 'canva', 'ffmpeg'],
    status: 'active',
    version: '1.0.0',
    created_at: '2025-01-16T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  // LANE 3: Management
  {
    id: 'agent-008',
    agent_code: 'accounting',
    name: 'Accounting Agent',
    description: '회계 및 재무 관리',
    category: 'operations',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['매출 정산', '세금계산서', '비용 분석', '재무 보고'],
    mcp_tools: ['supabase', 'excel', 'erp-connector'],
    status: 'inactive',
    version: '0.9.0',
    created_at: '2025-01-17T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-009',
    agent_code: 'legal',
    name: 'Legal Agent',
    description: '법률 검토 및 계약 관리',
    category: 'operations',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['계약서 검토', '법률 자문', '규정 준수', '분쟁 관리'],
    mcp_tools: ['supabase', 'document-parser'],
    status: 'inactive',
    version: '0.9.0',
    created_at: '2025-01-17T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-010',
    agent_code: 'ip',
    name: 'IP Agent',
    description: '지식재산권 관리',
    category: 'operations',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['상표 조회', '특허 관리', '저작권 보호', '침해 모니터링'],
    mcp_tools: ['supabase', 'kipris-api'],
    status: 'inactive',
    version: '0.9.0',
    created_at: '2025-01-17T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-011',
    agent_code: 'biz_support',
    name: 'BizSupport Agent',
    description: '사업 지원 업무 자동화',
    category: 'operations',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['문서 작성', '일정 관리', '회의록 정리', '업무 자동화'],
    mcp_tools: ['supabase', 'notion', 'google-calendar'],
    status: 'active',
    version: '1.0.0',
    created_at: '2025-01-17T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  // LANE 4: Analytics
  {
    id: 'agent-012',
    agent_code: 'analytics',
    name: 'Analytics Agent',
    description: '데이터 분석 및 인사이트 도출',
    category: 'analytics',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['매출 분석', '고객 분석', '트렌드 분석', '예측 모델링'],
    mcp_tools: ['supabase', 'bigquery', 'python'],
    status: 'active',
    version: '1.0.0',
    created_at: '2025-01-18T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-013',
    agent_code: 'crisis',
    name: 'Crisis Agent',
    description: '위기 상황 감지 및 대응',
    category: 'system',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['이상 감지', '알림 발송', '대응 가이드', '리포트 생성'],
    mcp_tools: ['supabase', 'slack', 'pagerduty'],
    status: 'active',
    version: '1.0.0',
    created_at: '2025-01-18T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-014',
    agent_code: 'loyalty',
    name: 'Loyalty Agent',
    description: '고객 로열티 프로그램 관리',
    category: 'customer',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['포인트 관리', '등급 산정', '혜택 추천', '이탈 방지'],
    mcp_tools: ['supabase', 'crm-connector'],
    status: 'active',
    version: '1.0.0',
    created_at: '2025-01-18T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-015',
    agent_code: 'partnership',
    name: 'Partnership Agent',
    description: '파트너십 및 제휴 관리',
    category: 'operations',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['파트너 발굴', '계약 관리', '성과 추적', '커뮤니케이션'],
    mcp_tools: ['supabase', 'hubspot'],
    status: 'inactive',
    version: '0.9.0',
    created_at: '2025-01-18T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'agent-016',
    agent_code: 'product',
    name: 'Product Agent',
    description: '상품 기획 및 관리',
    category: 'product',
    parent_agent_id: null,
    is_main_agent: true,
    capabilities: ['상품 분석', '가격 최적화', '트렌드 모니터링', '경쟁사 분석'],
    mcp_tools: ['supabase', 'web-scraper', 'python'],
    status: 'active',
    version: '1.0.0',
    created_at: '2025-01-18T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
];

// 에이전트 서비스 함수들
export const agentService = {
  // 모든 에이전트 조회
  async getAll(): Promise<Agent[]> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || DUMMY_AGENTS;
    } catch {
      // Supabase 연결 실패 시 더미 데이터 반환
      console.warn('Supabase 연결 실패, 더미 데이터 사용');
      return DUMMY_AGENTS;
    }
  },

  // ID로 에이전트 조회
  async getById(id: string): Promise<Agent | null> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch {
      return DUMMY_AGENTS.find((agent) => agent.id === id) || null;
    }
  },

  // LANE별 에이전트 그룹핑
  getGroupedByLane(agents: Agent[]): Record<LaneType, Agent[]> {
    const grouped: Record<LaneType, Agent[]> = {
      LANE_1: [],
      LANE_2: [],
      LANE_3: [],
      LANE_4: [],
    };

    agents.forEach((agent) => {
      const lane = AGENT_LANE_MAP[agent.agent_code] || 'LANE_4';
      grouped[lane].push(agent);
    });

    return grouped;
  },

  // 상태별 에이전트 수
  getStatusCounts(agents: Agent[]): Record<AgentStatus, number> {
    return agents.reduce(
      (acc, agent) => {
        acc[agent.status] = (acc[agent.status] || 0) + 1;
        return acc;
      },
      { active: 0, inactive: 0, maintenance: 0, error: 0 } as Record<AgentStatus, number>
    );
  },

  // 에이전트 상태 업데이트
  async updateStatus(id: string, status: AgentStatus): Promise<Agent | null> {
    try {
      const updateData = { status, updated_at: new Date().toISOString() };
      const { data, error } = await (supabase
        .from('agents') as ReturnType<typeof supabase.from>)
        .update(updateData as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Agent;
    } catch {
      console.warn('에이전트 상태 업데이트 실패');
      return null;
    }
  },
};

export default agentService;
