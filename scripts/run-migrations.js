const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.unybnarbrlmteamwvdql:Wpdlzhvm0339@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

// LANE 2 추가 테이블 정의
const LANE2_TABLES = `
-- LANE 2: Marketing & Content 추가 테이블

-- 광고 캠페인
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    daily_budget DECIMAL(15, 2),
    total_budget DECIMAL(15, 2),
    spent_amount DECIMAL(15, 2) DEFAULT 0,
    target_roas DECIMAL(5, 2),
    current_roas DECIMAL(5, 2),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    target_keywords TEXT[],
    target_audiences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 광고 성과 지표
CREATE TABLE IF NOT EXISTS ad_metrics (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(50) REFERENCES ad_campaigns(id),
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr DECIMAL(5, 4),
    conversions INTEGER DEFAULT 0,
    cost DECIMAL(15, 2) DEFAULT 0,
    revenue DECIMAL(15, 2) DEFAULT 0,
    roas DECIMAL(5, 2),
    cpc DECIMAL(10, 2),
    cpa DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, date)
);

-- 마케팅 콘텐츠
CREATE TABLE IF NOT EXISTS marketing_contents (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    body TEXT,
    images TEXT[],
    hashtags TEXT[],
    target_audience VARCHAR(255),
    platform VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    published_at TIMESTAMP,
    product_ids TEXT[],
    engagement_rate DECIMAL(5, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 고객 세그먼트
CREATE TABLE IF NOT EXISTS customer_segments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    customer_count INTEGER DEFAULT 0,
    avg_purchase_amount DECIMAL(15, 2),
    avg_purchase_frequency DECIMAL(5, 2),
    churn_risk DECIMAL(5, 4),
    is_active BOOLEAN DEFAULT TRUE,
    last_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 쿠폰
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    discount_value DECIMAL(5, 2) NOT NULL,
    discount_type VARCHAR(20) NOT NULL,
    min_purchase_amount DECIMAL(15, 2),
    max_discount_amount DECIMAL(15, 2),
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 시딩 캠페인
CREATE TABLE IF NOT EXISTS seeding_campaigns (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_ids TEXT[],
    target_count INTEGER,
    applied_count INTEGER DEFAULT 0,
    selected_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 소셜 멘션
CREATE TABLE IF NOT EXISTS social_mentions (
    id VARCHAR(50) PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    content TEXT,
    author VARCHAR(255),
    author_followers INTEGER,
    sentiment VARCHAR(20),
    keywords TEXT[],
    engagement_count INTEGER DEFAULT 0,
    reach_count INTEGER DEFAULT 0,
    mentioned_at TIMESTAMP,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 상세페이지
CREATE TABLE IF NOT EXISTS detail_pages (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft',
    html_content TEXT,
    mobile_optimized BOOLEAN DEFAULT FALSE,
    conversion_rate DECIMAL(5, 4),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 상세페이지 기획
CREATE TABLE IF NOT EXISTS detail_page_plans (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    target_keywords TEXT[],
    competitor_analysis JSONB,
    content_outline JSONB,
    visual_requirements JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 레이아웃 템플릿
CREATE TABLE IF NOT EXISTS layout_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    html_template TEXT NOT NULL,
    css_styles TEXT,
    preview_image VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AB 테스트
CREATE TABLE IF NOT EXISTS ab_tests (
    id VARCHAR(50) PRIMARY KEY,
    detail_page_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    variant_a JSONB NOT NULL,
    variant_b JSONB NOT NULL,
    traffic_split DECIMAL(3, 2) DEFAULT 0.5,
    status VARCHAR(50) DEFAULT 'draft',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    winner VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 개선 제안
CREATE TABLE IF NOT EXISTS improvement_suggestions (
    id VARCHAR(50) PRIMARY KEY,
    detail_page_id VARCHAR(50),
    type VARCHAR(50) NOT NULL,
    current_state TEXT,
    suggested_state TEXT,
    expected_impact VARCHAR(255),
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    applied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 촬영 스케줄
CREATE TABLE IF NOT EXISTS shooting_schedules (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    product_ids TEXT[],
    shoot_type VARCHAR(50),
    location VARCHAR(255),
    scheduled_date DATE,
    scheduled_time TIME,
    duration_hours DECIMAL(4, 2),
    photographer VARCHAR(255),
    stylist VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 촬영 결과
CREATE TABLE IF NOT EXISTS shooting_results (
    id VARCHAR(50) PRIMARY KEY,
    schedule_id VARCHAR(50) REFERENCES shooting_schedules(id),
    product_id VARCHAR(50),
    raw_files TEXT[],
    selected_files TEXT[],
    edited_files TEXT[],
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 미디어 자산
CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    duration DECIMAL(10, 2),
    thumbnail_path VARCHAR(500),
    tags TEXT[],
    product_ids TEXT[],
    usage_rights JSONB,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 벤더
CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    specialties TEXT[],
    rating DECIMAL(3, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 편집 작업
CREATE TABLE IF NOT EXISTS edit_jobs (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    source_assets TEXT[],
    output_specs JSONB,
    vendor_id VARCHAR(50) REFERENCES vendors(id),
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    output_files TEXT[],
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_platform ON ad_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_date ON ad_metrics(date);
CREATE INDEX IF NOT EXISTS idx_marketing_contents_status ON marketing_contents(status);
CREATE INDEX IF NOT EXISTS idx_social_mentions_platform ON social_mentions(platform);
CREATE INDEX IF NOT EXISTS idx_detail_pages_product ON detail_pages(product_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(type);
`;

