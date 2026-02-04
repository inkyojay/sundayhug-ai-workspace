-- ============================================================================
-- 썬데이허그 AI 에이전트 시스템 - Supabase 데이터베이스 스키마
-- ============================================================================
-- 버전: 1.0.0
-- 생성일: 2026-01-26
-- 설명: 17개 메인 에이전트 + 53개 서브 에이전트를 위한 통합 데이터베이스 스키마
-- ============================================================================

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM 타입 정의
-- ============================================================================

-- 에이전트 상태
CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'maintenance', 'error');

-- 에이전트 카테고리
CREATE TYPE agent_category AS ENUM (
    'marketing',      -- 마케팅
    'product',        -- 상품관리
    'customer',       -- 고객관리
    'operations',     -- 운영관리
    'analytics',      -- 데이터분석
    'system'          -- 시스템
);

-- 태스크 상태
CREATE TYPE task_status AS ENUM (
    'pending',        -- 대기중
    'running',        -- 실행중
    'completed',      -- 완료
    'failed',         -- 실패
    'cancelled',      -- 취소됨
    'paused'          -- 일시중지
);

-- 태스크 우선순위
CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');

-- 승인 상태
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- 채널 타입
CREATE TYPE channel_type AS ENUM ('coupang', 'naver', 'cafe24', 'own_mall', 'offline');

-- 주문 상태
CREATE TYPE order_status AS ENUM (
    'pending',           -- 결제대기
    'paid',              -- 결제완료
    'preparing',         -- 상품준비중
    'shipping',          -- 배송중
    'delivered',         -- 배송완료
    'cancelled',         -- 취소
    'refund_requested',  -- 환불요청
    'refunded',          -- 환불완료
    'exchange_requested',-- 교환요청
    'exchanged'          -- 교환완료
);

-- CS 티켓 상태
CREATE TYPE ticket_status AS ENUM (
    'open',              -- 접수됨
    'in_progress',       -- 처리중
    'waiting_customer',  -- 고객응답대기
    'resolved',          -- 해결됨
    'closed',            -- 종료
    'escalated'          -- 에스컬레이션
);

-- CS 티켓 유형
CREATE TYPE ticket_type AS ENUM (
    'inquiry',           -- 문의
    'complaint',         -- 불만
    'exchange',          -- 교환
    'refund',            -- 환불
    'shipping',          -- 배송
    'product_issue',     -- 상품문제
    'other'              -- 기타
);

-- 리뷰 감성
CREATE TYPE review_sentiment AS ENUM ('positive', 'neutral', 'negative');

-- 캠페인 상태
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled');

-- 인플루언서 등급
CREATE TYPE influencer_tier AS ENUM ('nano', 'micro', 'mid', 'macro', 'mega');

-- 프로모션 유형
CREATE TYPE promotion_type AS ENUM ('discount', 'coupon', 'bundle', 'gift', 'free_shipping', 'point');

-- 발주 상태
CREATE TYPE purchase_order_status AS ENUM ('draft', 'pending', 'confirmed', 'shipped', 'received', 'cancelled');

-- 인증 상태
CREATE TYPE certification_status AS ENUM ('valid', 'expired', 'pending_renewal', 'revoked');

-- 계약 상태
CREATE TYPE contract_status AS ENUM ('draft', 'pending_signature', 'active', 'expired', 'terminated');

-- 알림 유형
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success', 'action_required');

-- 스케줄 작업 상태
CREATE TYPE job_status AS ENUM ('scheduled', 'running', 'completed', 'failed', 'disabled');

