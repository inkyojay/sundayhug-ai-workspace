# 썬데이허그 AI 에이전트 시스템 - 개발 계획서

> 현재 프레임워크 코드를 실제 작동하는 시스템으로 변환하기 위한 단계별 개발 계획

## 목차

1. [현재 상태 분석](#현재-상태-분석)
2. [Phase 0: 기본 환경 설정](#phase-0-기본-환경-설정)
3. [Phase 1: API 서비스 레이어 구축](#phase-1-api-서비스-레이어-구축)
4. [Phase 2: 에이전트와 서비스 연동](#phase-2-에이전트와-서비스-연동)
5. [Phase 3: 알림 서비스 구현](#phase-3-알림-서비스-구현)
6. [Phase 4: 실행 진입점 및 테스트](#phase-4-실행-진입점-및-테스트)
7. [파일 구조 변경 사항](#파일-구조-변경-사항)
8. [우선순위 및 일정](#우선순위-및-일정)

---

## 현재 상태 분석

### 완성된 부분 ✅
- `src/agents/base/` - BaseAgent, SubAgent 추상 클래스
- `src/agents/*/` - 17개 메인 에이전트 + 53개 서브에이전트 구조
- `src/types/` - 타입 정의
- `src/utils/` - 로거, Supabase 헬퍼, 알림 유틸리티 (껍데기)
- `src/workflows/` - 워크플로우 엔진
- `src/scheduler/` - 스케줄러

### 미구현 부분 ❌
- 외부 API 연동 (쿠팡, 네이버, Cafe24)
- 알림 서비스 실제 구현 (카카오, Slack)
- 실행 진입점 (main entry point)
- 환경 변수 설정
- 테스트 코드

---

## Phase 0: 기본 환경 설정

### 0.1 패키지 설치

```bash
# 1. 기존 의존성 설치
npm install

# 2. 누락된 필수 패키지 추가
npm install uuid axios crypto-js
npm install @types/uuid --save-dev

# 3. 테스트 프레임워크 (선택)
npm install vitest @types/node --save-dev
```

### 0.2 package.json 수정

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "build": "tsc",
    "test": "vitest",
    "test:watch": "vitest watch",
    "lint": "eslint src --ext .ts",
    "sync": "tsx scripts/sync/index.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.93.1",
    "axios": "^1.6.0",
    "crypto-js": "^4.2.0",
    "dotenv": "^17.2.3",
    "gray-matter": "^4.0.3",
    "pg": "^8.17.2",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/crypto-js": "^4.2.0",
    "@types/node": "^25.0.10",
    "@types/uuid": "^9.0.0",
    "husky": "^9.1.7",
    "vitest": "^1.0.0"
  }
}
```

### 0.3 환경 변수 파일 생성

**파일: `.env.example`**

```env
# ===========================================
# 썬데이허그 AI 에이전트 시스템 환경 변수
# ===========================================

# ----- 데이터베이스 -----
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ----- 쿠팡 Wing API -----
COUPANG_VENDOR_ID=your-vendor-id
COUPANG_ACCESS_KEY=your-access-key
COUPANG_SECRET_KEY=your-secret-key

# ----- 네이버 Commerce API -----
NAVER_CLIENT_ID=your-client-id
NAVER_CLIENT_SECRET=your-client-secret
NAVER_ACCOUNT_ID=your-account-id

# ----- Cafe24 API -----
CAFE24_MALL_ID=your-mall-id
CAFE24_CLIENT_ID=your-client-id
CAFE24_CLIENT_SECRET=your-client-secret

# ----- 카카오 알림톡 -----
KAKAO_API_KEY=your-api-key
KAKAO_SENDER_KEY=your-sender-key

# ----- Slack -----
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_ORDERS_CHANNEL=C0123456789
SLACK_CS_CHANNEL=C0123456789

# ----- 택배 조회 -----
SWEET_TRACKER_API_KEY=your-api-key

# ----- 시스템 설정 -----
NODE_ENV=development
LOG_LEVEL=info
```

### 0.4 TypeScript 설정 확인

**파일: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@agents/*": ["src/agents/*"],
      "@services/*": ["src/services/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Phase 1: API 서비스 레이어 구축

### 1.1 폴더 구조 생성

```
src/services/
├── index.ts                    # 서비스 통합 내보내기
├── base/
│   └── BaseAPIService.ts       # API 서비스 기본 클래스
├── ecommerce/
│   ├── index.ts
│   ├── CoupangService.ts       # 쿠팡 Wing API
│   ├── NaverService.ts         # 네이버 Commerce API
│   └── Cafe24Service.ts        # Cafe24 API
├── notification/
│   ├── index.ts
│   ├── KakaoService.ts         # 카카오 알림톡
│   └── SlackService.ts         # Slack 알림
└── delivery/
    ├── index.ts
    └── DeliveryService.ts      # 택배 조회 통합
```

### 1.2 BaseAPIService 구현

**파일: `src/services/base/BaseAPIService.ts`**

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Logger } from '../../utils/logger';

export interface APIServiceConfig {
  name: string;
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  statusCode?: number;
}

export abstract class BaseAPIService {
  protected client: AxiosInstance;
  protected logger: Logger;
  protected config: APIServiceConfig;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config: APIServiceConfig) {
    this.config = config;
    this.retryAttempts = config.retryAttempts ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.logger = new Logger(`Service:${config.name}`);

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
    });

    this.setupInterceptors();
  }

  /**
   * 인터셉터 설정 (하위 클래스에서 오버라이드 가능)
   */
  protected setupInterceptors(): void {
    // 요청 인터셉터
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request error', error);
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error('Response error', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 인증 헤더 생성 (하위 클래스에서 구현)
   */
  protected abstract getAuthHeaders(): Record<string, string>;

  /**
   * GET 요청
   */
  protected async get<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>('GET', endpoint, { params, ...config });
  }

  /**
   * POST 요청
   */
  protected async post<T>(
    endpoint: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>('POST', endpoint, { data, ...config });
  }

  /**
   * PUT 요청
   */
  protected async put<T>(
    endpoint: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>('PUT', endpoint, { data, ...config });
  }

  /**
   * PATCH 요청
   */
  protected async patch<T>(
    endpoint: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>('PATCH', endpoint, { data, ...config });
  }

  /**
   * DELETE 요청
   */
  protected async delete<T>(
    endpoint: string,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>('DELETE', endpoint, config);
  }

  /**
   * 공통 요청 처리 (재시도 로직 포함)
   */
  private async request<T>(
    method: string,
    endpoint: string,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response: AxiosResponse<T> = await this.client.request({
          method,
          url: endpoint,
          headers: {
            ...this.getAuthHeaders(),
            ...config?.headers,
          },
          ...config,
        });

        return {
          success: true,
          data: response.data,
          statusCode: response.status,
        };
      } catch (error: any) {
        lastError = error;

        // 재시도 불가능한 에러인 경우
        if (error.response?.status && error.response.status < 500) {
          return {
            success: false,
            error: {
              code: `HTTP_${error.response.status}`,
              message: error.response.data?.message || error.message,
              details: error.response.data,
            },
            statusCode: error.response.status,
          };
        }

        // 재시도 가능한 경우
        if (attempt < this.retryAttempts) {
          this.logger.warn(`Request failed, retrying (${attempt}/${this.retryAttempts})...`);
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: lastError?.message || 'Unknown error',
      },
    };
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 1.3 쿠팡 서비스 구현

**파일: `src/services/ecommerce/CoupangService.ts`**

```typescript
import CryptoJS from 'crypto-js';
import { BaseAPIService, APIResponse } from '../base/BaseAPIService';

// 쿠팡 주문 타입
export interface CoupangOrder {
  orderId: number;
  shipmentBoxId: number;
  vendorItemId: number;
  vendorItemName: string;
  shippingCount: number;
  status: string;
  orderedAt: string;
  orderer: {
    name: string;
    email: string;
    phone: string;
  };
  receiver: {
    name: string;
    phone: string;
    address: string;
    postCode: string;
  };
  paidPrice: number;
}

export interface CoupangOrderListResponse {
  code: number;
  message: string;
  data: CoupangOrder[];
  nextToken?: string;
}

export class CoupangService extends BaseAPIService {
  private accessKey: string;
  private secretKey: string;
  private vendorId: string;

  constructor() {
    super({
      name: 'Coupang',
      baseURL: 'https://api-gateway.coupang.com',
      timeout: 30000,
      retryAttempts: 3,
    });

    this.accessKey = process.env.COUPANG_ACCESS_KEY || '';
    this.secretKey = process.env.COUPANG_SECRET_KEY || '';
    this.vendorId = process.env.COUPANG_VENDOR_ID || '';

    if (!this.accessKey || !this.secretKey || !this.vendorId) {
      this.logger.warn('Coupang API credentials not configured');
    }
  }

  /**
   * HMAC-SHA256 서명 생성
   */
  private generateSignature(method: string, path: string, datetime: string): string {
    const message = `${datetime}${method}${path}`.split('?')[0];
    const hmac = CryptoJS.HmacSHA256(message, this.secretKey);
    return CryptoJS.enc.Hex.stringify(hmac);
  }

  /**
   * 인증 헤더 생성
   */
  protected getAuthHeaders(): Record<string, string> {
    const datetime = new Date().toISOString().split('.')[0] + 'Z';
    // 동적으로 경로에 따라 서명 생성 필요 - 실제 요청에서 처리
    return {
      'Content-Type': 'application/json;charset=UTF-8',
    };
  }

  /**
   * 인증 헤더 생성 (경로 포함)
   */
  private getAuthHeadersForPath(method: string, path: string): Record<string, string> {
    const datetime = new Date().toISOString().split('.')[0] + 'Z';
    const signature = this.generateSignature(method, path, datetime);

    return {
      'Content-Type': 'application/json;charset=UTF-8',
      'Authorization': `CEA algorithm=HmacSHA256, access-key=${this.accessKey}, signed-date=${datetime}, signature=${signature}`,
    };
  }

  // ===========================================================================
  // 주문 관련 API
  // ===========================================================================

  /**
   * 주문 목록 조회
   */
  async getOrders(params: {
    status?: 'ACCEPT' | 'INSTRUCT' | 'DEPARTURE' | 'DELIVERING' | 'DELIVERED';
    createdAtFrom?: string;
    createdAtTo?: string;
    nextToken?: string;
    maxPerPage?: number;
  }): Promise<APIResponse<CoupangOrderListResponse>> {
    const path = `/v2/providers/openapi/apis/api/v4/vendors/${this.vendorId}/ordersheets`;

    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.createdAtFrom) queryParams.append('createdAtFrom', params.createdAtFrom);
    if (params.createdAtTo) queryParams.append('createdAtTo', params.createdAtTo);
    if (params.nextToken) queryParams.append('nextToken', params.nextToken);
    if (params.maxPerPage) queryParams.append('maxPerPage', params.maxPerPage.toString());

    const fullPath = queryParams.toString() ? `${path}?${queryParams}` : path;

    try {
      const response = await this.client.get<CoupangOrderListResponse>(fullPath, {
        headers: this.getAuthHeadersForPath('GET', path),
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to get orders', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  /**
   * 주문 상세 조회
   */
  async getOrderDetail(shipmentBoxId: number): Promise<APIResponse<CoupangOrder>> {
    const path = `/v2/providers/openapi/apis/api/v4/vendors/${this.vendorId}/ordersheets/${shipmentBoxId}`;

    try {
      const response = await this.client.get<{ data: CoupangOrder }>(path, {
        headers: this.getAuthHeadersForPath('GET', path),
      });

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to get order detail', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  /**
   * 발송 처리 (송장 등록)
   */
  async shipOrder(params: {
    shipmentBoxId: number;
    vendorItemId: number;
    deliveryCompanyCode: string;
    invoiceNumber: string;
  }): Promise<APIResponse<boolean>> {
    const path = `/v2/providers/openapi/apis/api/v4/vendors/${this.vendorId}/ordersheets/invoices`;

    try {
      const response = await this.client.put(
        path,
        [
          {
            shipmentBoxId: params.shipmentBoxId,
            vendorItemId: params.vendorItemId,
            deliveryCompanyCode: params.deliveryCompanyCode,
            invoiceNumber: params.invoiceNumber,
          },
        ],
        {
          headers: this.getAuthHeadersForPath('PUT', path),
        }
      );

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      this.logger.error('Failed to ship order', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  // ===========================================================================
  // 상품 관련 API
  // ===========================================================================

  /**
   * 재고 수량 업데이트
   */
  async updateInventory(params: {
    sellerProductId: number;
    itemId: number;
    quantity: number;
  }): Promise<APIResponse<boolean>> {
    const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${params.sellerProductId}/items/${params.itemId}/quantities/AVAILABLE`;

    try {
      const response = await this.client.put(
        path,
        { quantity: params.quantity },
        {
          headers: this.getAuthHeadersForPath('PUT', path),
        }
      );

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      this.logger.error('Failed to update inventory', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  // ===========================================================================
  // CS 관련 API
  // ===========================================================================

  /**
   * Q&A 목록 조회
   */
  async getQnAList(params: {
    answeredType?: 'ALL' | 'ANSWERED' | 'NONE_ANSWERED';
    createdAtFrom?: string;
    createdAtTo?: string;
  }): Promise<APIResponse<any>> {
    const path = `/v2/providers/openapi/apis/api/v4/vendors/${this.vendorId}/product-qnas`;

    const queryParams = new URLSearchParams();
    if (params.answeredType) queryParams.append('answeredType', params.answeredType);
    if (params.createdAtFrom) queryParams.append('createdAtFrom', params.createdAtFrom);
    if (params.createdAtTo) queryParams.append('createdAtTo', params.createdAtTo);

    const fullPath = queryParams.toString() ? `${path}?${queryParams}` : path;

    try {
      const response = await this.client.get(fullPath, {
        headers: this.getAuthHeadersForPath('GET', path),
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to get Q&A list', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  /**
   * Q&A 답변 등록
   */
  async answerQnA(inquiryId: number, answer: string): Promise<APIResponse<boolean>> {
    const path = `/v2/providers/openapi/apis/api/v4/vendors/${this.vendorId}/product-qnas/${inquiryId}/reply`;

    try {
      const response = await this.client.post(
        path,
        { content: answer },
        {
          headers: this.getAuthHeadersForPath('POST', path),
        }
      );

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      this.logger.error('Failed to answer Q&A', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  /**
   * 리뷰 목록 조회
   */
  async getReviews(params: {
    createdAtFrom?: string;
    createdAtTo?: string;
  }): Promise<APIResponse<any>> {
    const path = `/v2/providers/openapi/apis/api/v4/vendors/${this.vendorId}/product-reviews`;

    const queryParams = new URLSearchParams();
    if (params.createdAtFrom) queryParams.append('createdAtFrom', params.createdAtFrom);
    if (params.createdAtTo) queryParams.append('createdAtTo', params.createdAtTo);

    const fullPath = queryParams.toString() ? `${path}?${queryParams}` : path;

    try {
      const response = await this.client.get(fullPath, {
        headers: this.getAuthHeadersForPath('GET', path),
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to get reviews', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  // ===========================================================================
  // 반품/교환 관련 API
  // ===========================================================================

  /**
   * 반품 요청 목록 조회
   */
  async getReturnRequests(): Promise<APIResponse<any>> {
    const path = `/v2/providers/openapi/apis/api/v4/vendors/${this.vendorId}/returns`;

    try {
      const response = await this.client.get(path, {
        headers: this.getAuthHeadersForPath('GET', path),
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to get return requests', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }
}

// 싱글톤 인스턴스
export const coupangService = new CoupangService();
export default coupangService;
```

### 1.4 네이버 서비스 구현

**파일: `src/services/ecommerce/NaverService.ts`**

```typescript
import { BaseAPIService, APIResponse } from '../base/BaseAPIService';

// 네이버 주문 타입
export interface NaverOrder {
  orderId: string;
  orderNo: string;
  orderDate: string;
  paymentDate: string;
  productOrder: {
    productOrderId: string;
    productName: string;
    quantity: number;
    totalPaymentAmount: number;
    productOrderStatus: string;
  };
  ordererInfo: {
    ordererName: string;
    ordererTel: string;
  };
  shippingAddress: {
    name: string;
    tel1: string;
    baseAddress: string;
    detailAddress: string;
    zipCode: string;
  };
}

export interface NaverOrderListResponse {
  timestamp: string;
  data: {
    lastChangeStatuses: NaverOrder[];
    count: number;
  };
}

export class NaverService extends BaseAPIService {
  private clientId: string;
  private clientSecret: string;
  private accountId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    super({
      name: 'Naver',
      baseURL: 'https://api.commerce.naver.com',
      timeout: 30000,
      retryAttempts: 3,
    });

    this.clientId = process.env.NAVER_CLIENT_ID || '';
    this.clientSecret = process.env.NAVER_CLIENT_SECRET || '';
    this.accountId = process.env.NAVER_ACCOUNT_ID || '';

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn('Naver API credentials not configured');
    }
  }

  /**
   * OAuth 토큰 발급
   */
  private async refreshToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return; // 토큰이 유효하면 재사용
    }

    const timestamp = Date.now();
    const signature = await this.generateSignature(timestamp);

    try {
      const response = await this.client.post(
        '/external/v1/oauth2/token',
        new URLSearchParams({
          client_id: this.clientId,
          timestamp: timestamp.toString(),
          grant_type: 'client_credentials',
          client_secret_sign: signature,
          type: 'SELF',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
      this.logger.info('Naver OAuth token refreshed');
    } catch (error: any) {
      this.logger.error('Failed to refresh Naver token', error);
      throw error;
    }
  }

  /**
   * 서명 생성
   */
  private async generateSignature(timestamp: number): Promise<string> {
    const bcrypt = await import('crypto');
    const message = `${this.clientId}_${timestamp}`;
    const sign = bcrypt.createHmac('sha256', this.clientSecret)
      .update(message)
      .digest('base64');
    return sign;
  }

  /**
   * 인증 헤더 생성
   */
  protected getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
    };
  }

  /**
   * API 요청 전 토큰 확인
   */
  private async ensureToken(): Promise<void> {
    await this.refreshToken();
  }

  // ===========================================================================
  // 주문 관련 API
  // ===========================================================================

  /**
   * 주문 목록 조회 (변경 상태 기준)
   */
  async getOrders(params: {
    lastChangedFrom?: string;
    lastChangedTo?: string;
    lastChangedType?: string;
  }): Promise<APIResponse<NaverOrderListResponse>> {
    await this.ensureToken();

    try {
      const response = await this.client.get<NaverOrderListResponse>(
        '/external/v1/pay-order/seller/orders/last-changed-statuses',
        {
          params,
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to get orders', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  /**
   * 주문 상세 조회
   */
  async getOrderDetail(productOrderId: string): Promise<APIResponse<NaverOrder>> {
    await this.ensureToken();

    try {
      const response = await this.client.get(
        `/external/v1/pay-order/seller/product-orders/${productOrderId}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to get order detail', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  /**
   * 발송 처리
   */
  async shipOrder(params: {
    productOrderId: string;
    deliveryCompanyCode: string;
    trackingNumber: string;
  }): Promise<APIResponse<boolean>> {
    await this.ensureToken();

    try {
      const response = await this.client.post(
        `/external/v1/pay-order/seller/product-orders/${params.productOrderId}/ship`,
        {
          deliveryMethod: 'DELIVERY',
          deliveryCompanyCode: params.deliveryCompanyCode,
          trackingNumber: params.trackingNumber,
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      this.logger.error('Failed to ship order', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  // ===========================================================================
  // 톡톡 (CS) 관련 API
  // ===========================================================================

  /**
   * 톡톡 메시지 조회
   */
  async getTalkMessages(): Promise<APIResponse<any>> {
    await this.ensureToken();

    try {
      const response = await this.client.get(
        '/external/v1/pay-chat/seller/rooms',
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to get talk messages', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  /**
   * 톡톡 메시지 발송
   */
  async sendTalkMessage(roomId: string, message: string): Promise<APIResponse<boolean>> {
    await this.ensureToken();

    try {
      const response = await this.client.post(
        `/external/v1/pay-chat/seller/rooms/${roomId}/messages`,
        { message },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      this.logger.error('Failed to send talk message', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  // ===========================================================================
  // 상품/재고 관련 API
  // ===========================================================================

  /**
   * 재고 수량 업데이트
   */
  async updateInventory(params: {
    productNo: number;
    optionNo: number;
    stockQuantity: number;
  }): Promise<APIResponse<boolean>> {
    await this.ensureToken();

    try {
      const response = await this.client.put(
        `/external/v2/products/${params.productNo}/options/stock`,
        {
          optionStocks: [
            {
              optionNo: params.optionNo,
              stockQuantity: params.stockQuantity,
            },
          ],
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      this.logger.error('Failed to update inventory', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }
}

// 싱글톤 인스턴스
export const naverService = new NaverService();
export default naverService;
```

### 1.5 Cafe24 서비스 구현

**파일: `src/services/ecommerce/Cafe24Service.ts`**

```typescript
import { BaseAPIService, APIResponse } from '../base/BaseAPIService';

// Cafe24 주문 타입
export interface Cafe24Order {
  order_id: string;
  order_date: string;
  order_status: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address1: string;
  receiver_address2: string;
  receiver_zipcode: string;
  items: {
    item_no: string;
    product_name: string;
    quantity: number;
    product_price: number;
  }[];
  total_amount: number;
}

export class Cafe24Service extends BaseAPIService {
  private mallId: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    const mallId = process.env.CAFE24_MALL_ID || '';

    super({
      name: 'Cafe24',
      baseURL: `https://${mallId}.cafe24api.com/api/v2`,
      timeout: 30000,
      retryAttempts: 3,
    });

    this.mallId = mallId;
    this.clientId = process.env.CAFE24_CLIENT_ID || '';
    this.clientSecret = process.env.CAFE24_CLIENT_SECRET || '';

    if (!this.mallId || !this.clientId || !this.clientSecret) {
      this.logger.warn('Cafe24 API credentials not configured');
    }
  }

  /**
   * OAuth 토큰 갱신
   */
  private async refreshAccessToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return;
    }

    if (!this.refreshToken) {
      throw new Error('No refresh token available. Please authenticate first.');
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await this.client.post(
        `https://${this.mallId}.cafe24api.com/api/v2/oauth/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
      this.logger.info('Cafe24 OAuth token refreshed');
    } catch (error: any) {
      this.logger.error('Failed to refresh Cafe24 token', error);
      throw error;
    }
  }

  /**
   * 수동 토큰 설정 (초기 인증 후)
   */
  setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = Date.now() + (expiresIn * 1000);
  }

  /**
   * 인증 헤더 생성
   */
  protected getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      'X-Cafe24-Api-Version': '2024-03-01',
    };
  }

  /**
   * API 요청 전 토큰 확인
   */
  private async ensureToken(): Promise<void> {
    await this.refreshAccessToken();
  }

  // ===========================================================================
  // 주문 관련 API
  // ===========================================================================

  /**
   * 주문 목록 조회
   */
  async getOrders(params: {
    start_date?: string;
    end_date?: string;
    order_status?: string;
    limit?: number;
    offset?: number;
  }): Promise<APIResponse<{ orders: Cafe24Order[] }>> {
    await this.ensureToken();

    try {
      const response = await this.client.get('/admin/orders', {
        params,
        headers: this.getAuthHeaders(),
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to get orders', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  /**
   * 주문 상세 조회
   */
  async getOrderDetail(orderId: string): Promise<APIResponse<Cafe24Order>> {
    await this.ensureToken();

    try {
      const response = await this.client.get(`/admin/orders/${orderId}`, {
        headers: this.getAuthHeaders(),
      });

      return {
        success: true,
        data: response.data.order,
      };
    } catch (error: any) {
      this.logger.error('Failed to get order detail', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  /**
   * 주문 상태 변경 (발송 처리 등)
   */
  async updateOrderStatus(params: {
    orderId: string;
    status: string;
    trackingNo?: string;
    shippingCompanyCode?: string;
  }): Promise<APIResponse<boolean>> {
    await this.ensureToken();

    try {
      const body: Record<string, any> = {
        order_status: params.status,
      };

      if (params.trackingNo) {
        body.tracking_no = params.trackingNo;
        body.shipping_company_code = params.shippingCompanyCode;
      }

      const response = await this.client.put(
        `/admin/orders/${params.orderId}`,
        { order: body },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      this.logger.error('Failed to update order status', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  // ===========================================================================
  // 상품/재고 관련 API
  // ===========================================================================

  /**
   * 재고 수량 업데이트
   */
  async updateInventory(params: {
    productNo: number;
    variantCode: string;
    quantity: number;
  }): Promise<APIResponse<boolean>> {
    await this.ensureToken();

    try {
      const response = await this.client.put(
        `/admin/products/${params.productNo}/variants/${params.variantCode}/inventories`,
        {
          inventory: {
            quantity: params.quantity,
          },
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      this.logger.error('Failed to update inventory', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  // ===========================================================================
  // 게시판 (CS) 관련 API
  // ===========================================================================

  /**
   * 게시판 글 목록 조회
   */
  async getBoardArticles(boardNo: number): Promise<APIResponse<any>> {
    await this.ensureToken();

    try {
      const response = await this.client.get(
        `/admin/boards/${boardNo}/articles`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to get board articles', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  /**
   * 게시판 답변 등록
   */
  async replyToArticle(
    boardNo: number,
    articleNo: number,
    content: string
  ): Promise<APIResponse<boolean>> {
    await this.ensureToken();

    try {
      const response = await this.client.post(
        `/admin/boards/${boardNo}/articles/${articleNo}/comments`,
        {
          comment: {
            content,
          },
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      this.logger.error('Failed to reply to article', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }
}

// 싱글톤 인스턴스
export const cafe24Service = new Cafe24Service();
export default cafe24Service;
```

### 1.6 서비스 인덱스 파일

**파일: `src/services/ecommerce/index.ts`**

```typescript
export { CoupangService, coupangService } from './CoupangService';
export { NaverService, naverService } from './NaverService';
export { Cafe24Service, cafe24Service } from './Cafe24Service';

// 통합 이커머스 서비스
import { coupangService } from './CoupangService';
import { naverService } from './NaverService';
import { cafe24Service } from './Cafe24Service';
import { SalesChannel } from '../../types';

export class EcommerceServiceManager {
  /**
   * 채널별 서비스 인스턴스 반환
   */
  getService(channel: SalesChannel) {
    switch (channel) {
      case SalesChannel.COUPANG:
        return coupangService;
      case SalesChannel.NAVER:
        return naverService;
      case SalesChannel.CAFE24:
        return cafe24Service;
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * 모든 채널에서 주문 수집
   */
  async collectAllOrders() {
    const results = await Promise.allSettled([
      coupangService.getOrders({ status: 'ACCEPT' }),
      naverService.getOrders({}),
      cafe24Service.getOrders({}),
    ]);

    return {
      coupang: results[0].status === 'fulfilled' ? results[0].value : null,
      naver: results[1].status === 'fulfilled' ? results[1].value : null,
      cafe24: results[2].status === 'fulfilled' ? results[2].value : null,
    };
  }
}

export const ecommerceManager = new EcommerceServiceManager();
```

---

## Phase 2: 에이전트와 서비스 연동

### 2.1 OrderCollectorSubAgent 수정

**파일: `src/agents/order/sub/OrderCollectorSubAgent.ts` (수정)**

기존 시뮬레이션 코드를 실제 서비스 호출로 변경:

```typescript
// 변경 전 (시뮬레이션)
private async collectFromCoupang(): Promise<OrderCollectionResult> {
  // TODO: 실제 쿠팡 API 연동 구현
  await this.sleep(500);
  const newOrderCount = Math.floor(Math.random() * 10);
  // ...
}

// 변경 후 (실제 연동)
private async collectFromCoupang(): Promise<OrderCollectionResult> {
  const { coupangService } = await import('../../../services/ecommerce');

  const response = await coupangService.getOrders({
    status: 'ACCEPT',
    createdAtFrom: this.getLastSyncTime('coupang'),
  });

  if (!response.success) {
    return {
      channel: SalesChannel.COUPANG,
      success: false,
      ordersCollected: 0,
      newOrders: 0,
      updatedOrders: 0,
      failedOrders: 0,
      errors: [{
        channelOrderId: 'N/A',
        errorCode: response.error?.code || 'API_ERROR',
        errorMessage: response.error?.message || 'Unknown error',
        retryable: true,
      }],
      collectedAt: new Date(),
    };
  }

  const orders = response.data?.data || [];
  let newOrders = 0;
  let updatedOrders = 0;
  let failedOrders = 0;
  const errors: OrderCollectionError[] = [];

  for (const order of orders) {
    try {
      const normalized = this.normalizeCoupangOrder(order);
      const saved = await this.saveOrder(normalized);

      if (saved.isNew) {
        newOrders++;
      } else {
        updatedOrders++;
      }
    } catch (error) {
      failedOrders++;
      errors.push({
        channelOrderId: order.orderId.toString(),
        errorCode: 'SAVE_ERROR',
        errorMessage: (error as Error).message,
        retryable: true,
      });
    }
  }

  return {
    channel: SalesChannel.COUPANG,
    success: true,
    ordersCollected: orders.length,
    newOrders,
    updatedOrders,
    failedOrders,
    errors: errors.length > 0 ? errors : undefined,
    collectedAt: new Date(),
  };
}
```

### 2.2 서비스 주입 패턴 적용

**파일: `src/agents/base/BaseAgent.ts` (추가)**

```typescript
// 서비스 레지스트리 추가
protected getService<T>(serviceName: string): T {
  const serviceMap: Record<string, () => unknown> = {
    'coupang': () => import('../../services/ecommerce').then(m => m.coupangService),
    'naver': () => import('../../services/ecommerce').then(m => m.naverService),
    'cafe24': () => import('../../services/ecommerce').then(m => m.cafe24Service),
    'kakao': () => import('../../services/notification').then(m => m.kakaoService),
    'slack': () => import('../../services/notification').then(m => m.slackService),
  };

  const loader = serviceMap[serviceName];
  if (!loader) {
    throw new Error(`Unknown service: ${serviceName}`);
  }

  return loader() as T;
}
```

---

## Phase 3: 알림 서비스 구현

### 3.1 카카오 알림톡 서비스

**파일: `src/services/notification/KakaoService.ts`**

```typescript
import { BaseAPIService, APIResponse } from '../base/BaseAPIService';

export interface AlimtalkMessage {
  templateCode: string;
  recipientNo: string;
  templateParameter: Record<string, string>;
}

export class KakaoService extends BaseAPIService {
  private apiKey: string;
  private senderKey: string;

  constructor() {
    super({
      name: 'Kakao',
      baseURL: 'https://kapi.kakao.com',
      timeout: 30000,
    });

    this.apiKey = process.env.KAKAO_API_KEY || '';
    this.senderKey = process.env.KAKAO_SENDER_KEY || '';
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `KakaoAK ${this.apiKey}`,
    };
  }

  /**
   * 알림톡 발송
   */
  async sendAlimtalk(message: AlimtalkMessage): Promise<APIResponse<boolean>> {
    try {
      const response = await this.client.post(
        '/v2/api/talk/memo/default/send',
        {
          template_object: {
            object_type: 'text',
            text: JSON.stringify(message.templateParameter),
            link: {
              web_url: 'https://sundayhug.com',
            },
          },
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return { success: true, data: true };
    } catch (error: any) {
      this.logger.error('Failed to send Alimtalk', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }
}

export const kakaoService = new KakaoService();
```

### 3.2 Slack 서비스

**파일: `src/services/notification/SlackService.ts`**

```typescript
import { BaseAPIService, APIResponse } from '../base/BaseAPIService';

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
  attachments?: any[];
}

export class SlackService extends BaseAPIService {
  private botToken: string;
  private channels: Record<string, string>;

  constructor() {
    super({
      name: 'Slack',
      baseURL: 'https://slack.com/api',
      timeout: 30000,
    });

    this.botToken = process.env.SLACK_BOT_TOKEN || '';
    this.channels = {
      orders: process.env.SLACK_ORDERS_CHANNEL || '',
      cs: process.env.SLACK_CS_CHANNEL || '',
      general: process.env.SLACK_GENERAL_CHANNEL || '',
    };
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${this.botToken}`,
    };
  }

  /**
   * 메시지 발송
   */
  async sendMessage(message: SlackMessage): Promise<APIResponse<boolean>> {
    try {
      const response = await this.client.post(
        '/chat.postMessage',
        message,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.data.ok) {
        throw new Error(response.data.error);
      }

      return { success: true, data: true };
    } catch (error: any) {
      this.logger.error('Failed to send Slack message', error);
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN',
          message: error.message,
        },
      };
    }
  }

  /**
   * 채널별 메시지 발송 헬퍼
   */
  async notifyOrders(text: string, blocks?: any[]): Promise<APIResponse<boolean>> {
    return this.sendMessage({
      channel: this.channels.orders,
      text,
      blocks,
    });
  }

  async notifyCS(text: string, blocks?: any[]): Promise<APIResponse<boolean>> {
    return this.sendMessage({
      channel: this.channels.cs,
      text,
      blocks,
    });
  }
}

export const slackService = new SlackService();
```

---

## Phase 4: 실행 진입점 및 테스트

### 4.1 메인 진입점

**파일: `src/index.ts`**

```typescript
import 'dotenv/config';
import { Logger } from './utils/logger';
import { AgentRegistry } from './agents/base/AgentRegistry';
import { SupervisorAgent } from './agents/supervisor/SupervisorAgent';
import { CronScheduler } from './scheduler/CronScheduler';

const logger = new Logger('Main');

async function main() {
  logger.info('🚀 썬데이허그 AI 에이전트 시스템 시작...');

  try {
    // 1. 환경 변수 검증
    validateEnv();

    // 2. 에이전트 레지스트리 초기화
    const registry = AgentRegistry.getInstance();

    // 3. Supervisor 에이전트 시작
    const supervisor = new SupervisorAgent({
      id: 'supervisor-main',
      name: 'SupervisorAgent',
      description: '총괄 오케스트레이터',
      version: '1.0.0',
      capabilities: ['routing', 'orchestration', 'monitoring'],
    });

    await supervisor.start();
    registry.registerAgent(supervisor);

    // 4. 스케줄러 시작 (선택)
    if (process.env.ENABLE_SCHEDULER === 'true') {
      const scheduler = new CronScheduler();
      await scheduler.start();
      logger.info('📅 스케줄러 시작됨');
    }

    logger.info('✅ 시스템 시작 완료');

    // 5. 종료 시그널 처리
    process.on('SIGINT', async () => {
      logger.info('🛑 시스템 종료 중...');
      await supervisor.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ 시스템 시작 실패', error as Error);
    process.exit(1);
  }
}

function validateEnv() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  logger.info('✅ 환경 변수 검증 완료');
}

main();
```

### 4.2 테스트 설정

**파일: `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### 4.3 서비스 테스트 예시

**파일: `tests/services/CoupangService.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoupangService } from '../../src/services/ecommerce/CoupangService';

describe('CoupangService', () => {
  let service: CoupangService;

  beforeEach(() => {
    vi.stubEnv('COUPANG_ACCESS_KEY', 'test-access-key');
    vi.stubEnv('COUPANG_SECRET_KEY', 'test-secret-key');
    vi.stubEnv('COUPANG_VENDOR_ID', 'test-vendor-id');

    service = new CoupangService();
  });

  describe('getOrders', () => {
    it('should return orders when API call succeeds', async () => {
      // Mock 구현
      vi.spyOn(service['client'], 'get').mockResolvedValue({
        data: {
          code: 200,
          message: 'OK',
          data: [
            { orderId: 1, status: 'ACCEPT' },
            { orderId: 2, status: 'ACCEPT' },
          ],
        },
      });

      const result = await service.getOrders({ status: 'ACCEPT' });

      expect(result.success).toBe(true);
      expect(result.data?.data).toHaveLength(2);
    });

    it('should handle API errors gracefully', async () => {
      vi.spyOn(service['client'], 'get').mockRejectedValue(new Error('Network error'));

      const result = await service.getOrders({ status: 'ACCEPT' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
```

---

## 파일 구조 변경 사항

### 추가되는 파일/폴더

```
sundayhug-ai-workspace/
├── src/
│   ├── index.ts                          # 🆕 메인 진입점
│   └── services/                         # 🆕 서비스 레이어
│       ├── index.ts
│       ├── base/
│       │   └── BaseAPIService.ts
│       ├── ecommerce/
│       │   ├── index.ts
│       │   ├── CoupangService.ts
│       │   ├── NaverService.ts
│       │   └── Cafe24Service.ts
│       ├── notification/
│       │   ├── index.ts
│       │   ├── KakaoService.ts
│       │   └── SlackService.ts
│       └── delivery/
│           ├── index.ts
│           └── DeliveryService.ts
├── tests/                                # 🆕 테스트 폴더
│   └── services/
│       └── CoupangService.test.ts
├── .env.example                          # 🆕 환경 변수 예시
├── tsconfig.json                         # 수정
├── vitest.config.ts                      # 🆕 테스트 설정
└── package.json                          # 수정
```

### 수정되는 파일

```
src/agents/order/sub/OrderCollectorSubAgent.ts    # 실제 API 호출로 변경
src/agents/order/sub/ShippingManagerSubAgent.ts   # 실제 API 호출로 변경
src/agents/cs/sub/InquiryResponderSubAgent.ts     # 실제 API 호출로 변경
src/agents/inventory/sub/StockSyncSubAgent.ts     # 실제 API 호출로 변경
src/utils/notification.ts                         # 실제 서비스 연동
```

---

## 우선순위 및 일정

### 높은 우선순위 (MVP)

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| Phase 0 | 환경 설정 | 2시간 |
| Phase 1.1 | BaseAPIService | 2시간 |
| Phase 1.2 | CoupangService | 4시간 |
| Phase 2.1 | OrderCollector 연동 | 3시간 |
| Phase 4.1 | 메인 진입점 | 2시간 |

**MVP 완료 예상: 2-3일**

### 중간 우선순위

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| Phase 1.3 | NaverService | 4시간 |
| Phase 1.4 | Cafe24Service | 4시간 |
| Phase 3.1 | SlackService | 2시간 |
| Phase 3.2 | KakaoService | 3시간 |

**추가 기능 완료: 1주**

### 낮은 우선순위

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| Phase 4.2-3 | 테스트 작성 | 1주 |
| - | 문서화 | 2일 |
| - | CI/CD 설정 | 1일 |

---

## 실행 방법

### 개발 환경

```bash
# 1. 패키지 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일에 실제 값 입력

# 3. 개발 모드 실행
npm run dev
```

### 프로덕션 환경

```bash
# 1. 빌드
npm run build

# 2. 실행
npm start
```

---

## 주의사항

1. **API 키 보안**: `.env` 파일은 절대 Git에 커밋하지 않음
2. **Rate Limit**: 각 플랫폼의 API 호출 제한을 준수
3. **에러 처리**: 모든 API 호출에 적절한 에러 처리 필수
4. **로깅**: 디버깅을 위해 적절한 로그 레벨 유지
5. **테스트**: 실제 API 호출 전 Mock 테스트로 검증

---

> 이 문서는 개발 진행에 따라 업데이트됩니다.
> 마지막 수정: 2026-02-03
