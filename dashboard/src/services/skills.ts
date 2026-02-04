import { supabase } from './supabase';
import type { Skill } from '../types/database';

// 스킬 카테고리
export type SkillCategory =
  | 'data'
  | 'communication'
  | 'analysis'
  | 'automation'
  | 'integration'
  | 'content';

export interface SkillCategoryInfo {
  id: SkillCategory;
  name: string;
  description: string;
  icon: string;
}

export const SKILL_CATEGORIES: Record<SkillCategory, SkillCategoryInfo> = {
  data: {
    id: 'data',
    name: '데이터 처리',
    description: 'CRUD, 쿼리, 데이터 변환 관련 스킬',
    icon: 'database',
  },
  communication: {
    id: 'communication',
    name: '커뮤니케이션',
    description: '알림, 메시지, 이메일 발송 스킬',
    icon: 'message',
  },
  analysis: {
    id: 'analysis',
    name: '분석',
    description: '데이터 분석, 리포트 생성 스킬',
    icon: 'chart',
  },
  automation: {
    id: 'automation',
    name: '자동화',
    description: '워크플로우, 배치 처리 스킬',
    icon: 'cog',
  },
  integration: {
    id: 'integration',
    name: '연동',
    description: '외부 API, 서비스 연동 스킬',
    icon: 'link',
  },
  content: {
    id: 'content',
    name: '콘텐츠',
    description: '콘텐츠 생성, 편집 스킬',
    icon: 'document',
  },
};

// 더미 스킬 데이터
export const DUMMY_SKILLS: Skill[] = [
  // 데이터 처리 스킬
  {
    id: 'skill-001',
    skill_code: 'query_orders',
    name: '주문 조회',
    description: '주문 데이터를 다양한 조건으로 조회합니다',
    category: 'data',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        date_from: { type: 'string', format: 'date' },
        date_to: { type: 'string', format: 'date' },
        channel: { type: 'string' },
      },
    },
    output_schema: {
      type: 'array',
      items: { type: 'object' },
    },
    implementation_type: 'supabase_query',
    implementation_config: { table: 'orders' },
    is_active: true,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'skill-002',
    skill_code: 'update_order_status',
    name: '주문 상태 변경',
    description: '주문의 상태를 업데이트합니다',
    category: 'data',
    input_schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string' },
        new_status: { type: 'string' },
      },
      required: ['order_id', 'new_status'],
    },
    output_schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        order: { type: 'object' },
      },
    },
    implementation_type: 'supabase_mutation',
    implementation_config: { table: 'orders', operation: 'update' },
    is_active: true,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'skill-003',
    skill_code: 'query_inventory',
    name: '재고 조회',
    description: '상품 재고 현황을 조회합니다',
    category: 'data',
    input_schema: {
      type: 'object',
      properties: {
        sku: { type: 'string' },
        low_stock_only: { type: 'boolean' },
      },
    },
    output_schema: {
      type: 'array',
      items: { type: 'object' },
    },
    implementation_type: 'supabase_query',
    implementation_config: { table: 'inventory' },
    is_active: true,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  // 커뮤니케이션 스킬
  {
    id: 'skill-004',
    skill_code: 'send_slack_message',
    name: 'Slack 메시지 발송',
    description: 'Slack 채널에 메시지를 발송합니다',
    category: 'communication',
    input_schema: {
      type: 'object',
      properties: {
        channel: { type: 'string' },
        message: { type: 'string' },
        attachments: { type: 'array' },
      },
      required: ['channel', 'message'],
    },
    output_schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        ts: { type: 'string' },
      },
    },
    implementation_type: 'mcp_tool',
    implementation_config: { server: 'slack', tool: 'send_message' },
    is_active: true,
    created_at: '2025-01-16T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'skill-005',
    skill_code: 'send_email',
    name: '이메일 발송',
    description: '고객에게 이메일을 발송합니다',
    category: 'communication',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', format: 'email' },
        subject: { type: 'string' },
        body: { type: 'string' },
        template_id: { type: 'string' },
      },
      required: ['to', 'subject'],
    },
    output_schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message_id: { type: 'string' },
      },
    },
    implementation_type: 'mcp_tool',
    implementation_config: { server: 'sendgrid', tool: 'send_email' },
    is_active: true,
    created_at: '2025-01-16T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'skill-006',
    skill_code: 'send_sms',
    name: 'SMS 발송',
    description: '고객에게 SMS를 발송합니다',
    category: 'communication',
    input_schema: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['phone', 'message'],
    },
    output_schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
    implementation_type: 'mcp_tool',
    implementation_config: { server: 'aligo', tool: 'send_sms' },
    is_active: false,
    created_at: '2025-01-16T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  // 분석 스킬
  {
    id: 'skill-007',
    skill_code: 'analyze_sales',
    name: '매출 분석',
    description: '기간별 매출 데이터를 분석합니다',
    category: 'analysis',
    input_schema: {
      type: 'object',
      properties: {
        date_from: { type: 'string', format: 'date' },
        date_to: { type: 'string', format: 'date' },
        group_by: { type: 'string', enum: ['day', 'week', 'month'] },
      },
    },
    output_schema: {
      type: 'object',
      properties: {
        total_sales: { type: 'number' },
        order_count: { type: 'number' },
        chart_data: { type: 'array' },
      },
    },
    implementation_type: 'python_function',
    implementation_config: { function: 'analyze_sales' },
    is_active: true,
    created_at: '2025-01-17T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'skill-008',
    skill_code: 'sentiment_analysis',
    name: '감성 분석',
    description: '텍스트의 감성을 분석합니다',
    category: 'analysis',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
      },
      required: ['text'],
    },
    output_schema: {
      type: 'object',
      properties: {
        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
        score: { type: 'number' },
      },
    },
    implementation_type: 'llm_call',
    implementation_config: { model: 'claude-3-5-sonnet' },
    is_active: true,
    created_at: '2025-01-17T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  // 자동화 스킬
  {
    id: 'skill-009',
    skill_code: 'auto_categorize_ticket',
    name: '티켓 자동 분류',
    description: 'CS 티켓을 자동으로 분류합니다',
    category: 'automation',
    input_schema: {
      type: 'object',
      properties: {
        ticket_id: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['ticket_id', 'content'],
    },
    output_schema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        priority: { type: 'string' },
        suggested_response: { type: 'string' },
      },
    },
    implementation_type: 'llm_call',
    implementation_config: { model: 'claude-3-5-sonnet' },
    is_active: true,
    created_at: '2025-01-18T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'skill-010',
    skill_code: 'auto_reorder',
    name: '자동 발주',
    description: '재고 부족 상품을 자동 발주합니다',
    category: 'automation',
    input_schema: {
      type: 'object',
      properties: {
        sku: { type: 'string' },
        quantity: { type: 'number' },
      },
      required: ['sku', 'quantity'],
    },
    output_schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string' },
        status: { type: 'string' },
      },
    },
    implementation_type: 'workflow',
    implementation_config: { workflow_id: 'auto_reorder_flow' },
    is_active: false,
    created_at: '2025-01-18T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  // 연동 스킬
  {
    id: 'skill-011',
    skill_code: 'fetch_coupang_orders',
    name: '쿠팡 주문 연동',
    description: '쿠팡에서 신규 주문을 가져옵니다',
    category: 'integration',
    input_schema: {
      type: 'object',
      properties: {
        date_from: { type: 'string', format: 'date' },
        status: { type: 'string' },
      },
    },
    output_schema: {
      type: 'object',
      properties: {
        orders: { type: 'array' },
        count: { type: 'number' },
      },
    },
    implementation_type: 'mcp_tool',
    implementation_config: { server: 'coupang', tool: 'fetch_orders' },
    is_active: true,
    created_at: '2025-01-19T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'skill-012',
    skill_code: 'sync_naver_orders',
    name: '네이버 주문 연동',
    description: '네이버 스마트스토어 주문을 연동합니다',
    category: 'integration',
    input_schema: {
      type: 'object',
      properties: {
        date_from: { type: 'string', format: 'date' },
      },
    },
    output_schema: {
      type: 'object',
      properties: {
        orders: { type: 'array' },
        count: { type: 'number' },
      },
    },
    implementation_type: 'mcp_tool',
    implementation_config: { server: 'naver', tool: 'sync_orders' },
    is_active: true,
    created_at: '2025-01-19T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  // 콘텐츠 스킬
  {
    id: 'skill-013',
    skill_code: 'generate_product_description',
    name: '상품 설명 생성',
    description: 'AI로 상품 설명을 자동 생성합니다',
    category: 'content',
    input_schema: {
      type: 'object',
      properties: {
        product_name: { type: 'string' },
        features: { type: 'array', items: { type: 'string' } },
        target_audience: { type: 'string' },
      },
      required: ['product_name'],
    },
    output_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        seo_keywords: { type: 'array' },
      },
    },
    implementation_type: 'llm_call',
    implementation_config: { model: 'claude-3-5-sonnet' },
    is_active: true,
    created_at: '2025-01-20T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'skill-014',
    skill_code: 'generate_marketing_copy',
    name: '마케팅 카피 생성',
    description: '마케팅용 문구를 자동 생성합니다',
    category: 'content',
    input_schema: {
      type: 'object',
      properties: {
        campaign_type: { type: 'string' },
        product: { type: 'string' },
        tone: { type: 'string' },
      },
    },
    output_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        body: { type: 'string' },
        cta: { type: 'string' },
      },
    },
    implementation_type: 'llm_call',
    implementation_config: { model: 'claude-3-5-sonnet' },
    is_active: true,
    created_at: '2025-01-20T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
];

