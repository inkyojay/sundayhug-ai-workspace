const { Client } = require('pg');

const connectionString = 'postgresql://postgres.unybnarbrlmteamwvdql:Wpdlzhvm0339@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

// LANE 3: Management & Compliance 테이블
const LANE3_TABLES = `
-- ============================================================================
-- LANE 3: Management & Compliance 테이블
-- Accounting, Legal, IP, BizSupport 에이전트용
-- ============================================================================

-- 1. ACCOUNTING 관련 추가 테이블

-- 비용 내역
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    description TEXT,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'KRW',
    vendor_name VARCHAR(255),
    invoice_number VARCHAR(100),
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50),
    receipt_url VARCHAR(500),
    is_tax_deductible BOOLEAN DEFAULT TRUE,
    tax_amount DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'pending',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 세금 신고
CREATE TABLE IF NOT EXISTS tax_filings (
    id VARCHAR(50) PRIMARY KEY,
    tax_type VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    filing_deadline DATE NOT NULL,
    taxable_amount DECIMAL(15, 2),
    tax_amount DECIMAL(15, 2),
    deductions DECIMAL(15, 2),
    final_tax DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'draft',
    filed_at TIMESTAMP,
    documents JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 수익 분석
CREATE TABLE IF NOT EXISTS profit_reports (
    id VARCHAR(50) PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_revenue DECIMAL(15, 2),
    total_cost DECIMAL(15, 2),
    gross_profit DECIMAL(15, 2),
    operating_expenses DECIMAL(15, 2),
    net_profit DECIMAL(15, 2),
    profit_margin DECIMAL(5, 4),
    breakdown_by_channel JSONB,
    breakdown_by_product JSONB,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. LEGAL 관련 추가 테이블

-- 광고 심의
CREATE TABLE IF NOT EXISTS ad_reviews (
    id VARCHAR(50) PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    content_id VARCHAR(50),
    content_text TEXT,
    content_images TEXT[],
    review_type VARCHAR(50) NOT NULL,
    issues_found JSONB,
    risk_level VARCHAR(20),
    recommendations TEXT[],
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_at TIMESTAMP,
    approved BOOLEAN,
    reviewer_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 규정 준수 체크리스트
CREATE TABLE IF NOT EXISTS compliance_checks (
    id VARCHAR(50) PRIMARY KEY,
    check_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(50),
    checklist_items JSONB NOT NULL,
    passed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    total_items INTEGER NOT NULL,
    compliance_score DECIMAL(5, 2),
    issues JSONB,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_check_date DATE
);

-- 법적 문서/계약 이력
CREATE TABLE IF NOT EXISTS legal_documents (
    id VARCHAR(50) PRIMARY KEY,
    document_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    file_path VARCHAR(500),
    related_entity_type VARCHAR(50),
    related_entity_id VARCHAR(50),
    effective_date DATE,
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. IP (지재권) 관련 테이블

-- 지재권 등록
CREATE TABLE IF NOT EXISTS intellectual_properties (
    id VARCHAR(50) PRIMARY KEY,
    ip_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    application_number VARCHAR(100),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    filed_date DATE,
    registered_date DATE,
    expiry_date DATE,
    renewal_date DATE,
    cost DECIMAL(15, 2),
    documents JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 침해 모니터링
CREATE TABLE IF NOT EXISTS ip_infringements (
    id VARCHAR(50) PRIMARY KEY,
    ip_id VARCHAR(50) REFERENCES intellectual_properties(id),
    infringement_type VARCHAR(50) NOT NULL,
    platform VARCHAR(100),
    infringer_info JSONB,
    discovered_url VARCHAR(1000),
    evidence_urls TEXT[],
    severity VARCHAR(20),
    status VARCHAR(50) DEFAULT 'detected',
    action_taken TEXT,
    resolved_at TIMESTAMP,
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 침해 대응 이력
CREATE TABLE IF NOT EXISTS ip_actions (
    id VARCHAR(50) PRIMARY KEY,
    infringement_id VARCHAR(50) REFERENCES ip_infringements(id),
    action_type VARCHAR(100) NOT NULL,
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    result TEXT,
    cost DECIMAL(15, 2),
    documents JSONB
);

-- 4. BIZ SUPPORT (정부 지원사업) 관련 테이블

-- 지원사업 정보
CREATE TABLE IF NOT EXISTS support_programs (
    id VARCHAR(50) PRIMARY KEY,
    program_name VARCHAR(500) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    description TEXT,
    eligibility_criteria JSONB,
    support_amount VARCHAR(255),
    support_type VARCHAR(50),
    application_start DATE,
    application_end DATE,
    announcement_date DATE,
    source_url VARCHAR(1000),
    contact_info JSONB,
    is_applicable BOOLEAN DEFAULT FALSE,
    applicability_score DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 지원사업 신청
CREATE TABLE IF NOT EXISTS support_applications (
    id VARCHAR(50) PRIMARY KEY,
    program_id VARCHAR(50) REFERENCES support_programs(id),
    application_date DATE,
    status VARCHAR(50) DEFAULT 'preparing',
    required_documents JSONB,
    submitted_documents JSONB,
    submission_deadline DATE,
    submitted_at TIMESTAMP,
    result VARCHAR(50),
    result_announced_at TIMESTAMP,
    approved_amount DECIMAL(15, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 지원사업 사후관리
CREATE TABLE IF NOT EXISTS support_post_management (
    id VARCHAR(50) PRIMARY KEY,
    application_id VARCHAR(50) REFERENCES support_applications(id),
    task_type VARCHAR(100) NOT NULL,
    due_date DATE,
    description TEXT,
    required_documents JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_tax_filings_type ON tax_filings(tax_type);
CREATE INDEX IF NOT EXISTS idx_ad_reviews_status ON ad_reviews(status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_type ON compliance_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_ip_type ON intellectual_properties(ip_type);
CREATE INDEX IF NOT EXISTS idx_ip_infringements_status ON ip_infringements(status);
CREATE INDEX IF NOT EXISTS idx_support_programs_status ON support_programs(status);
CREATE INDEX IF NOT EXISTS idx_support_applications_status ON support_applications(status);
`;

