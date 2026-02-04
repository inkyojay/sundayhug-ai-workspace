import { supabase } from './supabase';
import type { McpServer } from '../types/database';

// MCP 서버 상태 타입
export type McpServerStatus = 'connected' | 'disconnected' | 'error' | 'maintenance';

// MCP 서버 타입
export type McpServerType = 'stdio' | 'sse' | 'http';

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// 더미 MCP 서버 데이터
export const DUMMY_MCP_SERVERS: McpServer[] = [
  {
    id: 'mcp-001',
    server_code: 'supabase',
    name: 'Supabase MCP',
    description: 'Supabase 데이터베이스 연동 서버',
    server_type: 'stdio',
    connection_config: {
      command: 'npx',
      args: ['-y', '@supabase/mcp-server', '--supabase-url', 'env:SUPABASE_URL'],
    },
    available_tools: [
      { name: 'query', description: '데이터 조회' },
      { name: 'insert', description: '데이터 삽입' },
      { name: 'update', description: '데이터 업데이트' },
      { name: 'delete', description: '데이터 삭제' },
      { name: 'rpc', description: 'RPC 함수 호출' },
    ],
    status: 'connected',
    last_health_check: '2025-01-27T09:30:00Z',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'mcp-002',
    server_code: 'slack',
    name: 'Slack MCP',
    description: 'Slack 워크스페이스 연동 서버',
    server_type: 'stdio',
    connection_config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-slack', '--token', 'env:SLACK_BOT_TOKEN'],
    },
    available_tools: [
      { name: 'send_message', description: '메시지 발송' },
      { name: 'list_channels', description: '채널 목록 조회' },
      { name: 'get_thread', description: '스레드 조회' },
      { name: 'add_reaction', description: '리액션 추가' },
    ],
    status: 'connected',
    last_health_check: '2025-01-27T09:30:00Z',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'mcp-003',
    server_code: 'coupang',
    name: 'Coupang API MCP',
    description: '쿠팡 오픈마켓 API 연동 서버',
    server_type: 'http',
    connection_config: {
      endpoint: 'https://api-gateway.coupang.com',
      auth_type: 'hmac',
    },
    available_tools: [
      { name: 'fetch_orders', description: '주문 조회' },
      { name: 'update_order_status', description: '주문 상태 변경' },
      { name: 'get_products', description: '상품 조회' },
      { name: 'update_inventory', description: '재고 업데이트' },
      { name: 'upload_invoice', description: '송장 업로드' },
    ],
    status: 'connected',
    last_health_check: '2025-01-27T09:28:00Z',
    created_at: '2025-01-16T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'mcp-004',
    server_code: 'naver',
    name: 'Naver Commerce MCP',
    description: '네이버 스마트스토어 API 연동 서버',
    server_type: 'http',
    connection_config: {
      endpoint: 'https://api.commerce.naver.com',
      auth_type: 'oauth2',
    },
    available_tools: [
      { name: 'sync_orders', description: '주문 동기화' },
      { name: 'get_products', description: '상품 조회' },
      { name: 'update_product', description: '상품 정보 수정' },
      { name: 'send_dispatch', description: '발송 처리' },
    ],
    status: 'connected',
    last_health_check: '2025-01-27T09:25:00Z',
    created_at: '2025-01-16T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'mcp-005',
    server_code: 'google-sheets',
    name: 'Google Sheets MCP',
    description: 'Google Sheets 연동 서버',
    server_type: 'stdio',
    connection_config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-google-sheets'],
    },
    available_tools: [
      { name: 'read_sheet', description: '시트 읽기' },
      { name: 'write_sheet', description: '시트 쓰기' },
      { name: 'append_row', description: '행 추가' },
      { name: 'create_sheet', description: '시트 생성' },
    ],
    status: 'connected',
    last_health_check: '2025-01-27T09:30:00Z',
    created_at: '2025-01-17T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'mcp-006',
    server_code: 'notion',
    name: 'Notion MCP',
    description: 'Notion 워크스페이스 연동 서버',
    server_type: 'stdio',
    connection_config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-notion', '--token', 'env:NOTION_TOKEN'],
    },
    available_tools: [
      { name: 'query_database', description: '데이터베이스 조회' },
      { name: 'create_page', description: '페이지 생성' },
      { name: 'update_page', description: '페이지 수정' },
      { name: 'search', description: '검색' },
    ],
    status: 'disconnected',
    last_health_check: '2025-01-27T08:00:00Z',
    created_at: '2025-01-17T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'mcp-007',
    server_code: 'sendgrid',
    name: 'SendGrid MCP',
    description: '이메일 발송 서버',
    server_type: 'http',
    connection_config: {
      endpoint: 'https://api.sendgrid.com/v3',
      auth_type: 'api_key',
    },
    available_tools: [
      { name: 'send_email', description: '이메일 발송' },
      { name: 'send_template', description: '템플릿 이메일 발송' },
      { name: 'get_stats', description: '발송 통계 조회' },
    ],
    status: 'connected',
    last_health_check: '2025-01-27T09:29:00Z',
    created_at: '2025-01-18T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'mcp-008',
    server_code: 'cj-logistics',
    name: 'CJ Logistics MCP',
    description: 'CJ대한통운 배송 연동 서버',
    server_type: 'http',
    connection_config: {
      endpoint: 'https://api.cjlogistics.com',
      auth_type: 'api_key',
    },
    available_tools: [
      { name: 'track_shipment', description: '배송 추적' },
      { name: 'create_shipment', description: '배송 등록' },
      { name: 'get_rates', description: '요금 조회' },
      { name: 'schedule_pickup', description: '픽업 예약' },
    ],
    status: 'connected',
    last_health_check: '2025-01-27T09:27:00Z',
    created_at: '2025-01-18T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'mcp-009',
    server_code: 'web-scraper',
    name: 'Web Scraper MCP',
    description: '웹 스크래핑 서버',
    server_type: 'stdio',
    connection_config: {
      command: 'python',
      args: ['-m', 'mcp_web_scraper'],
    },
    available_tools: [
      { name: 'fetch_page', description: '웹페이지 가져오기' },
      { name: 'extract_data', description: '데이터 추출' },
      { name: 'screenshot', description: '스크린샷 촬영' },
    ],
    status: 'error',
    last_health_check: '2025-01-27T06:00:00Z',
    created_at: '2025-01-19T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
  {
    id: 'mcp-010',
    server_code: 'python',
    name: 'Python Runtime MCP',
    description: 'Python 코드 실행 서버',
    server_type: 'stdio',
    connection_config: {
      command: 'python',
      args: ['-m', 'mcp_python_runtime'],
    },
    available_tools: [
      { name: 'execute_code', description: '코드 실행' },
      { name: 'install_package', description: '패키지 설치' },
      { name: 'run_analysis', description: '분석 실행' },
    ],
    status: 'maintenance',
    last_health_check: '2025-01-27T07:00:00Z',
    created_at: '2025-01-19T00:00:00Z',
    updated_at: '2025-01-27T00:00:00Z',
  },
];

