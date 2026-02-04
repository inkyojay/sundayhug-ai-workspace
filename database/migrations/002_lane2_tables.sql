-- ============================================================================
-- LANE 2: Marketing & Content 마이그레이션
-- 썬데이허그 AI 에이전트 시스템
--
-- 생성일: 2025-01-26
-- 작성자: AI Agent
-- 설명: Marketing Agent, DetailPage Agent, Media Agent 관련 테이블 생성
-- ============================================================================

-- ============================================================================
-- 1. MARKETING AGENT 관련 테이블
-- ============================================================================

-- 1.1 광고 캠페인
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- naver, google, meta, kakao, coupang
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, active, paused, completed
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

-- 1.2 광고 성과 지표 (일별)
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

-- 1.3 마케팅 콘텐츠
CREATE TABLE IF NOT EXISTS marketing_contents (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- card_news, blog, sns_post, video_short
    title VARCHAR(500) NOT NULL,
    body TEXT,
    images TEXT[],
    hashtags TEXT[],
    target_audience VARCHAR(255),
    platform VARCHAR(50), -- instagram, blog, kakao, etc
    status VARCHAR(50) DEFAULT 'draft', -- draft, review, approved, published
    scheduled_at TIMESTAMP,
    published_at TIMESTAMP,
    product_ids TEXT[],
    engagement_rate DECIMAL(5, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 고객 세그먼트
CREATE TABLE IF NOT EXISTS customer_segments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL, -- 세그먼트 조건
    customer_count INTEGER DEFAULT 0,
    avg_purchase_amount DECIMAL(15, 2),
    avg_purchase_frequency DECIMAL(5, 2),
    churn_risk DECIMAL(5, 4),
    is_active BOOLEAN DEFAULT TRUE,
    last_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.5 프로모션
CREATE TABLE IF NOT EXISTS promotions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- discount, bundle, flash_sale, seasonal
    description TEXT,
    discount_value DECIMAL(5, 2) NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- percent, fixed
    min_purchase_amount DECIMAL(15, 2),
    max_discount_amount DECIMAL(15, 2),
    product_ids TEXT[],
    category_ids TEXT[],
    channels TEXT[], -- naver, coupang, etc
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    participant_count INTEGER DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    total_discount DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.6 쿠폰
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- percent, fixed
    discount_value DECIMAL(5, 2) NOT NULL,
    max_discount DECIMAL(15, 2),
    min_purchase_amount DECIMAL(15, 2),
    max_usage_count INTEGER,
    used_count INTEGER DEFAULT 0,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.7 인플루언서
CREATE TABLE IF NOT EXISTS influencers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- instagram, youtube, blog, tiktok
    handle VARCHAR(255),
    tier VARCHAR(50), -- mega, macro, micro, nano
    follower_count INTEGER,
    engagement_rate DECIMAL(5, 4),
    categories TEXT[],
    contact JSONB,
    portfolio_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'prospect', -- prospect, contacted, negotiating, active, completed
    rating DECIMAL(3, 2),
    collaboration_history JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.8 시딩 캠페인
CREATE TABLE IF NOT EXISTS seeding_campaigns (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    products JSONB NOT NULL, -- [{productId, quantity}]
    influencer_ids TEXT[],
    shipping_date TIMESTAMP,
    content_deadline TIMESTAMP,
    hashtags TEXT[],
    guidelines TEXT,
    status VARCHAR(50) DEFAULT 'planning', -- planning, active, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.9 소셜 멘션
CREATE TABLE IF NOT EXISTS social_mentions (
    id VARCHAR(50) PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    author VARCHAR(255),
    content TEXT NOT NULL,
    sentiment VARCHAR(20), -- positive, negative, neutral
    sentiment_score DECIMAL(5, 4),
    keywords TEXT[],
    is_brand_mention BOOLEAN DEFAULT FALSE,
    is_product_mention BOOLEAN DEFAULT FALSE,
    product_ids TEXT[],
    engagement_count INTEGER DEFAULT 0,
    source_url VARCHAR(1000),
    posted_at TIMESTAMP,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. DETAIL PAGE AGENT 관련 테이블
-- ============================================================================

-- 2.1 상세페이지
CREATE TABLE IF NOT EXISTS detail_pages (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, review, approved, published, archived
    type VARCHAR(50) DEFAULT 'standard', -- standard, premium, custom
    version INTEGER DEFAULT 1,
    sections JSONB NOT NULL, -- [{id, type, title, content, order, visible}]
    channels TEXT[], -- naver, coupang, etc
    seo_info JSONB, -- {metaTitle, metaDescription, keywords}
    ab_test_group VARCHAR(10), -- A, B
    metrics JSONB, -- 성과 지표
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 상세페이지 기획안
CREATE TABLE IF NOT EXISTS detail_page_plans (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    product_analysis JSONB NOT NULL, -- 상품 분석 결과
    target_analysis JSONB NOT NULL, -- 타겟 분석 결과
    competitor_benchmark JSONB, -- 경쟁사 벤치마킹
    recommended_structure TEXT[], -- 권장 섹션 구조
    key_messages TEXT[],
    differentiators TEXT[],
    tone_and_manner TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.3 레이아웃 템플릿
CREATE TABLE IF NOT EXISTS layout_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- standard, premium, custom
    sections TEXT[], -- 섹션 유형 배열
    preview_url VARCHAR(500),
    suitable_categories TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.4 A/B 테스트
CREATE TABLE IF NOT EXISTS ab_tests (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    test_element VARCHAR(50) NOT NULL, -- headline, cta, images, layout
    variant_a JSONB NOT NULL, -- {pageId, trafficPercent}
    variant_b JSONB NOT NULL,
    goal_metric VARCHAR(50) NOT NULL, -- conversion_rate, add_to_cart, bounce_rate, time_on_page
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'running', -- running, paused, completed
    results JSONB, -- 테스트 결과
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.5 개선 제안
CREATE TABLE IF NOT EXISTS improvement_suggestions (
    id VARCHAR(50) PRIMARY KEY,
    page_id VARCHAR(50) REFERENCES detail_pages(id),
    area VARCHAR(50) NOT NULL, -- headline, cta, images, copy, layout
    issue TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact VARCHAR(20), -- high, medium, low
    rationale TEXT,
    priority INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- pending, implemented, rejected
    implemented_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. MEDIA AGENT 관련 테이블
-- ============================================================================

-- 3.1 촬영 스케줄
CREATE TABLE IF NOT EXISTS shooting_schedules (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- studio, location, model, product, video
    status VARCHAR(50) DEFAULT 'planning', -- planning, scheduled, in_progress, completed, cancelled
    scheduled_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    location VARCHAR(500),
    product_ids TEXT[],
    vendor_id VARCHAR(50),
    concept TEXT,
    reference_images TEXT[],
    expected_shots INTEGER,
    budget DECIMAL(15, 2),
    actual_cost DECIMAL(15, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 촬영 결과
CREATE TABLE IF NOT EXISTS shooting_results (
    id SERIAL PRIMARY KEY,
    schedule_id VARCHAR(50) REFERENCES shooting_schedules(id),
    completed_at TIMESTAMP NOT NULL,
    total_shots INTEGER,
    selected_shots INTEGER,
    asset_ids TEXT[],
    actual_cost DECIMAL(15, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.3 미디어 에셋
CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(50) PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL, -- image, video, gif, vector, document
    status VARCHAR(50) DEFAULT 'raw', -- raw, editing, review, approved, published, archived
    url VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000),
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- 영상 길이 (초)
    mime_type VARCHAR(100),
    product_ids TEXT[],
    shooting_schedule_id VARCHAR(50),
    tags TEXT[],
    purposes TEXT[], -- detail_main, thumbnail, sns_feed, ad, etc
    metadata JSONB, -- EXIF 등 메타데이터
    version INTEGER DEFAULT 1,
    original_asset_id VARCHAR(50), -- 편집본인 경우 원본 참조
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.4 외주업체
CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- photographer, videographer, studio, model_agency, graphic_designer, editor
    contact JSONB, -- {phone, email, kakao}
    portfolio_url VARCHAR(500),
    specialties TEXT[],
    average_price DECIMAL(15, 2),
    rating DECIMAL(3, 2),
    collaboration_history JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.5 편집 작업
CREATE TABLE IF NOT EXISTS edit_jobs (
    id VARCHAR(50) PRIMARY KEY,
    source_asset_id VARCHAR(50) REFERENCES media_assets(id),
    result_asset_id VARCHAR(50),
    edit_type VARCHAR(50) NOT NULL, -- resize, crop, color_correction, retouch, background_removal, watermark, subtitle, trim, thumbnail
    parameters JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- ============================================================================
-- 4. 인덱스 생성
-- ============================================================================

-- 광고 캠페인
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_platform ON ad_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_date ON ad_metrics(date);

-- 마케팅 콘텐츠
CREATE INDEX IF NOT EXISTS idx_marketing_contents_type ON marketing_contents(type);
CREATE INDEX IF NOT EXISTS idx_marketing_contents_status ON marketing_contents(status);

-- 프로모션
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);

-- 인플루언서
CREATE INDEX IF NOT EXISTS idx_influencers_platform ON influencers(platform);
CREATE INDEX IF NOT EXISTS idx_influencers_tier ON influencers(tier);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON influencers(status);

-- 소셜 멘션
CREATE INDEX IF NOT EXISTS idx_social_mentions_platform ON social_mentions(platform);
CREATE INDEX IF NOT EXISTS idx_social_mentions_sentiment ON social_mentions(sentiment);
CREATE INDEX IF NOT EXISTS idx_social_mentions_posted_at ON social_mentions(posted_at);

-- 상세페이지
CREATE INDEX IF NOT EXISTS idx_detail_pages_product ON detail_pages(product_id);
CREATE INDEX IF NOT EXISTS idx_detail_pages_status ON detail_pages(status);

-- A/B 테스트
CREATE INDEX IF NOT EXISTS idx_ab_tests_product ON ab_tests(product_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);

-- 촬영 스케줄
CREATE INDEX IF NOT EXISTS idx_shooting_schedules_date ON shooting_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_shooting_schedules_status ON shooting_schedules(status);

-- 미디어 에셋
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(type);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets(status);
CREATE INDEX IF NOT EXISTS idx_media_assets_products ON media_assets USING GIN(product_ids);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON media_assets USING GIN(tags);

-- 편집 작업
CREATE INDEX IF NOT EXISTS idx_edit_jobs_status ON edit_jobs(status);
CREATE INDEX IF NOT EXISTS idx_edit_jobs_source ON edit_jobs(source_asset_id);

-- ============================================================================
-- 5. 트리거 함수 (updated_at 자동 갱신)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
CREATE TRIGGER update_ad_campaigns_updated_at
    BEFORE UPDATE ON ad_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_contents_updated_at
    BEFORE UPDATE ON marketing_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_influencers_updated_at
    BEFORE UPDATE ON influencers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seeding_campaigns_updated_at
    BEFORE UPDATE ON seeding_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_detail_pages_updated_at
    BEFORE UPDATE ON detail_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at
    BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shooting_schedules_updated_at
    BEFORE UPDATE ON shooting_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_assets_updated_at
    BEFORE UPDATE ON media_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================

COMMENT ON TABLE ad_campaigns IS 'LANE 2: 광고 캠페인 정보';
COMMENT ON TABLE ad_metrics IS 'LANE 2: 광고 성과 지표 (일별)';
COMMENT ON TABLE marketing_contents IS 'LANE 2: 마케팅 콘텐츠';
COMMENT ON TABLE customer_segments IS 'LANE 2: 고객 세그먼트';
COMMENT ON TABLE promotions IS 'LANE 2: 프로모션';
COMMENT ON TABLE coupons IS 'LANE 2: 쿠폰';
COMMENT ON TABLE influencers IS 'LANE 2: 인플루언서';
COMMENT ON TABLE seeding_campaigns IS 'LANE 2: 시딩 캠페인';
COMMENT ON TABLE social_mentions IS 'LANE 2: 소셜 멘션';
COMMENT ON TABLE detail_pages IS 'LANE 2: 상세페이지';
COMMENT ON TABLE detail_page_plans IS 'LANE 2: 상세페이지 기획안';
COMMENT ON TABLE layout_templates IS 'LANE 2: 레이아웃 템플릿';
COMMENT ON TABLE ab_tests IS 'LANE 2: A/B 테스트';
COMMENT ON TABLE improvement_suggestions IS 'LANE 2: 개선 제안';
COMMENT ON TABLE shooting_schedules IS 'LANE 2: 촬영 스케줄';
COMMENT ON TABLE shooting_results IS 'LANE 2: 촬영 결과';
COMMENT ON TABLE media_assets IS 'LANE 2: 미디어 에셋';
COMMENT ON TABLE vendors IS 'LANE 2: 외주업체';
COMMENT ON TABLE edit_jobs IS 'LANE 2: 편집 작업';
