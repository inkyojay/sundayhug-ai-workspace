-- ============================================================================
-- LANE 4: Analytics & Growth 에이전트 테이블 마이그레이션
-- ============================================================================
-- 버전: 1.0.0
-- 생성일: 2024-01-26
-- 설명: Analytics, Crisis, Product, Partnership, Loyalty 에이전트를 위한 테이블
-- ============================================================================

-- ============================================================================
-- ENUM 타입 정의 (LANE 4 전용)
-- ============================================================================

-- 위기 심각도 레벨
CREATE TYPE crisis_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- 위기 상태
CREATE TYPE crisis_status AS ENUM (
    'detected',      -- 감지됨
    'assessing',     -- 평가 중
    'responding',    -- 대응 중
    'escalated',     -- 에스컬레이션됨
    'resolved',      -- 해결됨
    'closed'         -- 종료
);

-- 위기 유형
CREATE TYPE crisis_type AS ENUM (
    'negative_review',    -- 악성 리뷰
    'sns_issue',          -- SNS 이슈
    'quality_issue',      -- 품질 문제
    'safety_issue',       -- 안전 문제
    'service_issue',      -- 서비스 문제
    'media_coverage',     -- 미디어 보도
    'legal_issue',        -- 법적 이슈
    'other'               -- 기타
);

-- 제품 개발 단계
CREATE TYPE product_stage AS ENUM (
    'idea',           -- 아이디어
    'research',       -- 리서치
    'concept',        -- 컨셉 정의
    'development',    -- 개발
    'testing',        -- 테스트
    'pre_launch',     -- 출시 준비
    'launched',       -- 출시 완료
    'discontinued'    -- 단종
);

-- 파트너 유형
CREATE TYPE partner_type AS ENUM (
    'wholesale',      -- 도매
    'distributor',    -- 총판
    'franchise',      -- 프랜차이즈
    'b2b_client',     -- B2B 고객
    'influencer',     -- 인플루언서
    'affiliate'       -- 제휴
);

-- 파트너 등급
CREATE TYPE partner_tier AS ENUM ('standard', 'silver', 'gold', 'platinum');

-- 멤버십 등급
CREATE TYPE membership_tier AS ENUM ('basic', 'silver', 'gold', 'platinum', 'vip', 'vvip');

-- 포인트 트랜잭션 유형
CREATE TYPE point_transaction_type AS ENUM (
    'earn_purchase',      -- 구매 적립
    'earn_review',        -- 리뷰 적립
    'earn_signup',        -- 가입 적립
    'earn_birthday',      -- 생일 적립
    'earn_event',         -- 이벤트 적립
    'earn_compensation',  -- 보상 적립
    'use',                -- 사용
    'expire',             -- 소멸
    'adjust'              -- 조정
);

-- 이탈 위험 레벨
CREATE TYPE churn_risk_level AS ENUM ('low', 'medium', 'high', 'critical');

-- 리포트 유형
CREATE TYPE report_type AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom');

-- 정산 상태
CREATE TYPE settlement_status AS ENUM ('pending', 'calculated', 'sent', 'confirmed', 'disputed', 'paid');


-- ============================================================================
-- 1. Analytics Agent 테이블
-- ============================================================================

-- ---------------------------------------------------------------------------
-- kpi_metrics: KPI 메트릭 저장
-- ---------------------------------------------------------------------------
CREATE TABLE kpi_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(20, 4) NOT NULL,
    metric_date DATE NOT NULL,
    dimension VARCHAR(100),
    dimension_value VARCHAR(200),
    unit VARCHAR(50),
    comparison_value DECIMAL(20, 4),
    comparison_period VARCHAR(50),
    change_rate DECIMAL(10, 4),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE kpi_metrics IS 'KPI 메트릭 저장 - 일별/차원별 비즈니스 지표';
CREATE INDEX idx_kpi_metrics_name_date ON kpi_metrics(metric_name, metric_date);
CREATE INDEX idx_kpi_metrics_dimension ON kpi_metrics(dimension, dimension_value);

