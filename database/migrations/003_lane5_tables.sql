-- LANE 5: 실제 연동 시스템 테이블
-- 실행: Supabase SQL Editor에서 실행

-- 1. agents 테이블 (기존 테이블이 있으면 확장)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  parent_agent_id UUID REFERENCES agents(id),
  is_main_agent BOOLEAN DEFAULT TRUE,
  capabilities JSONB DEFAULT '[]',
  mcp_tools JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'active',
  version VARCHAR(20) DEFAULT '1.0.0',

  -- 마크다운 원본 내용 (LANE 5 추가)
  instructions TEXT,
  workflow_refs JSONB DEFAULT '[]',
  ontology_refs JSONB DEFAULT '[]',

  -- 파일 동기화 메타데이터 (LANE 5 추가)
  file_path VARCHAR(255),
  file_hash VARCHAR(64),
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. workflows 테이블
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50),
  steps JSONB DEFAULT '[]',
  mermaid_diagram TEXT,
  file_path VARCHAR(255),
  file_hash VARCHAR(64),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. sync_logs 테이블
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL,
  files_processed INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_agents_code ON agents(agent_code);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
CREATE INDEX IF NOT EXISTS idx_workflows_code ON workflows(workflow_code);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);

-- 5. 더미 데이터 삽입
INSERT INTO agents (id, agent_code, name, description, category, is_main_agent, capabilities, mcp_tools, status, version, file_path, created_at, updated_at)
VALUES
  -- LANE 1: Core Operations
  ('a0000001-0000-0000-0000-000000000001', 'order', 'Order Agent', '주문 처리 및 관리를 담당하는 에이전트', 'operations', true, '["주문 조회", "주문 상태 변경", "배송 추적", "환불 처리"]', '["supabase", "slack", "coupang-api"]', 'active', '1.0.0', 'docs/agents/01-order/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000002', 'cs', 'CS Agent', '고객 문의 응대 및 CS 티켓 관리', 'customer', true, '["문의 분류", "자동 응답", "에스컬레이션", "감성 분석"]', '["supabase", "slack", "zendesk"]', 'active', '1.0.0', 'docs/agents/02-cs/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000003', 'marketing', 'Marketing Agent', '마케팅 캠페인 및 프로모션 관리', 'marketing', true, '["캠페인 생성", "성과 분석", "타겟팅", "A/B 테스트"]', '["supabase", "google-analytics", "meta-ads"]', 'active', '1.0.0', 'docs/agents/03-marketing/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000004', 'inventory', 'Inventory Agent', '재고 관리 및 발주 자동화', 'operations', true, '["재고 조회", "안전재고 알림", "자동 발주", "재고 예측"]', '["supabase", "erp-connector"]', 'active', '1.0.0', 'docs/agents/05-inventory/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000005', 'logistics', 'Logistics Agent', '물류 및 배송 최적화', 'operations', true, '["배송 추적", "물류 최적화", "창고 관리", "반품 처리"]', '["supabase", "cj-logistics", "hanjin"]', 'maintenance', '1.0.0', 'docs/agents/13-logistics/main.md', NOW(), NOW()),

  -- LANE 2: Specialized
  ('a0000001-0000-0000-0000-000000000006', 'detail_page', 'Detail Page Agent', '상품 상세페이지 자동 생성', 'product', true, '["상세페이지 생성", "이미지 편집", "SEO 최적화", "다국어 번역"]', '["supabase", "canva", "openai-dalle"]', 'active', '1.0.0', 'docs/agents/04-detail-page/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000007', 'media', 'Media Agent', '미디어 콘텐츠 생성 및 관리', 'marketing', true, '["이미지 생성", "동영상 편집", "SNS 콘텐츠", "썸네일 생성"]', '["supabase", "canva", "ffmpeg"]', 'active', '1.0.0', 'docs/agents/14-media/main.md', NOW(), NOW()),

  -- LANE 3: Management
  ('a0000001-0000-0000-0000-000000000008', 'accounting', 'Accounting Agent', '회계 및 재무 관리', 'operations', true, '["매출 정산", "세금계산서", "비용 분석", "재무 보고"]', '["supabase", "excel", "erp-connector"]', 'inactive', '0.9.0', 'docs/agents/06-accounting/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000009', 'legal', 'Legal Agent', '법률 검토 및 계약 관리', 'operations', true, '["계약서 검토", "법률 자문", "규정 준수", "분쟁 관리"]', '["supabase", "document-parser"]', 'inactive', '0.9.0', 'docs/agents/09-legal/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000010', 'ip', 'IP Agent', '지식재산권 관리', 'operations', true, '["상표 관리", "특허 모니터링", "저작권 관리", "침해 대응"]', '["supabase", "kipris"]', 'inactive', '0.9.0', 'docs/agents/10-ip/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000011', 'biz_support', 'Biz Support Agent', '사업 지원 및 행정 업무', 'operations', true, '["정부지원사업", "인증 관리", "서류 작성", "일정 관리"]', '["supabase", "calendar"]', 'active', '1.0.0', 'docs/agents/07-biz-support/main.md', NOW(), NOW()),

  -- LANE 4: Analytics
  ('a0000001-0000-0000-0000-000000000012', 'analytics', 'Analytics Agent', '데이터 분석 및 인사이트 도출', 'analytics', true, '["매출 분석", "고객 분석", "트렌드 분석", "예측 모델링"]', '["supabase", "google-analytics", "bigquery"]', 'active', '1.0.0', 'docs/agents/11-analytics/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000013', 'crisis', 'Crisis Agent', '위기 관리 및 대응', 'operations', true, '["위기 감지", "자동 대응", "커뮤니케이션", "복구 관리"]', '["supabase", "slack", "sentry"]', 'active', '1.0.0', 'docs/agents/12-crisis/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000014', 'loyalty', 'Loyalty Agent', '고객 로열티 프로그램 관리', 'customer', true, '["포인트 관리", "등급 관리", "혜택 설계", "리텐션 분석"]', '["supabase", "crm-connector"]', 'active', '1.0.0', 'docs/agents/16-loyalty/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000015', 'partnership', 'Partnership Agent', '제휴 및 파트너십 관리', 'operations', true, '["제휴 발굴", "계약 관리", "성과 추적", "협업 조율"]', '["supabase", "crm-connector"]', 'active', '1.0.0', 'docs/agents/15-partnership/main.md', NOW(), NOW()),
  ('a0000001-0000-0000-0000-000000000016', 'product', 'Product Agent', '상품 기획 및 소싱', 'product', true, '["시장 조사", "상품 기획", "소싱 관리", "가격 책정"]', '["supabase", "alibaba"]', 'active', '1.0.0', 'docs/agents/08-product/main.md', NOW(), NOW()),

  -- Supervisor (LANE 0)
  ('a0000001-0000-0000-0000-000000000000', 'supervisor', 'Supervisor Agent', '전체 에이전트 오케스트레이션 및 라우팅', 'system', true, '["요청 라우팅", "에이전트 조율", "모니터링", "에스컬레이션"]', '["supabase", "slack"]', 'active', '1.0.0', 'docs/agents/00-supervisor/main.md', NOW(), NOW())