// LANE 5: Integration & Orchestration 테이블
const LANE5_TABLES = `
-- ============================================================================
-- LANE 5: Integration & Orchestration 테이블
-- Monitoring, Scheduler, Workflow 관련
-- ============================================================================

-- 1. 모니터링 관련 테이블

-- 시스템 메트릭
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 4) NOT NULL,
    metric_unit VARCHAR(50),
    tags JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 시스템 알림
CREATE TABLE IF NOT EXISTS system_alerts (
    id VARCHAR(50) PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    source VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    message TEXT,
    metric_name VARCHAR(100),
    threshold_value DECIMAL(15, 4),
    actual_value DECIMAL(15, 4),
    status VARCHAR(50) DEFAULT 'active',
    acknowledged_at TIMESTAMP,
    acknowledged_by VARCHAR(255),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 헬스체크 결과
CREATE TABLE IF NOT EXISTS health_checks (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_time_ms INTEGER,
    details JSONB,
    error_message TEXT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 에이전트 실행 로그
CREATE TABLE IF NOT EXISTS agent_executions (
    id VARCHAR(50) PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    agent_name VARCHAR(100),
    execution_type VARCHAR(50),
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    caller_agent_id VARCHAR(50)
);

-- 2. 스케줄러 관련 테이블

-- 스케줄 정의
CREATE TABLE IF NOT EXISTS schedules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
    agent_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    action_params JSONB,
    is_enabled BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    run_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 스케줄 실행 이력
CREATE TABLE IF NOT EXISTS schedule_runs (
    id VARCHAR(50) PRIMARY KEY,
    schedule_id VARCHAR(50) REFERENCES schedules(id),
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    result JSONB,
    error_message TEXT
);

-- 작업 큐 (고급)
CREATE TABLE IF NOT EXISTS job_queue_advanced (
    id VARCHAR(50) PRIMARY KEY,
    queue_name VARCHAR(100) NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,
    retry_delay_ms INTEGER DEFAULT 1000,
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 워크플로우 관련 테이블

-- 워크플로우 실행
CREATE TABLE IF NOT EXISTS workflow_executions (
    id VARCHAR(50) PRIMARY KEY,
    workflow_id VARCHAR(50) NOT NULL,
    workflow_name VARCHAR(255),
    trigger_type VARCHAR(50),
    trigger_data JSONB,
    status VARCHAR(50) DEFAULT 'running',
    current_step_id VARCHAR(50),
    context JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    error_message TEXT
);

-- 워크플로우 단계 실행
CREATE TABLE IF NOT EXISTS workflow_step_executions (
    id VARCHAR(50) PRIMARY KEY,
    execution_id VARCHAR(50) REFERENCES workflow_executions(id),
    step_id VARCHAR(50) NOT NULL,
    step_name VARCHAR(255),
    agent_id VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- 워크플로우 이벤트
CREATE TABLE IF NOT EXISTS workflow_events (
    id VARCHAR(50) PRIMARY KEY,
    execution_id VARCHAR(50) REFERENCES workflow_executions(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 통합 관련 테이블

-- 외부 API 호출 로그
CREATE TABLE IF NOT EXISTS api_call_logs (
    id VARCHAR(50) PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    response_time_ms INTEGER,
    error_message TEXT,
    agent_id VARCHAR(50),
    called_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 웹훅 수신 로그
CREATE TABLE IF NOT EXISTS webhook_logs (
    id VARCHAR(50) PRIMARY KEY,
    source VARCHAR(100) NOT NULL,
    event_type VARCHAR(100),
    payload JSONB NOT NULL,
    headers JSONB,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    error_message TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_time ON system_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_service ON health_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_service ON api_call_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
`;

