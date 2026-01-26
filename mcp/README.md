# MCP (Model Context Protocol) 연결 설정 가이드

썬데이허그 AI 에이전트 시스템의 MCP 연결 설정 문서입니다.

## 개요

MCP(Model Context Protocol)는 AI 에이전트가 외부 서비스와 통신하기 위한 표준화된 프로토콜입니다. 이 설정을 통해 각 에이전트는 필요한 외부 API에 안전하게 접근할 수 있습니다.

## 파일 구조

```
mcp/
├── connections.json    # MCP 연결 설정 파일
├── servers/            # 커스텀 MCP 서버 구현
└── README.md           # 본 문서
```

## 연결 카테고리

### 1. 핵심 연결 (Core)

| 서비스 | 설명 | 인증 방식 |
|--------|------|-----------|
| Supabase | PostgreSQL 데이터베이스, 실시간 구독 | Bearer Token |
| Notion | 문서 관리, 지식베이스 | Bearer Token |
| Slack | 팀 알림, 내부 커뮤니케이션 | OAuth2 |
| Kakao | 알림톡/친구톡 발송 | Bearer Token |

### 2. 이커머스 플랫폼 (E-commerce)

| 서비스 | 설명 | 인증 방식 |
|--------|------|-----------|
| Coupang Wing | 쿠팡 오픈마켓 API | HMAC-SHA256 |
| Naver Commerce | 네이버 스마트스토어 API | OAuth2 |
| Cafe24 | 자사몰 API | OAuth2 |

### 3. 마케팅 플랫폼 (Marketing)

| 서비스 | 설명 | 인증 방식 |
|--------|------|-----------|
| Meta Business | Facebook/Instagram 광고 | OAuth2 |
| Naver Search Ads | 네이버 검색광고 | HMAC-SHA256 |
| Google Services | Analytics, Sheets, Ads | OAuth2 (Service Account) |

### 4. 유틸리티 (Utilities)

| 서비스 | 설명 | 인증 방식 |
|--------|------|-----------|
| OpenAI | DALL-E 이미지 생성 | Bearer Token |
| Delivery | 택배사 배송 조회 | Bearer Token |

## 환경 변수 설정

`.env` 파일에 다음 환경 변수를 설정해야 합니다:

### 핵심 서비스

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Notion
NOTION_API_KEY=secret_xxxxxxxxxxxx
NOTION_KNOWLEDGE_BASE_ID=database-id-for-knowledge-base
NOTION_FAQ_DATABASE_ID=database-id-for-faq
NOTION_PRODUCT_INFO_ID=database-id-for-product-info

# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_ORDERS_CHANNEL=C0123456789
SLACK_CS_CHANNEL=C0123456790
SLACK_MARKETING_CHANNEL=C0123456791
SLACK_INVENTORY_CHANNEL=C0123456792
SLACK_GENERAL_CHANNEL=C0123456793

# Kakao
KAKAO_API_KEY=your-kakao-api-key
KAKAO_SENDER_KEY=your-sender-key
```

### 이커머스 플랫폼

```bash
# Coupang
COUPANG_ACCESS_KEY=your-access-key
COUPANG_SECRET_KEY=your-secret-key
COUPANG_VENDOR_ID=your-vendor-id
COUPANG_WEBHOOK_URL=https://your-domain.com/webhooks/coupang

# Naver Commerce
NAVER_CLIENT_ID=your-client-id
NAVER_CLIENT_SECRET=your-client-secret
NAVER_ACCOUNT_ID=your-account-id
NAVER_CHANNEL_ID=your-channel-id
NAVER_WEBHOOK_URL=https://your-domain.com/webhooks/naver

# Cafe24
CAFE24_MALL_ID=your-mall-id
CAFE24_CLIENT_ID=your-client-id
CAFE24_CLIENT_SECRET=your-client-secret
CAFE24_WEBHOOK_URL=https://your-domain.com/webhooks/cafe24
```

### 마케팅 플랫폼

```bash
# Meta (Facebook/Instagram)
META_ACCESS_TOKEN=your-access-token
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
META_AD_ACCOUNT_ID=act_123456789
META_PAGE_ID=your-page-id
META_INSTAGRAM_ID=your-instagram-business-id
META_PIXEL_ID=your-pixel-id

# Naver Search Ads
NAVER_ADS_ACCESS_KEY=your-access-key
NAVER_ADS_SECRET_KEY=your-secret-key
NAVER_ADS_CUSTOMER_ID=your-customer-id

