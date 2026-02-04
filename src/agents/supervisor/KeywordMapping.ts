/**
 * 썬데이허그 AI 에이전트 시스템 - 키워드 매핑
 *
 * 에이전트별 트리거 키워드와 담당 영역을 정의합니다.
 * 의도 분류기(IntentClassifier)에서 이 매핑을 사용합니다.
 */

import {
  AgentInfo,
  IntentCategory,
  KeywordMapping,
  AmbiguousKeywordRule,
  ContextCondition,
  EntityType,
  CompositeWorkflow,
  PriorityLevel,
} from './types';

// =============================================================================
// 에이전트 정보 정의
// =============================================================================

/**
 * 전체 에이전트 정보
 */
export const AGENT_REGISTRY: AgentInfo[] = [
  // -------------------------------------------------------------------------
  // LANE 1: Core Operations
  // -------------------------------------------------------------------------
  {
    id: 'order-agent',
    name: '주문 관리 에이전트',
    description: '주문의 상태 변경, 취소, 환불 승인, 배송지 수정 등 주문 라이프사이클 관리',
    categories: [
      IntentCategory.ORDER_CREATE,
      IntentCategory.ORDER_CANCEL,
      IntentCategory.ORDER_MODIFY,
      IntentCategory.ORDER_REFUND,
    ],
    keywords: [
      '주문', '결제', '취소', '주문번호', '배송지변경', '배송지수정',
      '주문취소', '주문확인', '주문상태', '주문처리', '결제완료',
      'ORD-', '송장', '운송장', '발송처리', '출고',
    ],
    priority: 10,
    scope: '주문의 "상태 변경" - 취소, 환불 승인, 배송지 수정, 출고 처리',
    subAgentIds: ['order-sync-subagent', 'order-process-subagent', 'order-cancel-subagent'],
    enabled: true,
  },
  {
    id: 'cs-agent',
    name: 'CS 관리 에이전트',
    description: '고객 문의 응대, 불만 처리, 교환/반품 접수',
    categories: [
      IntentCategory.CS_INQUIRY,
      IntentCategory.CS_COMPLAINT,
      IntentCategory.CS_EXCHANGE,
      IntentCategory.CS_RETURN,
    ],
    keywords: [
      '문의', '질문', '상담', '불만', '클레임', '컴플레인',
      '교환', '반품', '반품요청', '교환요청', '고객', '응대',
      '답변', '회신', '톡톡', '문의답변', '상담원', '고객센터',
    ],
    priority: 9,
    scope: '고객과의 "대화" - 문의 답변, 불만 처리, 교환/반품 안내',
    subAgentIds: ['cs-response-subagent', 'cs-template-subagent', 'cs-escalation-subagent'],
    enabled: true,
  },
  {
    id: 'inventory-agent',
    name: '재고 관리 에이전트',
    description: '재고 수량 관리, 입출고, 재고 동기화, 품절 알림',
    categories: [
      IntentCategory.INVENTORY_CHECK,
      IntentCategory.INVENTORY_UPDATE,
      IntentCategory.INVENTORY_ALERT,
    ],
    keywords: [
      '재고', '입고', '출고', '품절', 'SKU', '재고확인',
      '재고수량', '재고부족', '재고조정', '입고예정', '안전재고',
      '재고동기화', '재고현황', '재고알림',
    ],
    priority: 8,
    scope: '재고의 "수량 변경" - 입고, 출고, 재고 조정, 동기화',
    subAgentIds: ['inventory-sync-subagent', 'inventory-alert-subagent', 'inventory-forecast-subagent'],
    enabled: true,
  },
  {
    id: 'logistics-agent',
    name: '물류 관리 에이전트',
    description: '배송 추적, 택배사 연동, 출고 관리',
    categories: [
      IntentCategory.LOGISTICS_SHIPPING,
      IntentCategory.LOGISTICS_WAREHOUSE,
      IntentCategory.ORDER_TRACKING,
    ],
    keywords: [
      '배송', '택배', '배송추적', '배송조회', '배송현황',
      'CJ대한통운', '롯데택배', '한진택배', '우체국', '로젠',
      '배송중', '배송완료', '배송지연', '출고지', '창고',
    ],
    priority: 7,
    scope: '배송의 "추적 및 관리" - 배송 조회, 택배사 연동, 출고 처리',
    subAgentIds: ['logistics-tracking-subagent', 'logistics-courier-subagent'],
    enabled: true,
  },

  // -------------------------------------------------------------------------
  // LANE 2: Marketing
  // -------------------------------------------------------------------------
  {
    id: 'marketing-agent',
    name: '마케팅 에이전트',
    description: '마케팅 캠페인, 프로모션, 광고 관리',
    categories: [
      IntentCategory.MARKETING_CAMPAIGN,
      IntentCategory.MARKETING_ANALYSIS,
    ],
    keywords: [
      '마케팅', '광고', '프로모션', '할인', '쿠폰', '이벤트',
      '캠페인', '타겟팅', '광고비', 'ROAS', 'CTR', 'CPC',
      '페이스북광고', '인스타광고', '네이버광고', '키워드광고',
    ],
    priority: 6,
    scope: '마케팅 "기획 및 실행" - 캠페인 생성, 광고 관리, 프로모션',
    subAgentIds: ['marketing-campaign-subagent', 'marketing-seo-subagent', 'marketing-ad-subagent'],
    enabled: true,
  },
  {
    id: 'detail-page-agent',
    name: '상세페이지 에이전트',
    description: '상품 상세페이지 관리, 이미지 최적화, 콘텐츠 생성',
    categories: [
      IntentCategory.MARKETING_CONTENT,
    ],
    keywords: [
      '상세페이지', '상품페이지', '이미지', '썸네일', '배너',
      '상품설명', '상품정보', '콘텐츠', '카피라이팅', '디자인',
      '상품등록', '이미지수정', '페이지수정',
    ],
    priority: 5,
    scope: '상품 "콘텐츠 관리" - 상세페이지, 이미지, 설명 작성',
    subAgentIds: ['detail-image-subagent', 'detail-content-subagent', 'detail-seo-subagent'],
    enabled: true,
  },
  {
    id: 'media-agent',
    name: '미디어 에이전트',
    description: 'SNS 콘텐츠, 영상, 이미지 자산 관리',
    categories: [
      IntentCategory.MARKETING_CONTENT,
    ],
    keywords: [
      'SNS', '인스타그램', '페이스북', '유튜브', '틱톡',
      '포스팅', '콘텐츠', '영상', '릴스', '스토리',
      '해시태그', '팔로워', '좋아요', '댓글',
    ],
    priority: 4,
    scope: 'SNS "콘텐츠 관리" - 포스팅, 영상, 소셜 미디어',
    subAgentIds: ['media-sns-subagent', 'media-video-subagent', 'media-image-subagent'],
    enabled: true,
  },

  // -------------------------------------------------------------------------
  // LANE 3: Management
  // -------------------------------------------------------------------------
  {
    id: 'accounting-agent',
    name: '회계 관리 에이전트',
    description: '매출 기록, 정산, 세금, 비용 관리',
    categories: [
      IntentCategory.ACCOUNTING_SETTLEMENT,
      IntentCategory.ACCOUNTING_REPORT,
      IntentCategory.ACCOUNTING_TAX,
    ],
    keywords: [
      '정산', '매출', '비용', '세금', '부가세', '회계',
      '정산금', '수수료', '입금', '출금', '거래내역',
      '세금계산서', '현금영수증', '경비', '손익', '재무',
    ],
    priority: 6,
    scope: '돈의 "기록" - 매출 기록, 정산 처리, 세금 관리',
    subAgentIds: ['accounting-settlement-subagent', 'accounting-tax-subagent', 'accounting-report-subagent'],
    enabled: true,
  },
  {
    id: 'legal-agent',
    name: '법무 에이전트',
    description: '계약, 약관, 법률 준수 관리',
    categories: [],
    keywords: [
      '계약', '약관', '법률', '규정', '준수', '컴플라이언스',
      '개인정보', 'GDPR', '소비자보호', '전자상거래',
      '이용약관', '개인정보처리방침', '반품규정',
    ],
    priority: 5,
    scope: '법률 "준수 관리" - 계약, 약관, 규정 확인',
    subAgentIds: ['legal-contract-subagent', 'legal-compliance-subagent'],
    enabled: true,
  },
  {
    id: 'ip-agent',
    name: '지식재산권 에이전트',
    description: '상표, 특허, 디자인권 관리',
    categories: [],
    keywords: [
      '상표', '특허', '디자인권', '저작권', '브랜드',
      '지식재산', '침해', '상표등록', '특허출원',
    ],
    priority: 3,
    scope: '지식재산 "보호 관리" - 상표, 특허, 저작권',
    subAgentIds: ['ip-trademark-subagent', 'ip-monitoring-subagent'],
    enabled: true,
  },
  {
    id: 'biz-support-agent',
    name: '경영지원 에이전트',
    description: '일반 경영 지원, 문서 관리, 행정',
    categories: [],
    keywords: [
      '경영', '행정', '문서', '보고서', '일정', '미팅',
      '회의', '기획', '전략', '계획', '예산',
    ],
    priority: 3,
    scope: '경영 "지원 업무" - 문서, 일정, 행정 처리',
    subAgentIds: ['biz-document-subagent', 'biz-schedule-subagent'],
    enabled: true,
  },

  // -------------------------------------------------------------------------
  // LANE 4: Analytics
  // -------------------------------------------------------------------------
  {
    id: 'analytics-agent',
    name: '분석 에이전트',
    description: '매출 분석, 트렌드 분석, 리포트 생성',
    categories: [
      IntentCategory.ANALYTICS_SALES,
      IntentCategory.ANALYTICS_CUSTOMER,
      IntentCategory.ANALYTICS_PRODUCT,
    ],
    keywords: [
      '분석', '통계', '리포트', '대시보드', '지표',
      '매출분석', '판매분석', '트렌드', 'KPI', '성과',
      '일간', '주간', '월간', '연간', '비교분석',
    ],
    priority: 5,
    scope: '데이터 "분석" - 매출, 고객, 상품 분석 및 리포트',
    subAgentIds: ['analytics-sales-subagent', 'analytics-customer-subagent', 'analytics-product-subagent'],
    enabled: true,
  },
  {
    id: 'crisis-agent',
    name: '위기관리 에이전트',
    description: '이슈 감지, 위기 대응, 평판 관리',
    categories: [],
    keywords: [
      '위기', '이슈', '긴급', '장애', '사고', '리콜',
      '평판', '악플', '악성리뷰', '언론', '기사',
      '대응', '위기관리', '긴급대응',
    ],
    priority: 10,
    scope: '위기 "감지 및 대응" - 이슈 모니터링, 긴급 대응',
    subAgentIds: ['crisis-monitoring-subagent', 'crisis-response-subagent'],
    enabled: true,
  },
  {
    id: 'product-dev-agent',
    name: '상품개발 에이전트',
    description: '신상품 기획, 시장조사, 상품 개선',
    categories: [
      IntentCategory.ANALYTICS_PRODUCT,
    ],
    keywords: [
      '상품개발', '신상품', '기획', '시장조사', '트렌드분석',
      '상품기획', 'R&D', '개선', '피드백', '리뷰분석',
    ],
    priority: 4,
    scope: '상품 "개발 및 기획" - 신상품, 시장조사, 개선점 도출',
    subAgentIds: ['product-research-subagent', 'product-planning-subagent'],
    enabled: true,
  },
  {
    id: 'partnership-agent',
    name: '파트너십 에이전트',
    description: '협력사 관리, 입점 제안, 제휴',
    categories: [],
    keywords: [
      '파트너', '협력', '제휴', '입점', '협업',
      '공급업체', '벤더', 'B2B', '도매', '계약',
    ],
    priority: 3,
    scope: '파트너 "관계 관리" - 협력사, 제휴, 입점',
    subAgentIds: ['partnership-vendor-subagent', 'partnership-proposal-subagent'],
    enabled: true,
  },
  {
    id: 'loyalty-agent',
    name: '고객로열티 에이전트',
    description: '고객 등급, 포인트, 멤버십 관리',
    categories: [
      IntentCategory.ANALYTICS_CUSTOMER,
    ],
    keywords: [
      '회원', '등급', '포인트', '적립', '멤버십',
      'VIP', '단골', '재구매', '충성고객', '쿠폰발급',
    ],
    priority: 4,
    scope: '고객 "로열티 관리" - 등급, 포인트, 혜택',
    subAgentIds: ['loyalty-tier-subagent', 'loyalty-point-subagent', 'loyalty-campaign-subagent'],
    enabled: true,
  },
];