-- ============================================================================
-- 1. 공통 테이블 (Common Tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- system_config: 시스템 설정
-- 시스템 전반의 설정값을 키-값 형태로 저장
-- ---------------------------------------------------------------------------
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_sensitive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE system_config IS '시스템 설정 - 시스템 전반의 설정값을 키-값 형태로 저장';
COMMENT ON COLUMN system_config.config_key IS '설정 키 (고유)';
COMMENT ON COLUMN system_config.config_value IS '설정 값 (JSON 형태)';
COMMENT ON COLUMN system_config.is_sensitive IS '민감 정보 여부 (API 키 등)';

CREATE INDEX idx_system_config_key ON system_config(config_key);
CREATE INDEX idx_system_config_category ON system_config(category);

-- ---------------------------------------------------------------------------
-- agents: 에이전트 정의
-- 17개 메인 에이전트 + 53개 서브 에이전트 정의
-- ---------------------------------------------------------------------------
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category agent_category NOT NULL,
    parent_agent_id UUID REFERENCES agents(id),
    is_main_agent BOOLEAN DEFAULT FALSE,
    status agent_status DEFAULT 'active',
    version VARCHAR(20) DEFAULT '1.0.0',
    capabilities JSONB DEFAULT '[]'::jsonb,
    config JSONB DEFAULT '{}'::jsonb,
    mcp_tools JSONB DEFAULT '[]'::jsonb,
    max_concurrent_tasks INTEGER DEFAULT 5,
    timeout_seconds INTEGER DEFAULT 300,
    retry_count INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE agents IS '에이전트 정의 - 17개 메인 에이전트 + 53개 서브 에이전트';
COMMENT ON COLUMN agents.agent_code IS '에이전트 고유 코드 (예: MARKETING_MAIN, CS_TICKET)';
COMMENT ON COLUMN agents.parent_agent_id IS '상위 에이전트 ID (서브 에이전트인 경우)';
COMMENT ON COLUMN agents.is_main_agent IS '메인 에이전트 여부';
COMMENT ON COLUMN agents.capabilities IS '에이전트 기능 목록';
COMMENT ON COLUMN agents.mcp_tools IS '사용 가능한 MCP 도구 목록';

CREATE INDEX idx_agents_code ON agents(agent_code);
CREATE INDEX idx_agents_category ON agents(category);
CREATE INDEX idx_agents_parent ON agents(parent_agent_id);
CREATE INDEX idx_agents_status ON agents(status);

-- ---------------------------------------------------------------------------
-- workflows: 워크플로우 정의
-- 에이전트 간 작업 흐름 정의
-- ---------------------------------------------------------------------------
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_config JSONB DEFAULT '{}'::jsonb,
    steps JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE workflows IS '워크플로우 정의 - 에이전트 간 작업 흐름';
COMMENT ON COLUMN workflows.trigger_type IS '트리거 유형 (event, schedule, manual, api)';
COMMENT ON COLUMN workflows.steps IS '워크플로우 단계 정의 (JSON)';

CREATE INDEX idx_workflows_code ON workflows(workflow_code);
CREATE INDEX idx_workflows_active ON workflows(is_active);
CREATE INDEX idx_workflows_trigger ON workflows(trigger_type);

-- ---------------------------------------------------------------------------
-- task_queue: 태스크 큐
-- 에이전트가 처리할 태스크 대기열
-- ---------------------------------------------------------------------------
CREATE TABLE task_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_code VARCHAR(100) NOT NULL,
    agent_id UUID NOT NULL REFERENCES agents(id),
    workflow_id UUID REFERENCES workflows(id),
    parent_task_id UUID REFERENCES task_queue(id),
    priority task_priority DEFAULT 'medium',
    status task_status DEFAULT 'pending',
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE task_queue IS '태스크 큐 - 에이전트가 처리할 태스크 대기열';
COMMENT ON COLUMN task_queue.parent_task_id IS '상위 태스크 ID (서브태스크인 경우)';
COMMENT ON COLUMN task_queue.input_data IS '태스크 입력 데이터';
COMMENT ON COLUMN task_queue.output_data IS '태스크 출력 결과';

CREATE INDEX idx_task_queue_agent ON task_queue(agent_id);
CREATE INDEX idx_task_queue_status ON task_queue(status);
CREATE INDEX idx_task_queue_priority ON task_queue(priority);
CREATE INDEX idx_task_queue_scheduled ON task_queue(scheduled_at);
CREATE INDEX idx_task_queue_created ON task_queue(created_at DESC);
CREATE INDEX idx_task_queue_pending ON task_queue(status, priority, scheduled_at) WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- audit_logs: 감사 로그
-- 시스템 전체 감사 기록
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    agent_id UUID REFERENCES agents(id),
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS '감사 로그 - 시스템 전체 감사 기록';
COMMENT ON COLUMN audit_logs.event_type IS '이벤트 유형 (예: order.created, product.updated)';
COMMENT ON COLUMN audit_logs.action IS '수행 작업 (create, update, delete, execute)';

CREATE INDEX idx_audit_logs_event ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_agent ON audit_logs(agent_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);

-- ---------------------------------------------------------------------------
-- approval_requests: 승인 요청
-- 에이전트 작업 중 사람의 승인이 필요한 요청
-- ---------------------------------------------------------------------------
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_code VARCHAR(100) NOT NULL UNIQUE,
    task_id UUID REFERENCES task_queue(id),
    agent_id UUID NOT NULL REFERENCES agents(id),
    approval_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    request_data JSONB NOT NULL,
    status approval_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    requested_by UUID,
    approved_by UUID,
    approval_note TEXT,
    expires_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE approval_requests IS '승인 요청 - 사람의 승인이 필요한 에이전트 작업 요청';
COMMENT ON COLUMN approval_requests.approval_type IS '승인 유형 (price_change, refund, large_order 등)';
COMMENT ON COLUMN approval_requests.request_data IS '승인 요청 상세 데이터';

CREATE INDEX idx_approval_status ON approval_requests(status);
CREATE INDEX idx_approval_agent ON approval_requests(agent_id);
CREATE INDEX idx_approval_expires ON approval_requests(expires_at) WHERE status = 'pending';
CREATE INDEX idx_approval_created ON approval_requests(created_at DESC);

-- ============================================================================
-- 2. 비즈니스 테이블 (Business Tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- customers: 고객
-- 쿠팡/네이버/Cafe24 통합 고객 정보
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(20),
    name VARCHAR(100),
    nickname VARCHAR(100),
    gender VARCHAR(10),
    birth_date DATE,

    -- 채널별 ID 매핑
    coupang_customer_id VARCHAR(100),
    naver_customer_id VARCHAR(100),
    cafe24_customer_id VARCHAR(100),

    -- 고객 등급 및 통계
    tier VARCHAR(20) DEFAULT 'normal',
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    average_order_value DECIMAL(15,2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,

    -- 마케팅 동의
    marketing_email_agreed BOOLEAN DEFAULT FALSE,
    marketing_sms_agreed BOOLEAN DEFAULT FALSE,
    marketing_push_agreed BOOLEAN DEFAULT FALSE,

    -- 주소 정보
    default_address JSONB,
    addresses JSONB DEFAULT '[]'::jsonb,

    -- 메타데이터
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE customers IS '고객 - 쿠팡/네이버/Cafe24 통합 고객 정보';
COMMENT ON COLUMN customers.customer_code IS '내부 고객 코드';
COMMENT ON COLUMN customers.tier IS '고객 등급 (vvip, vip, gold, silver, normal)';
COMMENT ON COLUMN customers.tags IS '고객 태그 (예: ["신규", "충성고객"])';

CREATE UNIQUE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_customers_coupang ON customers(coupang_customer_id) WHERE coupang_customer_id IS NOT NULL;
CREATE UNIQUE INDEX idx_customers_naver ON customers(naver_customer_id) WHERE naver_customer_id IS NOT NULL;
CREATE UNIQUE INDEX idx_customers_cafe24 ON customers(cafe24_customer_id) WHERE cafe24_customer_id IS NOT NULL;
CREATE INDEX idx_customers_tier ON customers(tier);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_created ON customers(created_at DESC);

-- ---------------------------------------------------------------------------
-- products: 제품
-- 마스터 제품 정보
-- ---------------------------------------------------------------------------
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(50) NOT NULL UNIQUE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    barcode VARCHAR(50),

    name VARCHAR(500) NOT NULL,
    short_name VARCHAR(200),
    description TEXT,

    -- 카테고리
    category_1 VARCHAR(100),
    category_2 VARCHAR(100),
    category_3 VARCHAR(100),

    -- 가격 정보
    cost_price DECIMAL(15,2),
    base_price DECIMAL(15,2) NOT NULL,
    sale_price DECIMAL(15,2),

    -- 제품 속성
    brand VARCHAR(100),
    manufacturer VARCHAR(200),
    origin_country VARCHAR(100),
    weight_g INTEGER,

    -- 이미지
    main_image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,

    -- 옵션
    has_options BOOLEAN DEFAULT FALSE,
    options JSONB DEFAULT '[]'::jsonb,

    -- SEO
    seo_title VARCHAR(200),
    seo_description TEXT,
    keywords JSONB DEFAULT '[]'::jsonb,

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    is_soldout BOOLEAN DEFAULT FALSE,

    -- 인증 정보
    certifications JSONB DEFAULT '[]'::jsonb,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE products IS '제품 - 마스터 제품 정보';
COMMENT ON COLUMN products.sku IS '재고관리코드 (Stock Keeping Unit)';
COMMENT ON COLUMN products.options IS '옵션 정보 (색상, 사이즈 등)';
COMMENT ON COLUMN products.certifications IS '인증 정보 (HACCP, FDA 등)';

CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_1, category_2, category_3);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('simple', name));

-- ---------------------------------------------------------------------------
-- channel_products: 채널별 상품 매핑
-- 각 판매 채널별 상품 정보 및 매핑
-- ---------------------------------------------------------------------------
CREATE TABLE channel_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    channel channel_type NOT NULL,

    -- 채널별 상품 ID
    channel_product_id VARCHAR(100) NOT NULL,
    channel_product_url TEXT,

    -- 채널별 가격
    channel_price DECIMAL(15,2) NOT NULL,
    channel_sale_price DECIMAL(15,2),
    commission_rate DECIMAL(5,2),

    -- 채널별 상품명/설명
    channel_product_name VARCHAR(500),
    channel_description TEXT,

    -- 채널별 카테고리
    channel_category_id VARCHAR(100),
    channel_category_name VARCHAR(200),

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    sync_status VARCHAR(20) DEFAULT 'synced',
    last_synced_at TIMESTAMPTZ,

    -- 채널별 메타데이터
    channel_metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(product_id, channel)
);