-- ---------------------------------------------------------------------------
-- analytics_reports: 분석 리포트
-- ---------------------------------------------------------------------------
CREATE TABLE analytics_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type report_type NOT NULL,
    report_name VARCHAR(200) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    content JSONB NOT NULL,
    summary TEXT,
    recipients JSONB DEFAULT '[]'::jsonb,
    sent_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE analytics_reports IS '분석 리포트 - 정기/애드혹 리포트 저장';
CREATE INDEX idx_analytics_reports_type ON analytics_reports(report_type);
CREATE INDEX idx_analytics_reports_period ON analytics_reports(period_start, period_end);

-- ---------------------------------------------------------------------------
-- forecasts: 예측 결과
-- ---------------------------------------------------------------------------
CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    forecast_type VARCHAR(100) NOT NULL,
    target_metric VARCHAR(100) NOT NULL,
    target_date DATE NOT NULL,
    predicted_value DECIMAL(20, 4) NOT NULL,
    lower_bound DECIMAL(20, 4),
    upper_bound DECIMAL(20, 4),
    confidence_level DECIMAL(5, 4) DEFAULT 0.95,
    actual_value DECIMAL(20, 4),
    model_version VARCHAR(50),
    accuracy_score DECIMAL(10, 4),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE forecasts IS '예측 결과 - 매출/수요 예측 저장';
CREATE INDEX idx_forecasts_type ON forecasts(forecast_type);
CREATE INDEX idx_forecasts_target_date ON forecasts(target_date);

-- ---------------------------------------------------------------------------
-- anomaly_detections: 이상 감지 기록
-- ---------------------------------------------------------------------------
CREATE TABLE anomaly_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    detected_value DECIMAL(20, 4) NOT NULL,
    expected_value DECIMAL(20, 4),
    deviation_score DECIMAL(10, 4),
    severity crisis_severity NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    resolved_at TIMESTAMPTZ,
    alert_sent BOOLEAN DEFAULT FALSE,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE anomaly_detections IS '이상 감지 기록 - 메트릭 이상치 기록';
CREATE INDEX idx_anomaly_detections_metric ON anomaly_detections(metric_name);
CREATE INDEX idx_anomaly_detections_severity ON anomaly_detections(severity);
CREATE INDEX idx_anomaly_detections_detected_at ON anomaly_detections(detected_at);


-- ============================================================================
-- 2. Crisis Agent 테이블
-- ============================================================================

-- ---------------------------------------------------------------------------
-- crisis_events: 위기 이벤트
-- ---------------------------------------------------------------------------
CREATE TABLE crisis_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crisis_code VARCHAR(50) NOT NULL UNIQUE,
    crisis_type crisis_type NOT NULL,
    severity crisis_severity NOT NULL,
    status crisis_status DEFAULT 'detected',
    title VARCHAR(300) NOT NULL,
    description TEXT,
    source VARCHAR(100),
    source_url TEXT,
    affected_products JSONB DEFAULT '[]'::jsonb,
    affected_customers INTEGER DEFAULT 0,
    detected_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    assigned_to UUID,
    escalation_level INTEGER DEFAULT 0,
    resolution_summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE crisis_events IS '위기 이벤트 - 감지된 위기 상황 기록';
CREATE INDEX idx_crisis_events_code ON crisis_events(crisis_code);
CREATE INDEX idx_crisis_events_type ON crisis_events(crisis_type);
CREATE INDEX idx_crisis_events_severity ON crisis_events(severity);
CREATE INDEX idx_crisis_events_status ON crisis_events(status);
CREATE INDEX idx_crisis_events_detected_at ON crisis_events(detected_at);

-- ---------------------------------------------------------------------------
-- crisis_responses: 위기 대응 기록
-- ---------------------------------------------------------------------------
CREATE TABLE crisis_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crisis_id UUID NOT NULL REFERENCES crisis_events(id),
    response_type VARCHAR(100) NOT NULL,
    action_taken TEXT NOT NULL,
    performed_by UUID,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    result VARCHAR(100),
    notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE crisis_responses IS '위기 대응 기록 - 대응 조치 이력';