// LANE 4 추가 테이블 정의
const LANE4_TABLES = `
-- LANE 4: Analytics & Growth 추가 테이블

-- 분석 대시보드
CREATE TABLE IF NOT EXISTS analytics_dashboards (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    owner_id VARCHAR(50),
    shared_with TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 분석 리포트
CREATE TABLE IF NOT EXISTS analytics_reports (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    date_range JSONB NOT NULL,
    metrics JSONB NOT NULL,
    insights TEXT[],
    recommendations TEXT[],
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 예측 모델
CREATE TABLE IF NOT EXISTS prediction_models (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_metric VARCHAR(100),
    features TEXT[],
    accuracy DECIMAL(5, 4),
    last_trained_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 위기 이벤트
CREATE TABLE IF NOT EXISTS crisis_events (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source VARCHAR(100),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    impact_assessment JSONB,
    response_actions JSONB,
    lessons_learned TEXT
);

-- 위기 알림
CREATE TABLE IF NOT EXISTS crisis_alerts (
    id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) REFERENCES crisis_events(id),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    recipients TEXT[],
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by VARCHAR(255)
);

-- 제품 아이디어
CREATE TABLE IF NOT EXISTS product_ideas (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(100),
    category VARCHAR(100),
    target_segment VARCHAR(100),
    estimated_demand INTEGER,
    estimated_margin DECIMAL(5, 2),
    competition_level VARCHAR(20),
    priority_score DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 제품 피드백
CREATE TABLE IF NOT EXISTS product_feedback (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50),
    source VARCHAR(50),
    content TEXT NOT NULL,
    sentiment VARCHAR(20),
    categories TEXT[],
    keywords TEXT[],
    actionable BOOLEAN DEFAULT FALSE,
    action_taken TEXT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 파트너십
CREATE TABLE IF NOT EXISTS partnerships (
    id VARCHAR(50) PRIMARY KEY,
    partner_name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(50) NOT NULL,
    contact_info JSONB,
    partnership_type VARCHAR(50),
    terms JSONB,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'prospect',
    revenue_share DECIMAL(5, 2),
    performance_metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- B2B 견적
CREATE TABLE IF NOT EXISTS b2b_quotes (
    id VARCHAR(50) PRIMARY KEY,
    partnership_id VARCHAR(50) REFERENCES partnerships(id),
    items JSONB NOT NULL,
    total_amount DECIMAL(15, 2),
    discount_rate DECIMAL(5, 2),
    valid_until DATE,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 멤버십 티어
CREATE TABLE IF NOT EXISTS membership_tiers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    min_points INTEGER NOT NULL,
    benefits JSONB NOT NULL,
    point_multiplier DECIMAL(3, 2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 포인트 트랜잭션
CREATE TABLE IF NOT EXISTS point_transactions (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50),
    type VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER,
    description VARCHAR(500),
    reference_id VARCHAR(50),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VIP 고객
CREATE TABLE IF NOT EXISTS vip_customers (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) UNIQUE NOT NULL,
    tier VARCHAR(50) NOT NULL,
    total_spent DECIMAL(15, 2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_purchase_at TIMESTAMP,
    assigned_manager VARCHAR(255),
    special_notes TEXT,
    preferences JSONB
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_crisis_events_status ON crisis_events(status);
CREATE INDEX IF NOT EXISTS idx_crisis_events_severity ON crisis_events(severity);
CREATE INDEX IF NOT EXISTS idx_product_ideas_status ON product_ideas(status);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships(status);
CREATE INDEX IF NOT EXISTS idx_point_transactions_customer ON point_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_vip_customers_tier ON vip_customers(tier);
`;

async function runMigrations() {
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Supabase 연결 중...');
    await client.connect();
    console.log('✅ 연결 성공!\n');

    // LANE 2 마이그레이션
    console.log('📄 LANE 2 테이블 생성 중...');
    await client.query(LANE2_TABLES);
    console.log('✅ LANE 2 완료!\n');

    // LANE 4 마이그레이션
    console.log('📄 LANE 4 테이블 생성 중...');
    await client.query(LANE4_TABLES);
    console.log('✅ LANE 4 완료!\n');

    // 최종 테이블 목록 확인
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📋 최종 테이블 목록 (' + tablesResult.rows.length + '개):');
    console.log('─'.repeat(50));

    const columns = 3;
    const rows = Math.ceil(tablesResult.rows.length / columns);
    for (let i = 0; i < rows; i++) {
      let line = '';
      for (let j = 0; j < columns; j++) {
        const idx = i + j * rows;
        if (idx < tablesResult.rows.length) {
          const num = (idx + 1).toString().padStart(2);
          const name = tablesResult.rows[idx].table_name.padEnd(25);
          line += `${num}. ${name} `;
        }
      }
      console.log(line);
    }

    console.log('\n🎉 모든 마이그레이션 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.detail) console.error('   상세:', error.detail);
  } finally {
    await client.end();
    console.log('\n🔌 연결 종료');
  }
}

runMigrations();