// =============================================================================
// 키워드별 에이전트 매핑
// =============================================================================

/**
 * 키워드-에이전트 매핑 테이블
 * 빠른 검색을 위한 역인덱스
 */
export const KEYWORD_AGENT_MAP: Map<string, KeywordMapping[]> = new Map();

// 매핑 테이블 초기화
AGENT_REGISTRY.forEach((agent) => {
  agent.keywords.forEach((keyword) => {
    const normalizedKeyword = keyword.toLowerCase();
    const existing = KEYWORD_AGENT_MAP.get(normalizedKeyword) || [];
    existing.push({
      agentId: agent.id,
      keywords: [keyword],
      priority: agent.priority,
      category: agent.categories[0] || IntentCategory.UNKNOWN,
    });
    KEYWORD_AGENT_MAP.set(normalizedKeyword, existing);
  });
});

// =============================================================================
// 중복 키워드 처리 규칙
// =============================================================================

/**
 * 애매한 키워드 처리 규칙
 * 여러 에이전트가 처리할 수 있는 키워드에 대한 컨텍스트 기반 라우팅 규칙
 */
export const AMBIGUOUS_KEYWORD_RULES: AmbiguousKeywordRule[] = [
  // "환불" 키워드
  {
    keyword: '환불',
    contextRules: [
      {
        condition: { type: 'entity_exists', entityType: EntityType.ORDER_ID },
        agentId: 'order-agent',
        priority: 10,
      },
      {
        condition: { type: 'keyword_present', keyword: '문의' },
        agentId: 'cs-agent',
        priority: 8,
      },
      {
        condition: { type: 'keyword_present', keyword: '정산' },
        agentId: 'accounting-agent',
        priority: 7,
      },
    ],
    defaultAgentId: 'order-agent',
  },

  // "배송" 키워드
  {
    keyword: '배송',
    contextRules: [
      {
        condition: { type: 'entity_exists', entityType: EntityType.TRACKING_NUMBER },
        agentId: 'logistics-agent',
        priority: 10,
      },
      {
        condition: { type: 'keyword_present', keyword: '문의' },
        agentId: 'cs-agent',
        priority: 8,
      },
      {
        condition: { type: 'keyword_present', keyword: '출고' },
        agentId: 'order-agent',
        priority: 7,
      },
      {
        condition: { type: 'keyword_present', keyword: '지연' },
        agentId: 'logistics-agent',
        priority: 9,
      },
    ],
    defaultAgentId: 'logistics-agent',
  },

  // "재고" 키워드
  {
    keyword: '재고',
    contextRules: [
      {
        condition: { type: 'entity_exists', entityType: EntityType.PRODUCT_ID },
        agentId: 'inventory-agent',
        priority: 10,
      },
      {
        condition: { type: 'keyword_present', keyword: '환불' },
        agentId: 'inventory-agent',
        priority: 9,
      },
      {
        condition: { type: 'keyword_present', keyword: '분석' },
        agentId: 'analytics-agent',
        priority: 7,
      },
    ],
    defaultAgentId: 'inventory-agent',
  },

  // "고객" 키워드
  {
    keyword: '고객',
    contextRules: [
      {
        condition: { type: 'keyword_present', keyword: '문의' },
        agentId: 'cs-agent',
        priority: 10,
      },
      {
        condition: { type: 'keyword_present', keyword: '분석' },
        agentId: 'analytics-agent',
        priority: 9,
      },
      {
        condition: { type: 'keyword_present', keyword: '등급' },
        agentId: 'loyalty-agent',
        priority: 9,
      },
      {
        condition: { type: 'keyword_present', keyword: '불만' },
        agentId: 'cs-agent',
        priority: 10,
      },
    ],
    defaultAgentId: 'cs-agent',
  },

  // "분석" 키워드
  {
    keyword: '분석',
    contextRules: [
      {
        condition: { type: 'keyword_present', keyword: '매출' },
        agentId: 'analytics-agent',
        priority: 10,
      },
      {
        condition: { type: 'keyword_present', keyword: '마케팅' },
        agentId: 'marketing-agent',
        priority: 9,
      },
      {
        condition: { type: 'keyword_present', keyword: '상품' },
        agentId: 'product-dev-agent',
        priority: 8,
      },
      {
        condition: { type: 'keyword_present', keyword: '고객' },
        agentId: 'analytics-agent',
        priority: 9,
      },
    ],
    defaultAgentId: 'analytics-agent',
  },

  // "취소" 키워드
  {
    keyword: '취소',
    contextRules: [
      {
        condition: { type: 'entity_exists', entityType: EntityType.ORDER_ID },
        agentId: 'order-agent',
        priority: 10,
      },
      {
        condition: { type: 'keyword_present', keyword: '광고' },
        agentId: 'marketing-agent',
        priority: 9,
      },
      {
        condition: { type: 'keyword_present', keyword: '캠페인' },
        agentId: 'marketing-agent',
        priority: 9,
      },
    ],
    defaultAgentId: 'order-agent',
  },
];