COMMENT ON TABLE channel_products IS '채널별 상품 매핑 - 각 판매 채널별 상품 정보';
COMMENT ON COLUMN channel_products.channel_product_id IS '채널 내 상품 ID';
COMMENT ON COLUMN channel_products.commission_rate IS '채널 수수료율 (%)';
COMMENT ON COLUMN channel_products.sync_status IS '동기화 상태 (synced, pending, error)';

CREATE INDEX idx_channel_products_product ON channel_products(product_id);
CREATE INDEX idx_channel_products_channel ON channel_products(channel);
CREATE INDEX idx_channel_products_channel_id ON channel_products(channel, channel_product_id);
CREATE INDEX idx_channel_products_sync ON channel_products(sync_status);

-- ---------------------------------------------------------------------------
-- inventory: 재고
-- 제품 재고 관리
-- ---------------------------------------------------------------------------
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    option_code VARCHAR(100),

    -- 재고 수량
    total_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,

    -- 재고 위치
    warehouse_code VARCHAR(50) DEFAULT 'main',
    location_code VARCHAR(100),

    -- 재고 설정
    safety_stock INTEGER DEFAULT 10,
    reorder_point INTEGER DEFAULT 20,
    reorder_quantity INTEGER DEFAULT 100,

    -- 입출고 정보
    last_inbound_at TIMESTAMPTZ,
    last_outbound_at TIMESTAMPTZ,

    -- 상태
    is_tracking BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(product_id, option_code, warehouse_code)
);

COMMENT ON TABLE inventory IS '재고 - 제품 재고 관리';
COMMENT ON COLUMN inventory.reserved_quantity IS '예약된 수량 (주문 처리 중)';
COMMENT ON COLUMN inventory.safety_stock IS '안전 재고 수량';
COMMENT ON COLUMN inventory.reorder_point IS '재주문 시점 수량';

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_code);
CREATE INDEX idx_inventory_low_stock ON inventory(available_quantity) WHERE available_quantity <= 20;

-- ---------------------------------------------------------------------------
-- orders: 주문
-- 통합 주문 정보
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),

    -- 채널 정보
    channel channel_type NOT NULL,
    channel_order_id VARCHAR(100) NOT NULL,

    -- 주문 상태
    status order_status DEFAULT 'pending',

    -- 금액 정보
    subtotal DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    shipping_fee DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,

    -- 결제 정보
    payment_method VARCHAR(50),
    payment_status VARCHAR(20),
    paid_at TIMESTAMPTZ,

    -- 배송 정보
    shipping_name VARCHAR(100),
    shipping_phone VARCHAR(20),
    shipping_address JSONB,
    shipping_message TEXT,
    shipping_company VARCHAR(100),
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    -- 쿠폰/포인트
    coupon_code VARCHAR(50),
    coupon_discount DECIMAL(15,2) DEFAULT 0,
    points_used INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,

    -- 메모
    admin_note TEXT,
    customer_note TEXT,

    -- 타임스탬프
    ordered_at TIMESTAMPTZ NOT NULL,
    cancelled_at TIMESTAMPTZ,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE orders IS '주문 - 통합 주문 정보';
COMMENT ON COLUMN orders.order_code IS '내부 주문번호';
COMMENT ON COLUMN orders.channel_order_id IS '채널 주문번호';

CREATE UNIQUE INDEX idx_orders_channel_order ON orders(channel, channel_order_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_channel ON orders(channel);
CREATE INDEX idx_orders_ordered ON orders(ordered_at DESC);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ---------------------------------------------------------------------------
-- order_items: 주문 상품
-- 주문 내 개별 상품 정보
-- ---------------------------------------------------------------------------
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),

    -- 상품 정보 (주문 시점 스냅샷)
    product_code VARCHAR(50),
    sku VARCHAR(100),
    product_name VARCHAR(500) NOT NULL,
    option_name VARCHAR(200),

    -- 수량 및 가격
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_price DECIMAL(15,2) NOT NULL,

    -- 상태
    status order_status DEFAULT 'pending',

    -- 배송 정보 (개별 배송인 경우)
    shipping_company VARCHAR(100),
    tracking_number VARCHAR(100),

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE order_items IS '주문 상품 - 주문 내 개별 상품 정보';
COMMENT ON COLUMN order_items.product_name IS '주문 시점의 상품명 (스냅샷)';

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_sku ON order_items(sku);

-- ---------------------------------------------------------------------------
-- settlements: 정산
-- 채널별 정산 내역
-- ---------------------------------------------------------------------------
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_code VARCHAR(50) NOT NULL UNIQUE,

    -- 기간
    channel channel_type NOT NULL,
    settlement_period_start DATE NOT NULL,
    settlement_period_end DATE NOT NULL,

    -- 금액 정보
    gross_sales DECIMAL(15,2) NOT NULL,
    returns_amount DECIMAL(15,2) DEFAULT 0,
    net_sales DECIMAL(15,2) NOT NULL,
    commission_amount DECIMAL(15,2) DEFAULT 0,
    shipping_fee_amount DECIMAL(15,2) DEFAULT 0,
    promotion_cost DECIMAL(15,2) DEFAULT 0,
    other_fees DECIMAL(15,2) DEFAULT 0,
    settlement_amount DECIMAL(15,2) NOT NULL,

    -- 상태
    status VARCHAR(20) DEFAULT 'pending',
    settled_at TIMESTAMPTZ,

    -- 상세 내역
    order_count INTEGER DEFAULT 0,
    return_count INTEGER DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE settlements IS '정산 - 채널별 정산 내역';
COMMENT ON COLUMN settlements.commission_amount IS '채널 수수료';
COMMENT ON COLUMN settlements.settlement_amount IS '최종 정산 금액';

CREATE INDEX idx_settlements_channel ON settlements(channel);
CREATE INDEX idx_settlements_period ON settlements(settlement_period_start, settlement_period_end);
CREATE INDEX idx_settlements_status ON settlements(status);