CREATE INDEX idx_crisis_responses_crisis ON crisis_responses(crisis_id);

-- ---------------------------------------------------------------------------
-- crisis_sops: 위기 대응 SOP
-- ---------------------------------------------------------------------------
CREATE TABLE crisis_sops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sop_code VARCHAR(50) NOT NULL UNIQUE,
    crisis_type crisis_type NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    steps JSONB NOT NULL,
    auto_executable BOOLEAN DEFAULT FALSE,
    approval_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE crisis_sops IS '위기 대응 SOP - 표준 운영 절차';
CREATE INDEX idx_crisis_sops_type ON crisis_sops(crisis_type);

-- ---------------------------------------------------------------------------
-- crisis_recovery_reports: 위기 복구 보고서
-- ---------------------------------------------------------------------------
CREATE TABLE crisis_recovery_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crisis_id UUID NOT NULL REFERENCES crisis_events(id),
    incident_summary TEXT NOT NULL,
    root_cause_analysis TEXT,
    timeline JSONB DEFAULT '[]'::jsonb,
    impact_assessment JSONB DEFAULT '{}'::jsonb,
    lessons_learned TEXT,
    preventive_measures JSONB DEFAULT '[]'::jsonb,
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE crisis_recovery_reports IS '위기 복구 보고서 - 사후 분석 보고서';
CREATE INDEX idx_crisis_recovery_reports_crisis ON crisis_recovery_reports(crisis_id);


-- ============================================================================
-- 3. Product Agent 테이블
-- ============================================================================

-- ---------------------------------------------------------------------------
-- product_research: 제품 리서치 결과
-- ---------------------------------------------------------------------------
CREATE TABLE product_research (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_code VARCHAR(50) NOT NULL UNIQUE,
    research_type VARCHAR(100) NOT NULL,
    title VARCHAR(300) NOT NULL,
    category VARCHAR(100),
    target_segment VARCHAR(200),
    market_analysis JSONB DEFAULT '{}'::jsonb,
    competitor_analysis JSONB DEFAULT '{}'::jsonb,
    trend_analysis JSONB DEFAULT '{}'::jsonb,
    opportunities JSONB DEFAULT '[]'::jsonb,
    risks JSONB DEFAULT '[]'::jsonb,
    recommendations TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    requested_by UUID,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE product_research IS '제품 리서치 결과 - 시장조사/경쟁분석';
CREATE INDEX idx_product_research_code ON product_research(research_code);
CREATE INDEX idx_product_research_type ON product_research(research_type);
CREATE INDEX idx_product_research_category ON product_research(category);

-- ---------------------------------------------------------------------------
-- product_concepts: 제품 컨셉 문서
-- ---------------------------------------------------------------------------
CREATE TABLE product_concepts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concept_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    stage product_stage DEFAULT 'concept',
    target_customer JSONB DEFAULT '{}'::jsonb,
    value_proposition TEXT,
    key_features JSONB DEFAULT '[]'::jsonb,
    differentiators JSONB DEFAULT '[]'::jsonb,
    positioning TEXT,
    price_range JSONB DEFAULT '{}'::jsonb,
    research_id UUID REFERENCES product_research(id),
    spec_document JSONB DEFAULT '{}'::jsonb,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE product_concepts IS '제품 컨셉 문서 - 신제품 기획 문서';
CREATE INDEX idx_product_concepts_code ON product_concepts(concept_code);
CREATE INDEX idx_product_concepts_stage ON product_concepts(stage);
CREATE INDEX idx_product_concepts_category ON product_concepts(category);

-- ---------------------------------------------------------------------------
-- product_feedback_analysis: 제품 피드백 분석
-- ---------------------------------------------------------------------------
CREATE TABLE product_feedback_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID,
    analysis_period_start DATE NOT NULL,
    analysis_period_end DATE NOT NULL,
    total_reviews INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2),
    sentiment_distribution JSONB DEFAULT '{}'::jsonb,
    key_topics JSONB DEFAULT '[]'::jsonb,
    positive_factors JSONB DEFAULT '[]'::jsonb,
    negative_factors JSONB DEFAULT '[]'::jsonb,
    improvement_suggestions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE product_feedback_analysis IS '제품 피드백 분석 - 리뷰/VOC 분석 결과';