// =============================================================================
// 우선순위 키워드 (긴급도 부스트)
// =============================================================================

/**
 * 긴급도 부스트 키워드
 */
export const PRIORITY_BOOST_KEYWORDS: Map<string, PriorityLevel> = new Map([
  // P0 - 즉시 처리
  ['긴급', PriorityLevel.P0_CRITICAL],
  ['장애', PriorityLevel.P0_CRITICAL],
  ['시스템오류', PriorityLevel.P0_CRITICAL],
  ['전체중단', PriorityLevel.P0_CRITICAL],
  ['해킹', PriorityLevel.P0_CRITICAL],
  ['보안', PriorityLevel.P0_CRITICAL],

  // P1 - 높은 우선순위
  ['불만', PriorityLevel.P1_HIGH],
  ['클레임', PriorityLevel.P1_HIGH],
  ['컴플레인', PriorityLevel.P1_HIGH],
  ['파손', PriorityLevel.P1_HIGH],
  ['오배송', PriorityLevel.P1_HIGH],
  ['미배송', PriorityLevel.P1_HIGH],
  ['지연', PriorityLevel.P1_HIGH],
  ['품절', PriorityLevel.P1_HIGH],

  // P2 - 중간 우선순위
  ['교환', PriorityLevel.P2_MEDIUM],
  ['반품', PriorityLevel.P2_MEDIUM],
  ['환불', PriorityLevel.P2_MEDIUM],
  ['취소', PriorityLevel.P2_MEDIUM],
]);