-- ============================================================================
-- 3. CS 테이블 (Customer Service Tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- cs_tickets: CS 티켓
-- 고객 문의/클레임 티켓
-- ---------------------------------------------------------------------------
CREATE TABLE cs_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code VARCHAR(50) NOT NULL UNIQUE,

    -- 연관 정보
    customer_id UUID REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),

    -- 채널 정보
    channel channel_type,
    channel_ticket_id VARCHAR(100),

    -- 티켓 정보
    ticket_type ticket_type NOT NULL,
    status ticket_status DEFAULT 'open',
    priority task_priority DEFAULT 'medium',

    -- 내용
    subject VARCHAR(500) NOT NULL,
    description TEXT,

    -- 담당
    assigned_agent_id UUID REFERENCES agents(id),
    assigned_user_id UUID,

    -- AI 분석
    ai_category VARCHAR(100),
    ai_sentiment review_sentiment,
    ai_suggested_response TEXT,
    ai_confidence_score DECIMAL(5,4),

    -- 해결 정보
    resolution TEXT,
    resolved_at TIMESTAMPTZ,

    -- SLA
    first_response_at TIMESTAMPTZ,
    first_response_due_at TIMESTAMPTZ,
    resolution_due_at TIMESTAMPTZ,

    -- 태그
    tags JSONB DEFAULT '[]'::jsonb,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE cs_tickets IS 'CS 티켓 - 고객 문의/클레임 티켓';
COMMENT ON COLUMN cs_tickets.ai_suggested_response IS 'AI가 제안한 응답';
COMMENT ON COLUMN cs_tickets.ai_confidence_score IS 'AI 분석 신뢰도 (0-1)';

CREATE INDEX idx_cs_tickets_customer ON cs_tickets(customer_id);
CREATE INDEX idx_cs_tickets_order ON cs_tickets(order_id);
CREATE INDEX idx_cs_tickets_status ON cs_tickets(status);
CREATE INDEX idx_cs_tickets_type ON cs_tickets(ticket_type);
CREATE INDEX idx_cs_tickets_priority ON cs_tickets(priority);
CREATE INDEX idx_cs_tickets_assigned ON cs_tickets(assigned_agent_id);
CREATE INDEX idx_cs_tickets_created ON cs_tickets(created_at DESC);
CREATE INDEX idx_cs_tickets_open ON cs_tickets(status, priority, created_at) WHERE status IN ('open', 'in_progress');

-- ---------------------------------------------------------------------------
-- cs_conversations: CS 대화 내역
-- 티켓 내 대화 기록
-- ---------------------------------------------------------------------------
CREATE TABLE cs_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES cs_tickets(id) ON DELETE CASCADE,

    -- 발신자 정보
    sender_type VARCHAR(20) NOT NULL,
    sender_id UUID,
    sender_name VARCHAR(100),

    -- 메시지
    message_type VARCHAR(20) DEFAULT 'text',
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,

    -- AI 관련
    is_ai_generated BOOLEAN DEFAULT FALSE,
    ai_agent_id UUID REFERENCES agents(id),

    -- 상태
    is_internal BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE cs_conversations IS 'CS 대화 내역 - 티켓 내 대화 기록';
COMMENT ON COLUMN cs_conversations.sender_type IS '발신자 유형 (customer, agent, system)';
COMMENT ON COLUMN cs_conversations.is_internal IS '내부 메모 여부';

CREATE INDEX idx_cs_conversations_ticket ON cs_conversations(ticket_id);
CREATE INDEX idx_cs_conversations_created ON cs_conversations(created_at);

-- ---------------------------------------------------------------------------
-- reviews: 리뷰
-- 상품 리뷰 및 분석
-- ---------------------------------------------------------------------------
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 연관 정보
    product_id UUID REFERENCES products(id),
    customer_id UUID REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    order_item_id UUID REFERENCES order_items(id),

    -- 채널 정보
    channel channel_type NOT NULL,
    channel_review_id VARCHAR(100),

    -- 리뷰 내용
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(500),
    content TEXT,

    -- 이미지/동영상
    images JSONB DEFAULT '[]'::jsonb,
    videos JSONB DEFAULT '[]'::jsonb,

    -- AI 분석
    ai_sentiment review_sentiment,
    ai_keywords JSONB DEFAULT '[]'::jsonb,
    ai_summary TEXT,
    ai_issues JSONB DEFAULT '[]'::jsonb,

    -- 응답
    reply_content TEXT,
    reply_by UUID,
    replied_at TIMESTAMPTZ,

    -- 상태
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,

    -- 유용성
    helpful_count INTEGER DEFAULT 0,

    reviewed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reviews IS '리뷰 - 상품 리뷰 및 분석';
COMMENT ON COLUMN reviews.ai_sentiment IS 'AI 감성 분석 결과';
COMMENT ON COLUMN reviews.ai_keywords IS 'AI 추출 키워드';
COMMENT ON COLUMN reviews.ai_issues IS 'AI가 감지한 이슈 목록';

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_customer ON reviews(customer_id);
CREATE INDEX idx_reviews_channel ON reviews(channel);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_sentiment ON reviews(ai_sentiment);
CREATE INDEX idx_reviews_reviewed ON reviews(reviewed_at DESC);

-- ============================================================================
-- 4. 마케팅 테이블 (Marketing Tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- marketing_campaigns: 마케팅 캠페인
-- 마케팅 캠페인 정의 및 관리
-- ---------------------------------------------------------------------------
CREATE TABLE marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_code VARCHAR(50) NOT NULL UNIQUE,

    -- 기본 정보
    name VARCHAR(500) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) NOT NULL,

    -- 채널
    channels JSONB DEFAULT '[]'::jsonb,

    -- 일정
    status campaign_status DEFAULT 'draft',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,

    -- 예산
    budget DECIMAL(15,2),
    spent_amount DECIMAL(15,2) DEFAULT 0,

    -- 타겟팅
    target_audience JSONB DEFAULT '{}'::jsonb,
    target_products JSONB DEFAULT '[]'::jsonb,

    -- 콘텐츠
    content JSONB DEFAULT '{}'::jsonb,
    creative_assets JSONB DEFAULT '[]'::jsonb,

    -- 목표
    goals JSONB DEFAULT '{}'::jsonb,

    -- AI 생성
    is_ai_generated BOOLEAN DEFAULT FALSE,
    ai_agent_id UUID REFERENCES agents(id),

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketing_campaigns IS '마케팅 캠페인 - 마케팅 캠페인 정의 및 관리';
COMMENT ON COLUMN marketing_campaigns.campaign_type IS '캠페인 유형 (sns, email, push, ads, influencer)';
COMMENT ON COLUMN marketing_campaigns.target_audience IS '타겟 고객 조건';
COMMENT ON COLUMN marketing_campaigns.goals IS '캠페인 목표 (ROAS, 전환율 등)';

CREATE INDEX idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_campaigns_type ON marketing_campaigns(campaign_type);
CREATE INDEX idx_campaigns_dates ON marketing_campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_created ON marketing_campaigns(created_at DESC);

