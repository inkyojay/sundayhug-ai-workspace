/**
 * LANE 5 컬럼 추가 및 데이터 삽입 스크립트
 *
 * 사용법: npx tsx scripts/add-lane5-columns.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .env 로드
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 더미 에이전트 데이터 (file_path 없이)
const DUMMY_AGENTS = [
  {
    agent_code: 'supervisor',
    name: 'Supervisor Agent',
    description: '전체 에이전트 오케스트레이션 및 라우팅',
    category: 'system',
    is_main_agent: true,
    capabilities: ['요청 라우팅', '에이전트 조율', '모니터링', '에스컬레이션'],
    mcp_tools: ['supabase', 'slack'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'order',
    name: 'Order Agent',
    description: '주문 처리 및 관리를 담당하는 에이전트',
    category: 'operations',
    is_main_agent: true,
    capabilities: ['주문 조회', '주문 상태 변경', '배송 추적', '환불 처리'],
    mcp_tools: ['supabase', 'slack', 'coupang-api'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'cs',
    name: 'CS Agent',
    description: '고객 문의 응대 및 CS 티켓 관리',
    category: 'customer',
    is_main_agent: true,
    capabilities: ['문의 분류', '자동 응답', '에스컬레이션', '감성 분석'],
    mcp_tools: ['supabase', 'slack', 'zendesk'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'marketing',
    name: 'Marketing Agent',
    description: '마케팅 캠페인 및 프로모션 관리',
    category: 'marketing',
    is_main_agent: true,
    capabilities: ['캠페인 생성', '성과 분석', '타겟팅', 'A/B 테스트'],
    mcp_tools: ['supabase', 'google-analytics', 'meta-ads'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'inventory',
    name: 'Inventory Agent',
    description: '재고 관리 및 발주 자동화',
    category: 'operations',
    is_main_agent: true,
    capabilities: ['재고 조회', '안전재고 알림', '자동 발주', '재고 예측'],
    mcp_tools: ['supabase', 'erp-connector'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'logistics',
    name: 'Logistics Agent',
    description: '물류 및 배송 최적화',
    category: 'operations',
    is_main_agent: true,
    capabilities: ['배송 추적', '물류 최적화', '창고 관리', '반품 처리'],
    mcp_tools: ['supabase', 'cj-logistics', 'hanjin'],
    status: 'maintenance',
    version: '1.0.0',
  },
  {
    agent_code: 'detail_page',
    name: 'Detail Page Agent',
    description: '상품 상세페이지 자동 생성',
    category: 'product',
    is_main_agent: true,
    capabilities: ['상세페이지 생성', '이미지 편집', 'SEO 최적화', '다국어 번역'],
    mcp_tools: ['supabase', 'canva', 'openai-dalle'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'media',
    name: 'Media Agent',
    description: '미디어 콘텐츠 생성 및 관리',
    category: 'marketing',
    is_main_agent: true,
    capabilities: ['이미지 생성', '동영상 편집', 'SNS 콘텐츠', '썸네일 생성'],
    mcp_tools: ['supabase', 'canva', 'ffmpeg'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'accounting',
    name: 'Accounting Agent',
    description: '회계 및 재무 관리',
    category: 'operations',
    is_main_agent: true,
    capabilities: ['매출 정산', '세금계산서', '비용 분석', '재무 보고'],
    mcp_tools: ['supabase', 'excel', 'erp-connector'],
    status: 'inactive',
    version: '0.9.0',
  },
  {
    agent_code: 'legal',
    name: 'Legal Agent',
    description: '법률 검토 및 계약 관리',
    category: 'operations',
    is_main_agent: true,
    capabilities: ['계약서 검토', '법률 자문', '규정 준수', '분쟁 관리'],
    mcp_tools: ['supabase', 'document-parser'],
    status: 'inactive',
    version: '0.9.0',
  },
  {
    agent_code: 'analytics',
    name: 'Analytics Agent',
    description: '데이터 분석 및 인사이트 도출',
    category: 'analytics',
    is_main_agent: true,
    capabilities: ['매출 분석', '고객 분석', '트렌드 분석', '예측 모델링'],
    mcp_tools: ['supabase', 'google-analytics', 'bigquery'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'crisis',
    name: 'Crisis Agent',
    description: '위기 관리 및 대응',
    category: 'operations',
    is_main_agent: true,
    capabilities: ['위기 감지', '자동 대응', '커뮤니케이션', '복구 관리'],
    mcp_tools: ['supabase', 'slack', 'sentry'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'loyalty',
    name: 'Loyalty Agent',
    description: '고객 로열티 프로그램 관리',
    category: 'customer',
    is_main_agent: true,
    capabilities: ['포인트 관리', '등급 관리', '혜택 설계', '리텐션 분석'],
    mcp_tools: ['supabase', 'crm-connector'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'partnership',
    name: 'Partnership Agent',
    description: '제휴 및 파트너십 관리',
    category: 'operations',
    is_main_agent: true,
    capabilities: ['제휴 발굴', '계약 관리', '성과 추적', '협업 조율'],
    mcp_tools: ['supabase', 'crm-connector'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'product',
    name: 'Product Agent',
    description: '상품 기획 및 소싱',
    category: 'product',
    is_main_agent: true,
    capabilities: ['시장 조사', '상품 기획', '소싱 관리', '가격 책정'],
    mcp_tools: ['supabase', 'alibaba'],
    status: 'active',
    version: '1.0.0',
  },
  {
    agent_code: 'biz_support',
    name: 'Biz Support Agent',
    description: '사업 지원 및 행정 업무',
    category: 'operations',
    is_main_agent: true,
    capabilities: ['정부지원사업', '인증 관리', '서류 작성', '일정 관리'],
    mcp_tools: ['supabase', 'calendar'],
    status: 'active',
    version: '1.0.0',
  },
];

// 더미 워크플로우 데이터
const DUMMY_WORKFLOWS = [
  {
    workflow_code: 'order-flow',
    name: '주문 처리 워크플로우',
    description: '신규 주문 접수부터 배송 완료까지',
    trigger_type: 'event',
  },
  {
    workflow_code: 'order-return-flow',
    name: '반품 처리 워크플로우',
    description: '반품 요청 접수부터 환불 완료까지',
    trigger_type: 'event',
  },
  {
    workflow_code: 'cs-inquiry-flow',
    name: 'CS 문의 처리 워크플로우',
    description: '고객 문의 접수부터 해결까지',
    trigger_type: 'event',
  },
  {
    workflow_code: 'inventory-sync-flow',
    name: '재고 동기화 워크플로우',
    description: '채널별 재고 동기화',
    trigger_type: 'schedule',
  },
  {
    workflow_code: 'marketing-campaign-flow',
    name: '마케팅 캠페인 워크플로우',
    description: '캠페인 기획부터 성과 분석까지',
    trigger_type: 'manual',
  },
];

async function main() {
  console.log('🚀 LANE 5 데이터 삽입 시작...\n');

  // 1. 에이전트 삽입
  console.log('📥 에이전트 데이터 삽입 중...');
  for (const agent of DUMMY_AGENTS) {
    const { error } = await supabase
      .from('agents')
      .upsert(agent, { onConflict: 'agent_code' });

    if (error) {
      console.log(`   ❌ ${agent.name}: ${error.message}`);
    } else {
      console.log(`   ✅ ${agent.name}`);
    }
  }

  // 2. 에이전트 개수 확인
  const { count: agentCount } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true });
  console.log(`\n📊 현재 에이전트 수: ${agentCount}개\n`);

  // 3. 워크플로우 테이블 확인 및 삽입
  console.log('📥 워크플로우 데이터 삽입 중...');
  for (const workflow of DUMMY_WORKFLOWS) {
    const { error } = await supabase
      .from('workflows')
      .upsert(workflow, { onConflict: 'workflow_code' });

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`   ⚠️  workflows 테이블이 없습니다. Supabase에서 생성 필요.`);
        break;
      }
      console.log(`   ❌ ${workflow.name}: ${error.message}`);
    } else {
      console.log(`   ✅ ${workflow.name}`);
    }
  }

  // 4. sync_logs 테이블 확인
  const { error: syncError } = await supabase
    .from('sync_logs')
    .select('id')
    .limit(1);

  if (syncError) {
    console.log('\n⚠️  sync_logs 테이블이 없습니다.');
  } else {
    // 동기화 로그 기록
    await supabase.from('sync_logs').insert({
      sync_type: 'initial_setup',
      files_processed: DUMMY_AGENTS.length,
      files_changed: DUMMY_AGENTS.length,
      status: 'success',
      completed_at: new Date().toISOString(),
    });
    console.log('\n✅ sync_logs에 초기 설정 기록 완료');
  }

  console.log('\n🎉 LANE 5 데이터 삽입 완료!');
  console.log('\n다음 단계:');
  console.log('1. npm run dev로 대시보드 실행');
  console.log('2. /agents 페이지에서 에이전트 목록 확인');
  console.log('3. 에이전트 클릭하여 상세 페이지 확인');
}

main().catch(console.error);