async function runMigrations() {
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Supabase 연결 중...');
    await client.connect();
    console.log('✅ 연결 성공!\n');

    // LANE 3 마이그레이션
    console.log('📄 LANE 3 테이블 생성 중 (Accounting, Legal, IP, BizSupport)...');
    await client.query(LANE3_TABLES);
    console.log('✅ LANE 3 완료!\n');

    // LANE 5 마이그레이션
    console.log('📄 LANE 5 테이블 생성 중 (Monitoring, Scheduler, Workflow)...');
    await client.query(LANE5_TABLES);
    console.log('✅ LANE 5 완료!\n');

    // 최종 테이블 목록 확인
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📋 최종 테이블 목록 (' + tablesResult.rows.length + '개):');
    console.log('─'.repeat(60));

    // 카테고리별로 그룹화
    const tables = tablesResult.rows.map(r => r.table_name);

    // LANE별로 분류
    const lane3Tables = ['expenses', 'tax_filings', 'profit_reports', 'ad_reviews',
                         'compliance_checks', 'legal_documents', 'intellectual_properties',
                         'ip_infringements', 'ip_actions', 'support_programs',
                         'support_applications', 'support_post_management'];

    const lane5Tables = ['system_metrics', 'system_alerts', 'health_checks',
                         'agent_executions', 'schedules', 'schedule_runs',
                         'job_queue_advanced', 'workflow_executions',
                         'workflow_step_executions', 'workflow_events',
                         'api_call_logs', 'webhook_logs'];

    console.log('\n🆕 LANE 3 신규 테이블:');
    lane3Tables.forEach(t => {
      if (tables.includes(t)) console.log('  ✅ ' + t);
    });

    console.log('\n🆕 LANE 5 신규 테이블:');
    lane5Tables.forEach(t => {
      if (tables.includes(t)) console.log('  ✅ ' + t);
    });

    console.log('\n🎉 모든 마이그레이션 완료!');
    console.log('📊 총 테이블 수: ' + tablesResult.rows.length + '개');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.detail) console.error('   상세:', error.detail);
  } finally {
    await client.end();
    console.log('\n🔌 연결 종료');
  }
}

runMigrations();