-- ---------------------------------------------------------------------------
-- marketing_metrics: 마케팅 성과
-- 캠페인별 성과 지표
-- ---------------------------------------------------------------------------
CREATE TABLE marketing_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,

    -- 기간
    metric_date DATE NOT NULL,
    channel channel_type,

    -- 노출/클릭
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr DECIMAL(8,4) DEFAULT 0,

    -- 전환
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(8,4) DEFAULT 0,
    conversion_value DECIMAL(15,2) DEFAULT 0,

    -- 비용
    cost DECIMAL(15,2) DEFAULT 0,
    cpc DECIMAL(10,2) DEFAULT 0,
    cpm DECIMAL(10,2) DEFAULT 0,
    cpa DECIMAL(10,2) DEFAULT 0,
    roas DECIMAL(10,4) DEFAULT 0,

    -- 참여
    engagements INTEGER DEFAULT 0,
    engagement_rate DECIMAL(8,4) DEFAULT 0,

    -- 상세 지표
    details JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(campaign_id, metric_date, channel)
);

COMMENT ON TABLE marketing_metrics IS '마케팅 성과 - 캠페인별 성과 지표';
COMMENT ON COLUMN marketing_metrics.ctr IS '클릭률 (Click Through Rate)';
COMMENT ON COLUMN marketing_metrics.roas IS '광고 지출 대비 수익률 (Return On Ad Spend)';

CREATE INDEX idx_metrics_campaign ON marketing_metrics(campaign_id);
CREATE INDEX idx_metrics_date ON marketing_metrics(metric_date);
CREATE INDEX idx_metrics_channel ON marketing_metrics(channel);

-- ---------------------------------------------------------------------------
-- influencers: 인플루언서
-- 인플루언서 정보 및 관리
-- ---------------------------------------------------------------------------
CREATE TABLE influencers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_code VARCHAR(50) NOT NULL UNIQUE,

    -- 기본 정보
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),

    -- 소셜 계정
    instagram_handle VARCHAR(100),
    youtube_channel VARCHAR(200),
    tiktok_handle VARCHAR(100),
    blog_url TEXT,

    -- 팔로워/구독자
    instagram_followers INTEGER DEFAULT 0,
    youtube_subscribers INTEGER DEFAULT 0,
    tiktok_followers INTEGER DEFAULT 0,
    blog_visitors INTEGER DEFAULT 0,

    -- 등급 및 카테고리
    tier influencer_tier DEFAULT 'micro',
    categories JSONB DEFAULT '[]'::jsonb,

    -- 성과 지표
    avg_engagement_rate DECIMAL(8,4) DEFAULT 0,
    total_collaborations INTEGER DEFAULT 0,
    avg_conversion_rate DECIMAL(8,4) DEFAULT 0,

    -- 계약 정보
    base_rate DECIMAL(15,2),
    commission_rate DECIMAL(5,2),

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,

    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE influencers IS '인플루언서 - 인플루언서 정보 및 관리';
COMMENT ON COLUMN influencers.tier IS '인플루언서 등급 (nano < 10k, micro < 100k, mid < 500k, macro < 1M, mega > 1M)';

CREATE INDEX idx_influencers_tier ON influencers(tier);
CREATE INDEX idx_influencers_instagram ON influencers(instagram_handle);
CREATE INDEX idx_influencers_active ON influencers(is_active);

-- ---------------------------------------------------------------------------
-- promotions: 프로모션
-- 프로모션/할인 이벤트 관리
-- ---------------------------------------------------------------------------
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_code VARCHAR(50) NOT NULL UNIQUE,

    -- 기본 정보
    name VARCHAR(500) NOT NULL,
    description TEXT,
    promotion_type promotion_type NOT NULL,

    -- 일정
    is_active BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,

    -- 할인 설정
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(15,2) NOT NULL,
    max_discount_amount DECIMAL(15,2),
    min_order_amount DECIMAL(15,2),

    -- 적용 대상
    applicable_channels JSONB DEFAULT '[]'::jsonb,
    applicable_products JSONB DEFAULT '[]'::jsonb,
    applicable_categories JSONB DEFAULT '[]'::jsonb,
    excluded_products JSONB DEFAULT '[]'::jsonb,

    -- 사용 제한
    usage_limit_total INTEGER,
    usage_limit_per_customer INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,

    -- 쿠폰 코드 (쿠폰 타입인 경우)
    coupon_codes JSONB DEFAULT '[]'::jsonb,

    -- 조건
    conditions JSONB DEFAULT '{}'::jsonb,

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE promotions IS '프로모션 - 프로모션/할인 이벤트 관리';
COMMENT ON COLUMN promotions.discount_type IS '할인 유형 (percentage, fixed_amount)';
COMMENT ON COLUMN promotions.conditions IS '적용 조건 (신규 회원, 첫 구매 등)';

CREATE INDEX idx_promotions_active ON promotions(is_active);
CREATE INDEX idx_promotions_type ON promotions(promotion_type);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX idx_promotions_code ON promotions(promotion_code);

-- ============================================================================
-- 5. 운영 테이블 (Operations Tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- suppliers: 공급업체
-- 공급업체/거래처 정보
-- ---------------------------------------------------------------------------
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code VARCHAR(50) NOT NULL UNIQUE,

    -- 기본 정보
    name VARCHAR(200) NOT NULL,
    business_number VARCHAR(20),
    representative VARCHAR(100),

    -- 연락처
    email VARCHAR(255),
    phone VARCHAR(20),
    fax VARCHAR(20),
    address JSONB,

    -- 담당자
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),

    -- 거래 조건
    payment_terms VARCHAR(100),
    lead_time_days INTEGER DEFAULT 7,
    minimum_order_amount DECIMAL(15,2),

    -- 등급
    tier VARCHAR(20) DEFAULT 'standard',
    rating DECIMAL(3,2) DEFAULT 0,

    -- 상태
    is_active BOOLEAN DEFAULT TRUE,

    -- 계좌 정보
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    bank_holder VARCHAR(100),

    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE suppliers IS '공급업체 - 공급업체/거래처 정보';
COMMENT ON COLUMN suppliers.lead_time_days IS '리드 타임 (일)';

CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_tier ON suppliers(tier);