// =============================================================================
// 복합 워크플로우 정의
// =============================================================================

/**
 * 사전 정의된 복합 워크플로우
 */
export const PREDEFINED_WORKFLOWS: CompositeWorkflow[] = [
  // 환불 전체 프로세스
  {
    id: 'workflow-full-refund',
    name: '환불 전체 프로세스',
    triggers: ['환불 처리', '환불해줘', '환불 진행', '전액 환불'],
    triggerIntents: [IntentCategory.ORDER_REFUND],
    steps: [
      {
        stepId: 'step-1-cancel',
        name: '주문 취소',
        agentId: 'order-agent',
        action: 'cancelOrder',
        outputMapping: { orderId: 'orderId', items: 'refundItems' },
        required: true,
        maxRetries: 2,
      },
      {
        stepId: 'step-2-restore',
        name: '재고 복구',
        agentId: 'inventory-agent',
        action: 'restoreStock',
        inputMapping: { items: 'refundItems' },
        required: true,
        maxRetries: 2,
      },
      {
        stepId: 'step-3-record',
        name: '환불 회계 기록',
        agentId: 'accounting-agent',
        action: 'recordRefund',
        inputMapping: { orderId: 'orderId' },
        required: true,
        maxRetries: 2,
      },
      {
        stepId: 'step-4-notify',
        name: '고객 알림',
        agentId: 'cs-agent',
        action: 'sendRefundNotification',
        inputMapping: { orderId: 'orderId' },
        required: false,
        maxRetries: 1,
      },
    ],
    errorStrategy: 'stop',
    timeout: 300000, // 5분
    description: '주문 취소 → 재고 복구 → 회계 기록 → 고객 알림',
  },

  // 교환 프로세스
  {
    id: 'workflow-exchange',
    name: '교환 프로세스',
    triggers: ['교환 처리', '교환해줘', '상품 교환'],
    triggerIntents: [IntentCategory.CS_EXCHANGE],
    steps: [
      {
        stepId: 'step-1-receive',
        name: '반품 접수',
        agentId: 'cs-agent',
        action: 'receiveReturn',
        outputMapping: { returnId: 'returnId', productId: 'productId' },
        required: true,
        maxRetries: 2,
      },
      {
        stepId: 'step-2-check-stock',
        name: '교환 재고 확인',
        agentId: 'inventory-agent',
        action: 'checkStock',
        inputMapping: { productId: 'productId' },
        outputMapping: { hasStock: 'hasStock' },
        required: true,
        maxRetries: 1,
      },
      {
        stepId: 'step-3-create-order',
        name: '교환 주문 생성',
        agentId: 'order-agent',
        action: 'createExchangeOrder',
        inputMapping: { returnId: 'returnId', productId: 'productId' },
        condition: {
          type: 'result_value',
          previousStepId: 'step-2-check-stock',
          field: 'hasStock',
          operator: 'eq',
          value: true,
        },
        required: true,
        maxRetries: 2,
      },
      {
        stepId: 'step-4-ship',
        name: '교환품 발송',
        agentId: 'logistics-agent',
        action: 'shipExchange',
        inputMapping: { orderId: 'exchangeOrderId' },
        required: true,
        maxRetries: 2,
      },
    ],
    errorStrategy: 'stop',
    timeout: 300000,
    description: '반품 접수 → 재고 확인 → 교환 주문 → 발송',
  },

  // 일일 정산 프로세스
  {
    id: 'workflow-daily-settlement',
    name: '일일 정산 프로세스',
    triggers: ['일일 정산', '오늘 정산', '정산 처리'],
    triggerIntents: [IntentCategory.ACCOUNTING_SETTLEMENT],
    steps: [
      {
        stepId: 'step-1-sync-orders',
        name: '주문 동기화',
        agentId: 'order-agent',
        action: 'syncDailyOrders',
        outputMapping: { orders: 'todayOrders' },
        parallel: true,
        parallelGroupId: 'sync-group',
        required: true,
        maxRetries: 3,
      },
      {
        stepId: 'step-2-sync-inventory',
        name: '재고 동기화',
        agentId: 'inventory-agent',
        action: 'syncInventory',
        parallel: true,
        parallelGroupId: 'sync-group',
        required: true,
        maxRetries: 3,
      },
      {
        stepId: 'step-3-calculate',
        name: '정산 계산',
        agentId: 'accounting-agent',
        action: 'calculateSettlement',
        inputMapping: { orders: 'todayOrders' },
        required: true,
        maxRetries: 2,
      },
      {
        stepId: 'step-4-report',
        name: '리포트 생성',
        agentId: 'analytics-agent',
        action: 'generateDailyReport',
        required: false,
        maxRetries: 1,
      },
    ],
    errorStrategy: 'skip',
    timeout: 600000, // 10분
    description: '주문/재고 동기화 → 정산 계산 → 리포트',
  },

  // 위기 대응 프로세스
  {
    id: 'workflow-crisis-response',
    name: '위기 대응 프로세스',
    triggers: ['긴급 대응', '위기 발생', '이슈 대응'],
    triggerIntents: [],
    steps: [
      {
        stepId: 'step-1-assess',
        name: '상황 파악',
        agentId: 'crisis-agent',
        action: 'assessSituation',
        outputMapping: { severity: 'severity', type: 'crisisType' },
        required: true,
        maxRetries: 1,
      },
      {
        stepId: 'step-2-pause',
        name: '관련 작업 일시 중지',
        agentId: 'order-agent',
        action: 'pauseRelatedOperations',
        condition: {
          type: 'result_value',
          previousStepId: 'step-1-assess',
          field: 'severity',
          operator: 'gte',
          value: 3,
        },
        required: false,
        maxRetries: 1,
      },
      {
        stepId: 'step-3-notify-team',
        name: '팀 알림',
        agentId: 'crisis-agent',
        action: 'notifyTeam',
        required: true,
        maxRetries: 3,
      },
      {
        stepId: 'step-4-customer-comm',
        name: '고객 커뮤니케이션',
        agentId: 'cs-agent',
        action: 'sendCrisisNotification',
        required: false,
        maxRetries: 2,
      },
    ],
    errorStrategy: 'retry',
    timeout: 180000, // 3분
    description: '상황 파악 → 작업 중지 → 팀 알림 → 고객 소통',
  },

  // 신규 주문 처리 프로세스
  {
    id: 'workflow-new-order',
    name: '신규 주문 처리',
    triggers: ['새 주문', '신규 주문', '주문 들어옴'],
    triggerIntents: [IntentCategory.ORDER_CREATE],
    steps: [
      {
        stepId: 'step-1-validate',
        name: '주문 검증',
        agentId: 'order-agent',
        action: 'validateOrder',
        outputMapping: { isValid: 'isValid', orderId: 'orderId' },
        required: true,
        maxRetries: 2,
      },
      {
        stepId: 'step-2-check-inventory',
        name: '재고 확인',
        agentId: 'inventory-agent',
        action: 'checkAndReserve',
        inputMapping: { orderId: 'orderId' },
        required: true,
        maxRetries: 2,
      },
      {
        stepId: 'step-3-process',
        name: '주문 확정',
        agentId: 'order-agent',
        action: 'confirmOrder',
        inputMapping: { orderId: 'orderId' },
        required: true,
        maxRetries: 2,
      },
      {
        stepId: 'step-4-prepare-shipping',
        name: '출고 준비',
        agentId: 'logistics-agent',
        action: 'prepareShipment',
        inputMapping: { orderId: 'orderId' },
        required: true,
        maxRetries: 2,
      },
    ],
    errorStrategy: 'stop',
    timeout: 120000, // 2분
    description: '주문 검증 → 재고 확인 → 확정 → 출고 준비',
  },
];