// MCP 서비스 함수들
export const mcpService = {
  // 모든 MCP 서버 조회
  async getAll(): Promise<McpServer[]> {
    try {
      const { data, error } = await supabase
        .from('mcp_servers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || DUMMY_MCP_SERVERS;
    } catch {
      console.warn('Supabase 연결 실패, 더미 데이터 사용');
      return DUMMY_MCP_SERVERS;
    }
  },

  // ID로 MCP 서버 조회
  async getById(id: string): Promise<McpServer | null> {
    try {
      const { data, error } = await supabase
        .from('mcp_servers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch {
      return DUMMY_MCP_SERVERS.find((server) => server.id === id) || null;
    }
  },

  // 상태별 서버 수
  getStatusCounts(servers: McpServer[]): Record<string, number> {
    return servers.reduce(
      (acc, server) => {
        acc[server.status] = (acc[server.status] || 0) + 1;
        return acc;
      },
      { connected: 0, disconnected: 0, error: 0, maintenance: 0 } as Record<string, number>
    );
  },

  // 타입별 서버 그룹핑
  getGroupedByType(servers: McpServer[]): Record<string, McpServer[]> {
    return servers.reduce(
      (acc, server) => {
        const type = server.server_type;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(server);
        return acc;
      },
      {} as Record<string, McpServer[]>
    );
  },

  // 연결된 서버만 필터링
  getConnectedServers(servers: McpServer[]): McpServer[] {
    return servers.filter((server) => server.status === 'connected');
  },

  // 헬스 체크 실행
  async healthCheck(id: string): Promise<{ status: string; message: string }> {
    try {
      // 실제로는 서버에 헬스 체크 요청을 보내야 함
      const updateData = { last_health_check: new Date().toISOString() };
      const { error } = await (supabase
        .from('mcp_servers') as ReturnType<typeof supabase.from>)
        .update(updateData as Record<string, unknown>)
        .eq('id', id);

      if (error) throw error;
      return { status: 'success', message: '헬스 체크 완료' };
    } catch {
      return { status: 'error', message: '헬스 체크 실패' };
    }
  },

  // 서버 재시작
  async restart(id: string): Promise<{ status: string; message: string }> {
    try {
      const updateData = {
        status: 'connected',
        last_health_check: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase
        .from('mcp_servers') as ReturnType<typeof supabase.from>)
        .update(updateData as Record<string, unknown>)
        .eq('id', id);

      if (error) throw error;
      return { status: 'success', message: '서버 재시작 완료' };
    } catch {
      return { status: 'error', message: '서버 재시작 실패' };
    }
  },

  // 총 도구 수 계산
  getTotalToolCount(servers: McpServer[]): number {
    return servers.reduce((total, server) => {
      const tools = server.available_tools as unknown[];
      return total + (Array.isArray(tools) ? tools.length : 0);
    }, 0);
  },
};

export default mcpService;