-- ---------------------------------------------------------------------------
-- purchase_orders: 발주
-- 발주서 관리
-- ---------------------------------------------------------------------------
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_code VARCHAR(50) NOT NULL UNIQUE,

    -- 공급업체
    supplier_id UUID NOT NULL REFERENCES suppliers(id),

    -- 상태
    status purchase_order_status DEFAULT 'draft',

    -- 금액
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,

    -- 일정
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,

    -- 배송 정보
    shipping_address JSONB,

    -- 발주 상품
    items JSONB NOT NULL,

    -- 결제
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    paid_amount DECIMAL(15,2) DEFAULT 0,
    paid_at TIMESTAMPTZ,

    -- 메모
    notes TEXT,
    internal_notes TEXT,

    -- 승인
    requested_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,

    -- AI 생성
    is_ai_generated BOOLEAN DEFAULT FALSE,
    ai_agent_id UUID REFERENCES agents(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE purchase_orders IS '발주 - 발주서 관리';
COMMENT ON COLUMN purchase_orders.items IS '발주 상품 목록 (JSON)';

CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_order_date ON purchase_orders(order_date);
CREATE INDEX idx_po_delivery_date ON purchase_orders(expected_delivery_date);

-- ---------------------------------------------------------------------------
-- certifications: 인증 관리
-- 제품/업체 인증 정보 관리
-- ---------------------------------------------------------------------------
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certification_code VARCHAR(50) NOT NULL UNIQUE,

    -- 인증 대상
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,

    -- 인증 정보
    certification_type VARCHAR(100) NOT NULL,
    certification_name VARCHAR(200) NOT NULL,
    issuing_authority VARCHAR(200),
    certificate_number VARCHAR(100),

    -- 기간
    issued_date DATE NOT NULL,
    expiry_date DATE,

    -- 상태
    status certification_status DEFAULT 'valid',

    -- 파일
    document_url TEXT,
    documents JSONB DEFAULT '[]'::jsonb,

    -- 알림 설정
    renewal_reminder_days INTEGER DEFAULT 30,
    reminder_sent BOOLEAN DEFAULT FALSE,

    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE certifications IS '인증 관리 - 제품/업체 인증 정보';
COMMENT ON COLUMN certifications.entity_type IS '인증 대상 유형 (product, supplier, company)';
COMMENT ON COLUMN certifications.certification_type IS '인증 유형 (HACCP, FDA, GMP, ISO 등)';

CREATE INDEX idx_certifications_entity ON certifications(entity_type, entity_id);
CREATE INDEX idx_certifications_type ON certifications(certification_type);
CREATE INDEX idx_certifications_status ON certifications(status);
CREATE INDEX idx_certifications_expiry ON certifications(expiry_date);
CREATE INDEX idx_certifications_expiring ON certifications(expiry_date) WHERE status = 'valid' AND expiry_date IS NOT NULL;

-- ---------------------------------------------------------------------------
-- contracts: 계약
-- 계약서 관리
-- ---------------------------------------------------------------------------
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_code VARCHAR(50) NOT NULL UNIQUE,

    -- 계약 당사자
    party_type VARCHAR(20) NOT NULL,
    party_id UUID NOT NULL,
    party_name VARCHAR(200),

    -- 계약 정보
    contract_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- 기간
    status contract_status DEFAULT 'draft',
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renewal BOOLEAN DEFAULT FALSE,

    -- 금액
    contract_value DECIMAL(15,2),
    payment_terms TEXT,

    -- 조건
    terms JSONB DEFAULT '{}'::jsonb,

    -- 문서
    document_url TEXT,
    documents JSONB DEFAULT '[]'::jsonb,

    -- 서명
    signed_by_us BOOLEAN DEFAULT FALSE,
    signed_by_us_at TIMESTAMPTZ,
    signed_by_party BOOLEAN DEFAULT FALSE,
    signed_by_party_at TIMESTAMPTZ,

    -- 알림
    renewal_reminder_days INTEGER DEFAULT 30,

    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE contracts IS '계약 - 계약서 관리';
COMMENT ON COLUMN contracts.party_type IS '계약 당사자 유형 (supplier, influencer, partner)';
COMMENT ON COLUMN contracts.contract_type IS '계약 유형 (supply, service, NDA, partnership)';

CREATE INDEX idx_contracts_party ON contracts(party_type, party_id);
CREATE INDEX idx_contracts_type ON contracts(contract_type);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date);
CREATE INDEX idx_contracts_expiring ON contracts(end_date) WHERE status = 'active';

-- ============================================================================
-- 6. 시스템 테이블 (System Tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- notifications: 알림
-- 시스템 알림 관리
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 수신자
    recipient_type VARCHAR(20) NOT NULL,
    recipient_id UUID,

    -- 알림 내용
    notification_type notification_type DEFAULT 'info',
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,

    -- 관련 엔티티
    entity_type VARCHAR(100),
    entity_id UUID,
    action_url TEXT,

    -- 발신자
    sender_agent_id UUID REFERENCES agents(id),

    -- 채널
    channels JSONB DEFAULT '["in_app"]'::jsonb,

    -- 상태
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,

    -- 만료
    expires_at TIMESTAMPTZ,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notifications IS '알림 - 시스템 알림 관리';
COMMENT ON COLUMN notifications.recipient_type IS '수신자 유형 (user, agent, system)';
COMMENT ON COLUMN notifications.channels IS '알림 채널 (in_app, email, sms, push, slack)';

CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_type, recipient_id, created_at DESC) WHERE is_read = FALSE;

-- ---------------------------------------------------------------------------
-- scheduled_jobs: 스케줄 작업
-- 예약된 작업 관리
-- ---------------------------------------------------------------------------
CREATE TABLE scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_code VARCHAR(100) NOT NULL UNIQUE,

    -- 작업 정보
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- 실행 대상
    agent_id UUID REFERENCES agents(id),
    workflow_id UUID REFERENCES workflows(id),

    -- 스케줄
    schedule_type VARCHAR(20) NOT NULL,
    cron_expression VARCHAR(100),
    interval_seconds INTEGER,

    -- 실행 설정
    job_config JSONB DEFAULT '{}'::jsonb,

    -- 상태
    status job_status DEFAULT 'scheduled',
    is_enabled BOOLEAN DEFAULT TRUE,

    -- 실행 기록
    last_run_at TIMESTAMPTZ,
    last_run_status VARCHAR(20),
    last_run_duration_ms INTEGER,
    last_error TEXT,
    next_run_at TIMESTAMPTZ,

    -- 통계
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,

    -- 재시도 설정
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE scheduled_jobs IS '스케줄 작업 - 예약된 작업 관리';
COMMENT ON COLUMN scheduled_jobs.schedule_type IS '스케줄 유형 (cron, interval, once)';
COMMENT ON COLUMN scheduled_jobs.cron_expression IS 'Cron 표현식 (예: 0 9 * * *)';

CREATE INDEX idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX idx_scheduled_jobs_enabled ON scheduled_jobs(is_enabled);
CREATE INDEX idx_scheduled_jobs_next_run ON scheduled_jobs(next_run_at) WHERE is_enabled = TRUE;
CREATE INDEX idx_scheduled_jobs_agent ON scheduled_jobs(agent_id);

-- ---------------------------------------------------------------------------
-- agent_conversations: 에이전트 대화 기록
-- 에이전트 간/사용자와의 대화 기록
-- ---------------------------------------------------------------------------
CREATE TABLE agent_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,

    -- 참여자
    agent_id UUID REFERENCES agents(id),
    user_id UUID,

    -- 메시지
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,

    -- 관련 컨텍스트
    context JSONB DEFAULT '{}'::jsonb,

    -- 도구 사용
    tool_calls JSONB DEFAULT '[]'::jsonb,
    tool_results JSONB DEFAULT '[]'::jsonb,

    -- 토큰 사용량
    input_tokens INTEGER,
    output_tokens INTEGER,

    -- 관련 태스크
    task_id UUID REFERENCES task_queue(id),

    -- 메타데이터
    model VARCHAR(100),
    latency_ms INTEGER,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE agent_conversations IS '에이전트 대화 기록 - 에이전트 간/사용자와의 대화';