CREATE INDEX idx_product_feedback_product ON product_feedback_analysis(product_id);
CREATE INDEX idx_product_feedback_period ON product_feedback_analysis(analysis_period_start, analysis_period_end);

-- ---------------------------------------------------------------------------
-- product_improvements: 제품 개선 항목
-- ---------------------------------------------------------------------------
CREATE TABLE product_improvements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID,
    improvement_type VARCHAR(100) NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    source VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium',
    impact_score DECIMAL(5, 2),
    feasibility_score DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'proposed',
    assigned_to UUID,
    target_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE product_improvements IS '제품 개선 항목 - 개선 제안 및 추적';
CREATE INDEX idx_product_improvements_product ON product_improvements(product_id);
CREATE INDEX idx_product_improvements_priority ON product_improvements(priority);
CREATE INDEX idx_product_improvements_status ON product_improvements(status);


-- ============================================================================
-- 4. Partnership Agent 테이블
-- ============================================================================

-- ---------------------------------------------------------------------------
-- partners: 파트너 정보
-- ---------------------------------------------------------------------------
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    business_number VARCHAR(20),
    partner_type partner_type NOT NULL,
    tier partner_tier DEFAULT 'standard',
    contact_name VARCHAR(100),
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    address TEXT,
    credit_limit DECIMAL(15, 2) DEFAULT 0,
    payment_terms VARCHAR(50) DEFAULT 'prepaid',
    discount_rate DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE partners IS '파트너 정보 - B2B/도매/제휴 파트너';
CREATE INDEX idx_partners_code ON partners(partner_code);
CREATE INDEX idx_partners_type ON partners(partner_type);
CREATE INDEX idx_partners_tier ON partners(tier);
CREATE INDEX idx_partners_status ON partners(status);

-- ---------------------------------------------------------------------------
-- partner_contracts: 파트너 계약
-- ---------------------------------------------------------------------------
CREATE TABLE partner_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_code VARCHAR(50) NOT NULL UNIQUE,
    partner_id UUID NOT NULL REFERENCES partners(id),
    contract_type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    terms JSONB DEFAULT '{}'::jsonb,
    minimum_order_amount DECIMAL(15, 2),
    discount_rate DECIMAL(5, 2),
    commission_rate DECIMAL(5, 2),
    status contract_status DEFAULT 'draft',
    document_url TEXT,
    signed_at TIMESTAMPTZ,
    signed_by_partner VARCHAR(200),
    signed_by_company VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE partner_contracts IS '파트너 계약 - 계약서 관리';
CREATE INDEX idx_partner_contracts_partner ON partner_contracts(partner_id);
CREATE INDEX idx_partner_contracts_status ON partner_contracts(status);
CREATE INDEX idx_partner_contracts_dates ON partner_contracts(start_date, end_date);

-- ---------------------------------------------------------------------------
-- b2b_inquiries: B2B 문의
-- ---------------------------------------------------------------------------
CREATE TABLE b2b_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(200) NOT NULL,
    contact_phone VARCHAR(50),
    business_type VARCHAR(100),
    inquiry_content TEXT NOT NULL,
    expected_volume VARCHAR(100),
    product_categories JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'received',
    qualification_score INTEGER,
    assigned_to UUID,
    partner_id UUID REFERENCES partners(id),
    source VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE b2b_inquiries IS 'B2B 문의 - 납품/도매 문의';
CREATE INDEX idx_b2b_inquiries_code ON b2b_inquiries(inquiry_code);
CREATE INDEX idx_b2b_inquiries_status ON b2b_inquiries(status);
CREATE INDEX idx_b2b_inquiries_assigned ON b2b_inquiries(assigned_to);