ON CONFLICT (agent_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  mcp_tools = EXCLUDED.mcp_tools,
  file_path = EXCLUDED.file_path,
  updated_at = NOW();

-- 6. 워크플로우 더미 데이터
INSERT INTO workflows (id, workflow_code, name, description, trigger_type, file_path, created_at, updated_at)
VALUES
  ('w0000001-0000-0000-0000-000000000001', 'order-flow', '주문 처리 워크플로우', '신규 주문 접수부터 배송 완료까지', 'event', 'docs/topology/workflows/order-flow.md', NOW(), NOW()),
  ('w0000001-0000-0000-0000-000000000002', 'order-return-flow', '반품 처리 워크플로우', '반품 요청 접수부터 환불 완료까지', 'event', 'docs/topology/workflows/order-return-flow.md', NOW(), NOW()),
  ('w0000001-0000-0000-0000-000000000003', 'cs-inquiry-flow', 'CS 문의 처리 워크플로우', '고객 문의 접수부터 해결까지', 'event', 'docs/topology/workflows/cs-inquiry-flow.md', NOW(), NOW()),
  ('w0000001-0000-0000-0000-000000000004', 'inventory-sync-flow', '재고 동기화 워크플로우', '채널별 재고 동기화', 'schedule', 'docs/topology/workflows/inventory-sync-flow.md', NOW(), NOW()),
  ('w0000001-0000-0000-0000-000000000005', 'marketing-campaign-flow', '마케팅 캠페인 워크플로우', '캠페인 기획부터 성과 분석까지', 'manual', 'docs/topology/workflows/marketing-campaign-flow.md', NOW(), NOW())
ON CONFLICT (workflow_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 7. RLS (Row Level Security) 정책 (필요시)
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