COMMENT ON COLUMN agent_conversations.conversation_id IS '대화 세션 ID';
COMMENT ON COLUMN agent_conversations.role IS '역할 (user, assistant, system, tool)';
COMMENT ON COLUMN agent_conversations.tool_calls IS 'MCP 도구 호출 내역';

CREATE INDEX idx_agent_conv_conversation ON agent_conversations(conversation_id);
CREATE INDEX idx_agent_conv_agent ON agent_conversations(agent_id);
CREATE INDEX idx_agent_conv_task ON agent_conversations(task_id);
CREATE INDEX idx_agent_conv_created ON agent_conversations(created_at DESC);

-- ============================================================================
-- 트리거 함수: updated_at 자동 업데이트
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'updated_at'
          AND table_name NOT IN ('audit_logs', 'notifications', 'cs_conversations', 'agent_conversations')
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Row Level Security (RLS) 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 서비스 역할 정책 (Supabase service_role은 모든 접근 허용)
-- ---------------------------------------------------------------------------

-- system_config
CREATE POLICY "Service role has full access to system_config"
    ON system_config FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read non-sensitive config"
    ON system_config FOR SELECT
    USING (auth.role() = 'authenticated' AND is_sensitive = FALSE);

-- agents
CREATE POLICY "Service role has full access to agents"
    ON agents FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read agents"
    ON agents FOR SELECT
    USING (auth.role() = 'authenticated');

-- workflows
CREATE POLICY "Service role has full access to workflows"
    ON workflows FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read active workflows"
    ON workflows FOR SELECT
    USING (auth.role() = 'authenticated' AND is_active = TRUE);

-- task_queue
CREATE POLICY "Service role has full access to task_queue"
    ON task_queue FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read their tasks"
    ON task_queue FOR SELECT
    USING (auth.role() = 'authenticated');

-- audit_logs
CREATE POLICY "Service role has full access to audit_logs"
    ON audit_logs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read audit_logs"
    ON audit_logs FOR SELECT
    USING (auth.role() = 'authenticated');

-- approval_requests
CREATE POLICY "Service role has full access to approval_requests"
    ON approval_requests FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can manage approval_requests"
    ON approval_requests FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- customers
CREATE POLICY "Service role has full access to customers"
    ON customers FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read customers"
    ON customers FOR SELECT
    USING (auth.role() = 'authenticated');

-- products
CREATE POLICY "Service role has full access to products"
    ON products FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anyone can read active products"
    ON products FOR SELECT
    USING (is_active = TRUE);

-- channel_products
CREATE POLICY "Service role has full access to channel_products"
    ON channel_products FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read channel_products"
    ON channel_products FOR SELECT
    USING (auth.role() = 'authenticated');

-- inventory
CREATE POLICY "Service role has full access to inventory"
    ON inventory FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read inventory"
    ON inventory FOR SELECT
    USING (auth.role() = 'authenticated');

-- orders
CREATE POLICY "Service role has full access to orders"
    ON orders FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read orders"
    ON orders FOR SELECT
    USING (auth.role() = 'authenticated');

-- order_items
CREATE POLICY "Service role has full access to order_items"
    ON order_items FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read order_items"
    ON order_items FOR SELECT
    USING (auth.role() = 'authenticated');

-- settlements
CREATE POLICY "Service role has full access to settlements"
    ON settlements FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read settlements"
    ON settlements FOR SELECT
    USING (auth.role() = 'authenticated');

-- cs_tickets
CREATE POLICY "Service role has full access to cs_tickets"
    ON cs_tickets FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can manage cs_tickets"
    ON cs_tickets FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- cs_conversations
CREATE POLICY "Service role has full access to cs_conversations"
    ON cs_conversations FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can manage cs_conversations"
    ON cs_conversations FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- reviews
CREATE POLICY "Service role has full access to reviews"
    ON reviews FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anyone can read visible reviews"
    ON reviews FOR SELECT
    USING (is_visible = TRUE);

CREATE POLICY "Authenticated users can manage reviews"
    ON reviews FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- marketing_campaigns
CREATE POLICY "Service role has full access to marketing_campaigns"
    ON marketing_campaigns FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can manage marketing_campaigns"
    ON marketing_campaigns FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- marketing_metrics
CREATE POLICY "Service role has full access to marketing_metrics"
    ON marketing_metrics FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read marketing_metrics"
    ON marketing_metrics FOR SELECT
    USING (auth.role() = 'authenticated');

-- influencers
CREATE POLICY "Service role has full access to influencers"
    ON influencers FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can manage influencers"
    ON influencers FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- promotions
CREATE POLICY "Service role has full access to promotions"
    ON promotions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anyone can read active promotions"
    ON promotions FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Authenticated users can manage promotions"
    ON promotions FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- suppliers
CREATE POLICY "Service role has full access to suppliers"
    ON suppliers FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read suppliers"
    ON suppliers FOR SELECT
    USING (auth.role() = 'authenticated');

-- purchase_orders
CREATE POLICY "Service role has full access to purchase_orders"
    ON purchase_orders FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can manage purchase_orders"
    ON purchase_orders FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- certifications
CREATE POLICY "Service role has full access to certifications"
    ON certifications FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read certifications"
    ON certifications FOR SELECT
    USING (auth.role() = 'authenticated');

-- contracts
CREATE POLICY "Service role has full access to contracts"
    ON contracts FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read contracts"
    ON contracts FOR SELECT
    USING (auth.role() = 'authenticated');

-- notifications
CREATE POLICY "Service role has full access to notifications"
    ON notifications FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can read their own notifications"
    ON notifications FOR SELECT
    USING (auth.role() = 'authenticated' AND recipient_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.role() = 'authenticated' AND recipient_id = auth.uid())
    WITH CHECK (auth.role() = 'authenticated' AND recipient_id = auth.uid());

-- scheduled_jobs
CREATE POLICY "Service role has full access to scheduled_jobs"
    ON scheduled_jobs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read scheduled_jobs"
    ON scheduled_jobs FOR SELECT
    USING (auth.role() = 'authenticated');

-- agent_conversations
CREATE POLICY "Service role has full access to agent_conversations"
    ON agent_conversations FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can read their own conversations"
    ON agent_conversations FOR SELECT
    USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- ============================================================================
-- 뷰 (Views) - 자주 사용되는 쿼리를 위한 뷰
-- ============================================================================