-- ---------------------------------------------------------------------------
-- quotations: 견적서
-- ---------------------------------------------------------------------------
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_code VARCHAR(50) NOT NULL UNIQUE,
    inquiry_id UUID REFERENCES b2b_inquiries(id),
    partner_id UUID REFERENCES partners(id),
    valid_until DATE NOT NULL,
    items JSONB NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    shipping_cost DECIMAL(15, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(200),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE quotations IS '견적서 - B2B 견적';
CREATE INDEX idx_quotations_code ON quotations(quotation_code);
CREATE INDEX idx_quotations_partner ON quotations(partner_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_valid_until ON quotations(valid_until);

-- ---------------------------------------------------------------------------
-- wholesale_orders: 도매 주문
-- ---------------------------------------------------------------------------
CREATE TABLE wholesale_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) NOT NULL UNIQUE,
    partner_id UUID NOT NULL REFERENCES partners(id),
    quotation_id UUID REFERENCES quotations(id),
    items JSONB NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    shipping_cost DECIMAL(15, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    status order_status DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    paid_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    shipping_info JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE wholesale_orders IS '도매 주문 - B2B/도매 주문';
CREATE INDEX idx_wholesale_orders_code ON wholesale_orders(order_code);
CREATE INDEX idx_wholesale_orders_partner ON wholesale_orders(partner_id);
CREATE INDEX idx_wholesale_orders_status ON wholesale_orders(status);

-- ---------------------------------------------------------------------------
-- group_buying_campaigns: 공동구매 캠페인
-- ---------------------------------------------------------------------------
CREATE TABLE group_buying_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_code VARCHAR(50) NOT NULL UNIQUE,
    partner_id UUID NOT NULL REFERENCES partners(id),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    products JSONB NOT NULL,
    min_participants INTEGER DEFAULT 1,
    max_participants INTEGER,
    target_sales DECIMAL(15, 2),
    commission_rate DECIMAL(5, 2) DEFAULT 0,
    current_participants INTEGER DEFAULT 0,
    current_sales DECIMAL(15, 2) DEFAULT 0,
    status campaign_status DEFAULT 'draft',
    terms JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE group_buying_campaigns IS '공동구매 캠페인 - 인플루언서/단체 공구';
CREATE INDEX idx_group_buying_code ON group_buying_campaigns(campaign_code);
CREATE INDEX idx_group_buying_partner ON group_buying_campaigns(partner_id);
CREATE INDEX idx_group_buying_status ON group_buying_campaigns(status);
CREATE INDEX idx_group_buying_dates ON group_buying_campaigns(start_date, end_date);

-- ---------------------------------------------------------------------------
-- partner_settlements: 파트너 정산
-- ---------------------------------------------------------------------------
CREATE TABLE partner_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_code VARCHAR(50) NOT NULL UNIQUE,
    partner_id UUID NOT NULL REFERENCES partners(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_sales DECIMAL(15, 2) DEFAULT 0,
    returns_amount DECIMAL(15, 2) DEFAULT 0,
    commission_amount DECIMAL(15, 2) DEFAULT 0,
    adjustments DECIMAL(15, 2) DEFAULT 0,
    net_amount DECIMAL(15, 2) NOT NULL,
    status settlement_status DEFAULT 'pending',
    statement_url TEXT,
    sent_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    dispute_reason TEXT,
    paid_at TIMESTAMPTZ,
    payment_reference VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE partner_settlements IS '파트너 정산 - 정산 내역';
CREATE INDEX idx_partner_settlements_partner ON partner_settlements(partner_id);
CREATE INDEX idx_partner_settlements_period ON partner_settlements(period_start, period_end);
CREATE INDEX idx_partner_settlements_status ON partner_settlements(status);


-- ============================================================================
-- 5. Loyalty Agent 테이블
-- ============================================================================

-- ---------------------------------------------------------------------------
-- membership_tiers: 멤버십 등급 정의
-- ---------------------------------------------------------------------------
CREATE TABLE membership_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_code membership_tier NOT NULL UNIQUE,
    tier_name VARCHAR(100) NOT NULL,
    min_purchase_amount DECIMAL(15, 2) NOT NULL,
    point_rate DECIMAL(5, 4) NOT NULL,
    benefits JSONB NOT NULL,
    free_shipping_threshold DECIMAL(15, 2),
    birthday_points INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE membership_tiers IS '멤버십 등급 정의 - 등급별 조건 및 혜택';
CREATE INDEX idx_membership_tiers_code ON membership_tiers(tier_code);

-- ---------------------------------------------------------------------------
-- customer_memberships: 고객 멤버십 정보
-- ---------------------------------------------------------------------------
CREATE TABLE customer_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    current_tier membership_tier DEFAULT 'basic',
    tier_start_date DATE NOT NULL,
    tier_end_date DATE,
    evaluation_period_start DATE NOT NULL,
    evaluation_period_end DATE NOT NULL,
    period_purchase_amount DECIMAL(15, 2) DEFAULT 0,
    total_purchase_amount DECIMAL(15, 2) DEFAULT 0,
    total_purchase_count INTEGER DEFAULT 0,
    point_balance INTEGER DEFAULT 0,
    last_purchase_date DATE,
    tier_change_history JSONB DEFAULT '[]'::jsonb,
    grace_period_end DATE,
    pending_tier membership_tier,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

COMMENT ON TABLE customer_memberships IS '고객 멤버십 정보 - 등급 및 실적';
CREATE INDEX idx_customer_memberships_customer ON customer_memberships(customer_id);
CREATE INDEX idx_customer_memberships_tier ON customer_memberships(current_tier);

-- ---------------------------------------------------------------------------
-- point_transactions: 포인트 거래 내역
-- ---------------------------------------------------------------------------
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL,
    transaction_type point_transaction_type NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    description VARCHAR(300),
    expiry_date DATE,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE point_transactions IS '포인트 거래 내역 - 적립/사용/소멸';
CREATE INDEX idx_point_transactions_customer ON point_transactions(customer_id);
CREATE INDEX idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX idx_point_transactions_expiry ON point_transactions(expiry_date);
CREATE INDEX idx_point_transactions_created ON point_transactions(created_at);

-- ---------------------------------------------------------------------------
-- point_balances_by_expiry: 만료일별 포인트 잔액
-- ---------------------------------------------------------------------------
CREATE TABLE point_balances_by_expiry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    expiry_date DATE NOT NULL,
    remaining_amount INTEGER NOT NULL,
    original_amount INTEGER NOT NULL,
    earn_transaction_id UUID REFERENCES point_transactions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE point_balances_by_expiry IS '만료일별 포인트 잔액 - FIFO 차감용';
CREATE INDEX idx_point_balances_customer ON point_balances_by_expiry(customer_id);
CREATE INDEX idx_point_balances_expiry ON point_balances_by_expiry(expiry_date);

-- ---------------------------------------------------------------------------
-- vip_profiles: VIP 고객 프로필
-- ---------------------------------------------------------------------------
CREATE TABLE vip_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL UNIQUE,
    vip_since DATE NOT NULL,
    dedicated_manager_id UUID,
    preferences JSONB DEFAULT '{}'::jsonb,
    special_notes TEXT,
    care_history JSONB DEFAULT '[]'::jsonb,
    last_care_date DATE,
    next_care_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE vip_profiles IS 'VIP 고객 프로필 - VIP 전용 정보';
CREATE INDEX idx_vip_profiles_customer ON vip_profiles(customer_id);
CREATE INDEX idx_vip_profiles_manager ON vip_profiles(dedicated_manager_id);

-- ---------------------------------------------------------------------------
-- churn_risk_analysis: 이탈 위험 분석
-- ---------------------------------------------------------------------------
CREATE TABLE churn_risk_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    analysis_date DATE NOT NULL,
    risk_level churn_risk_level NOT NULL,
    risk_score DECIMAL(5, 2) NOT NULL,
    risk_factors JSONB DEFAULT '{}'::jsonb,
    last_purchase_days INTEGER,
    purchase_frequency_change DECIMAL(5, 2),
    purchase_amount_change DECIMAL(5, 2),
    visit_frequency_change DECIMAL(5, 2),
    recent_complaints INTEGER DEFAULT 0,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    action_taken VARCHAR(100),
    action_taken_at TIMESTAMPTZ,
    outcome VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE churn_risk_analysis IS '이탈 위험 분석 - 고객 이탈 위험 평가';
CREATE INDEX idx_churn_risk_customer ON churn_risk_analysis(customer_id);
CREATE INDEX idx_churn_risk_date ON churn_risk_analysis(analysis_date);
CREATE INDEX idx_churn_risk_level ON churn_risk_analysis(risk_level);

-- ---------------------------------------------------------------------------
-- retention_campaigns: 리텐션 캠페인
-- ---------------------------------------------------------------------------
CREATE TABLE retention_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_code VARCHAR(50) NOT NULL UNIQUE,
    campaign_name VARCHAR(200) NOT NULL,
    target_tier membership_tier,
    target_risk_level churn_risk_level,
    target_segment JSONB DEFAULT '{}'::jsonb,
    offer_type VARCHAR(100) NOT NULL,
    offer_value JSONB NOT NULL,
    message_template TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status campaign_status DEFAULT 'draft',
    target_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    converted_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE retention_campaigns IS '리텐션 캠페인 - 이탈 방지 캠페인';
CREATE INDEX idx_retention_campaigns_code ON retention_campaigns(campaign_code);
CREATE INDEX idx_retention_campaigns_status ON retention_campaigns(status);
CREATE INDEX idx_retention_campaigns_dates ON retention_campaigns(start_date, end_date);


-- ============================================================================
-- 기본 데이터 삽입
-- ============================================================================

-- 멤버십 등급 기본 데이터
INSERT INTO membership_tiers (tier_code, tier_name, min_purchase_amount, point_rate, benefits, free_shipping_threshold, birthday_points, sort_order) VALUES
('basic', 'BASIC', 0, 0.01, '{"discounts": [], "services": ["basic_support"]}', 50000, 1000, 1),
('silver', 'SILVER', 200000, 0.02, '{"discounts": [], "services": ["basic_support", "birthday_coupon"]}', 40000, 2000, 2),
('gold', 'GOLD', 500000, 0.03, '{"discounts": [], "services": ["basic_support", "birthday_coupon", "priority_cs"]}', 30000, 3000, 3),
('platinum', 'PLATINUM', 1000000, 0.04, '{"discounts": [], "services": ["basic_support", "birthday_coupon", "priority_cs", "exclusive_products"]}', 20000, 5000, 4),
('vip', 'VIP', 2000000, 0.05, '{"discounts": [], "services": ["basic_support", "birthday_coupon", "priority_cs", "exclusive_products", "dedicated_manager"]}', 0, 10000, 5),
('vvip', 'VVIP', 5000000, 0.07, '{"discounts": [], "services": ["basic_support", "birthday_coupon", "priority_cs", "exclusive_products", "dedicated_manager", "premium_services"]}', 0, 20000, 6);


-- ============================================================================
-- 마이그레이션 완료 기록
-- ============================================================================
INSERT INTO system_config (config_key, config_value, description, category)
VALUES (
    'migration_002_lane4',
    '{"version": "1.0.0", "applied_at": "2024-01-26", "tables_created": ["kpi_metrics", "analytics_reports", "forecasts", "anomaly_detections", "crisis_events", "crisis_responses", "crisis_sops", "crisis_recovery_reports", "product_research", "product_concepts", "product_feedback_analysis", "product_improvements", "partners", "partner_contracts", "b2b_inquiries", "quotations", "wholesale_orders", "group_buying_campaigns", "partner_settlements", "membership_tiers", "customer_memberships", "point_transactions", "point_balances_by_expiry", "vip_profiles", "churn_risk_analysis", "retention_campaigns"]}',
    'LANE 4 마이그레이션 정보',
    'migration'
);