// =============================================================================
// 헬퍼 함수
// =============================================================================

/**
 * 에이전트 ID로 에이전트 정보 조회
 */
export function getAgentInfo(agentId: string): AgentInfo | undefined {
  return AGENT_REGISTRY.find((agent) => agent.id === agentId);
}

/**
 * 의도 카테고리로 에이전트 목록 조회
 */
export function getAgentsByCategory(category: IntentCategory): AgentInfo[] {
  return AGENT_REGISTRY.filter((agent) => agent.categories.includes(category));
}

/**
 * 키워드로 매칭되는 에이전트 목록 조회
 */
export function getAgentsByKeyword(keyword: string): KeywordMapping[] {
  const normalizedKeyword = keyword.toLowerCase();
  return KEYWORD_AGENT_MAP.get(normalizedKeyword) || [];
}

/**
 * 애매한 키워드 규칙 조회
 */
export function getAmbiguousRule(keyword: string): AmbiguousKeywordRule | undefined {
  return AMBIGUOUS_KEYWORD_RULES.find(
    (rule) => rule.keyword.toLowerCase() === keyword.toLowerCase()
  );
}

/**
 * 워크플로우 트리거로 워크플로우 조회
 */
export function getWorkflowByTrigger(trigger: string): CompositeWorkflow | undefined {
  const normalizedTrigger = trigger.toLowerCase();
  return PREDEFINED_WORKFLOWS.find((workflow) =>
    workflow.triggers.some((t) => normalizedTrigger.includes(t.toLowerCase()))
  );
}

/**
 * 우선순위 부스트 확인
 */
export function getPriorityBoost(text: string): PriorityLevel | undefined {
  const normalizedText = text.toLowerCase();
  for (const [keyword, priority] of PRIORITY_BOOST_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      return priority;
    }
  }
  return undefined;
}