-- 대기 중인 태스크 뷰
CREATE OR REPLACE VIEW v_pending_tasks AS
SELECT
    tq.*,
    a.name AS agent_name,
    a.category AS agent_category,
    w.name AS workflow_name
FROM task_queue tq
LEFT JOIN agents a ON tq.agent_id = a.id
LEFT JOIN workflows w ON tq.workflow_id = w.id
WHERE tq.status = 'pending'
ORDER BY
    CASE tq.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    tq.scheduled_at NULLS LAST,
    tq.created_at;

-- 미해결 CS 티켓 뷰
CREATE OR REPLACE VIEW v_open_cs_tickets AS
SELECT
    t.*,
    c.name AS customer_name,
    c.email AS customer_email,
    o.order_code,
    a.name AS assigned_agent_name
FROM cs_tickets t
LEFT JOIN customers c ON t.customer_id = c.id
LEFT JOIN orders o ON t.order_id = o.id
LEFT JOIN agents a ON t.assigned_agent_id = a.id
WHERE t.status IN ('open', 'in_progress', 'waiting_customer', 'escalated')
ORDER BY
    CASE t.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    t.created_at;

-- 재고 부족 상품 뷰
CREATE OR REPLACE VIEW v_low_stock_products AS
SELECT
    p.id AS product_id,
    p.product_code,
    p.sku,
    p.name AS product_name,
    i.warehouse_code,
    i.available_quantity,
    i.safety_stock,
    i.reorder_point,
    i.reorder_quantity
FROM inventory i
JOIN products p ON i.product_id = p.id
WHERE i.available_quantity <= i.reorder_point
  AND p.is_active = TRUE
  AND i.is_tracking = TRUE
ORDER BY i.available_quantity;

-- 오늘 만료되는 인증 뷰
CREATE OR REPLACE VIEW v_expiring_certifications AS
SELECT
    c.*,
    p.name AS product_name
FROM certifications c
LEFT JOIN products p ON c.entity_type = 'product' AND c.entity_id = p.id
WHERE c.status = 'valid'
  AND c.expiry_date IS NOT NULL
  AND c.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY c.expiry_date;

-- 대기 중인 승인 요청 뷰
CREATE OR REPLACE VIEW v_pending_approvals AS
SELECT
    ar.*,
    a.name AS agent_name,
    tq.task_code
FROM approval_requests ar
LEFT JOIN agents a ON ar.agent_id = a.id
LEFT JOIN task_queue tq ON ar.task_id = tq.id
WHERE ar.status = 'pending'
  AND (ar.expires_at IS NULL OR ar.expires_at > NOW())
ORDER BY
    CASE ar.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    ar.created_at;

-- ============================================================================
-- 함수 (Functions) - 비즈니스 로직을 위한 함수
-- ============================================================================

-- 재고 차감 함수
CREATE OR REPLACE FUNCTION deduct_inventory(
    p_product_id UUID,
    p_option_code VARCHAR DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1,
    p_warehouse_code VARCHAR DEFAULT 'main'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_qty INTEGER;
BEGIN
    SELECT available_quantity INTO v_current_qty
    FROM inventory
    WHERE product_id = p_product_id
      AND (option_code = p_option_code OR (option_code IS NULL AND p_option_code IS NULL))
      AND warehouse_code = p_warehouse_code
    FOR UPDATE;

    IF v_current_qty IS NULL OR v_current_qty < p_quantity THEN
        RETURN FALSE;
    END IF;

    UPDATE inventory
    SET available_quantity = available_quantity - p_quantity,
        reserved_quantity = reserved_quantity + p_quantity,
        last_outbound_at = NOW()
    WHERE product_id = p_product_id
      AND (option_code = p_option_code OR (option_code IS NULL AND p_option_code IS NULL))
      AND warehouse_code = p_warehouse_code;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 재고 복원 함수 (주문 취소 시)
CREATE OR REPLACE FUNCTION restore_inventory(
    p_product_id UUID,
    p_option_code VARCHAR DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1,
    p_warehouse_code VARCHAR DEFAULT 'main'
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE inventory
    SET available_quantity = available_quantity + p_quantity,
        reserved_quantity = GREATEST(0, reserved_quantity - p_quantity)
    WHERE product_id = p_product_id
      AND (option_code = p_option_code OR (option_code IS NULL AND p_option_code IS NULL))
      AND warehouse_code = p_warehouse_code;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 고객 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_customer_stats(p_customer_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE customers
    SET total_orders = (
            SELECT COUNT(*) FROM orders
            WHERE customer_id = p_customer_id AND status NOT IN ('cancelled', 'refunded')
        ),
        total_spent = (
            SELECT COALESCE(SUM(total_amount), 0) FROM orders
            WHERE customer_id = p_customer_id AND status NOT IN ('cancelled', 'refunded')
        ),
        average_order_value = (
            SELECT COALESCE(AVG(total_amount), 0) FROM orders
            WHERE customer_id = p_customer_id AND status NOT IN ('cancelled', 'refunded')
        ),
        last_order_at = (
            SELECT MAX(ordered_at) FROM orders
            WHERE customer_id = p_customer_id
        )
    WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- 주문 완료 시 트리거
CREATE OR REPLACE FUNCTION on_order_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        -- 고객 통계 업데이트
        IF NEW.customer_id IS NOT NULL THEN
            PERFORM update_customer_stats(NEW.customer_id);
        END IF;

        -- 예약된 재고를 실제 차감으로 전환
        UPDATE inventory
        SET reserved_quantity = reserved_quantity - oi.quantity,
            total_quantity = total_quantity - oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id
          AND inventory.product_id = oi.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_completed
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION on_order_completed();

-- ============================================================================
-- 초기 데이터 삽입 - 기본 시스템 설정
-- ============================================================================

-- 기본 시스템 설정
INSERT INTO system_config (config_key, config_value, description, category) VALUES
('system.name', '"썬데이허그 AI 에이전트 시스템"', '시스템 이름', 'system'),
('system.version', '"1.0.0"', '시스템 버전', 'system'),
('system.timezone', '"Asia/Seoul"', '시스템 타임존', 'system'),
('agent.default_timeout', '300', '에이전트 기본 타임아웃 (초)', 'agent'),
('agent.max_concurrent_tasks', '10', '에이전트당 최대 동시 태스크', 'agent'),
('notification.channels', '["in_app", "email", "slack"]', '활성화된 알림 채널', 'notification'),
('approval.expiry_hours', '24', '승인 요청 만료 시간 (시간)', 'approval'),
('inventory.low_stock_threshold', '10', '재고 부족 임계값', 'inventory'),
('cs.sla_first_response_hours', '4', 'CS 첫 응답 SLA (시간)', 'cs'),
('cs.sla_resolution_hours', '24', 'CS 해결 SLA (시간)', 'cs')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 완료
-- ============================================================================

COMMENT ON SCHEMA public IS '썬데이허그 AI 에이전트 시스템 데이터베이스 스키마 v1.0.0';