# Google
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
GA4_PROPERTY_ID=123456789
GOOGLE_ADS_CUSTOMER_ID=123-456-7890
GOOGLE_SHEET_SALES_ID=spreadsheet-id-for-sales
GOOGLE_SHEET_INVENTORY_ID=spreadsheet-id-for-inventory
GOOGLE_SHEET_MARKETING_ID=spreadsheet-id-for-marketing
```

### 유틸리티

```bash
# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# 택배사 API
CJ_LOGISTICS_API_KEY=your-cj-api-key
LOTTE_LOGISTICS_API_KEY=your-lotte-api-key
HANJIN_API_KEY=your-hanjin-api-key
LOGEN_API_KEY=your-logen-api-key
EPOST_API_KEY=your-epost-api-key
SWEET_TRACKER_API_KEY=your-sweet-tracker-api-key
DELIVERY_WEBHOOK_URL=https://your-domain.com/webhooks/delivery
```

## 에이전트별 권한

각 에이전트는 역할에 따라 접근 가능한 연결이 제한됩니다:

| 에이전트 | 접근 가능 연결 | 권한 |
|----------|---------------|------|
| order-agent | supabase, coupang, naver, cafe24, delivery, slack, kakao | 읽기/쓰기 |
| cs-agent | supabase, notion, coupang, naver, cafe24, delivery, slack, kakao, openai | 읽기/쓰기 |
| marketing-agent | supabase, notion, meta, naver_ads, google, slack, kakao, openai | 읽기/쓰기 |
| analytics-agent | supabase, notion, meta, naver_ads, google, slack | 읽기 전용 |
| inventory-agent | supabase, coupang, naver, cafe24, slack | 읽기/쓰기 |

## API Rate Limits

각 서비스별 API 호출 제한을 준수해야 합니다:

| 서비스 | 제한 |
|--------|------|
| Supabase | 100 req/sec, burst 200 |
| Notion | 3 req/sec, burst 10 |
| Slack | 50 req/min, burst 20 |
| Coupang | 60 req/min, 일 10,000건 |
| Naver Commerce | 10 req/sec, 일 50,000건 |
| Cafe24 | 5 req/sec, 일 30,000건 |
| Meta | 200 req/hour, 일 5,000건 |
| Naver Ads | 10 req/sec, 일 50,000건 |
| Google Analytics | 600 req/min, 일 50,000건 |
| OpenAI | 50 req/min, 이미지 5개/min |

## 전역 설정

### 타임아웃
- 기본 타임아웃: 30초

### 재시도 정책
- 최대 재시도: 3회
- 백오프 배수: 2
- 초기 지연: 1초

### 캐싱
- 기본 TTL: 300초 (5분)
- 최대 엔트리: 1,000개

### Circuit Breaker
- 실패 임계값: 5회
- 복구 타임아웃: 60초

## 인증 방식별 설정

### Bearer Token
```json
{
  "auth": {
    "type": "bearer",
    "token_env": "SERVICE_API_KEY"
  }
}
```

### OAuth2
```json
{
  "auth": {
    "type": "oauth2",
    "client_id_env": "SERVICE_CLIENT_ID",
    "client_secret_env": "SERVICE_CLIENT_SECRET",
    "token_url": "https://api.service.com/oauth/token",
    "grant_type": "client_credentials"
  }
}
```

### HMAC
```json
{
  "auth": {
    "type": "hmac",
    "access_key_env": "SERVICE_ACCESS_KEY",
    "secret_key_env": "SERVICE_SECRET_KEY",
    "algorithm": "HmacSHA256"
  }
}
```

## 사용 예시

### TypeScript에서 MCP 연결 사용

```typescript
import { MCPClient } from '@anthropic/mcp-client';
import connections from './connections.json';

// MCP 클라이언트 초기화
const mcp = new MCPClient(connections);

// Coupang 주문 조회
const orders = await mcp.use('coupang').tool('get_orders', {
  vendorId: process.env.COUPANG_VENDOR_ID,
  status: 'ACCEPT',
  createdAtFrom: '2024-01-01',
  createdAtTo: '2024-01-31'
});

// Naver 상품 재고 업데이트
await mcp.use('naver').tool('update_inventory', {
  productNo: '12345',
  stockQuantity: 100
});

// Slack 알림 발송
await mcp.use('slack').tool('send_message', {
  channel: process.env.SLACK_ORDERS_CHANNEL,
  text: '새로운 주문이 접수되었습니다!'
});
```

### 에이전트에서 사용

```typescript
class OrderAgent {
  private mcp: MCPClient;

  constructor(mcp: MCPClient) {
    this.mcp = mcp;
  }

  async processNewOrders() {
    // 각 플랫폼에서 신규 주문 조회
    const [coupangOrders, naverOrders, cafe24Orders] = await Promise.all([
      this.mcp.use('coupang').tool('get_orders', { status: 'ACCEPT' }),
      this.mcp.use('naver').tool('get_orders', { status: 'PAYED' }),
      this.mcp.use('cafe24').tool('get_orders', { status: 'N10' })
    ]);

    // 주문 처리 로직...
  }
}
```

## 보안 주의사항

1. **환경 변수 보호**: `.env` 파일을 절대 Git에 커밋하지 마세요.
2. **토큰 갱신**: OAuth2 토큰은 만료 전에 자동으로 갱신되도록 설정하세요.
3. **로깅 마스킹**: 민감한 필드(password, token, secret, key, authorization)는 로그에서 자동으로 마스킹됩니다.
4. **최소 권한 원칙**: 각 에이전트에는 필요한 최소한의 권한만 부여하세요.

## 문제 해결

### 연결 실패 시
1. 환경 변수가 올바르게 설정되었는지 확인
2. API 키/토큰이 유효한지 확인
3. Rate limit에 도달하지 않았는지 확인
4. Circuit breaker가 열려있지 않은지 확인

### 인증 오류 시
1. 인증 방식이 올바른지 확인 (bearer, oauth2, hmac)
2. OAuth2의 경우 토큰 갱신 필요 여부 확인
3. HMAC의 경우 서명 알고리즘 확인

## 참고 자료

- [Model Context Protocol 공식 문서](https://modelcontextprotocol.io)
- [Coupang Wing API 문서](https://developers.coupang.com)
- [Naver Commerce API 문서](https://developer.naver.com/docs/commerce)
- [Cafe24 API 문서](https://developers.cafe24.com)
- [Meta Marketing API 문서](https://developers.facebook.com/docs/marketing-apis)
- [Naver Search Ads API 문서](https://naver.github.io/searchad-apidoc)