// 스킬 서비스 함수들
export const skillService = {
  // 모든 스킬 조회
  async getAll(): Promise<Skill[]> {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || DUMMY_SKILLS;
    } catch {
      console.warn('Supabase 연결 실패, 더미 데이터 사용');
      return DUMMY_SKILLS;
    }
  },

  // ID로 스킬 조회
  async getById(id: string): Promise<Skill | null> {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch {
      return DUMMY_SKILLS.find((skill) => skill.id === id) || null;
    }
  },

  // 카테고리별 스킬 그룹핑
  getGroupedByCategory(skills: Skill[]): Record<string, Skill[]> {
    return skills.reduce(
      (acc, skill) => {
        const category = (skill.category as string) || 'etc';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(skill);
        return acc;
      },
      {} as Record<string, Skill[]>
    );
  },

  // 활성 스킬만 필터링
  getActiveSkills(skills: Skill[]): Skill[] {
    return skills.filter((skill) => skill.is_active);
  },

  // 스킬 활성화/비활성화 토글
  async toggleActive(id: string, isActive: boolean): Promise<Skill | null> {
    try {
      const updateData = { is_active: isActive, updated_at: new Date().toISOString() };
      const { data, error } = await (supabase
        .from('skills') as ReturnType<typeof supabase.from>)
        .update(updateData as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch {
      console.warn('스킬 상태 업데이트 실패');
      return null;
    }
  },

  // 구현 타입별 스킬 수
  getImplementationTypeCounts(skills: Skill[]): Record<string, number> {
    return skills.reduce(
      (acc, skill) => {
        acc[skill.implementation_type] = (acc[skill.implementation_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  },
};

export default skillService;
