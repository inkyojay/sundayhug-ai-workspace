# 썬데이허그 AI 에이전트 - 브랜치 가이드

> 병렬 개발을 위한 브랜치 전략 및 세션별 작업 가이드

## 개요

이 프로젝트는 **6개의 독립적인 레인(Lane)**으로 나뉘어 병렬 개발됩니다.
각 레인은 별도의 브랜치에서 작업하여 **충돌 없이** 동시 개발이 가능합니다.

```
                            main (안정)
                               │
     ┌─────────────────────────┼─────────────────────────┐
     │           │             │             │           │
     ▼           ▼             ▼             ▼           ▼
  claude/     claude/       claude/       claude/     claude/
  lane0-      lane1-        lane2-        lane3-      lane4-
  foundation  core-ops      marketing     management  analytics
     │           │             │             │           │
  [세션1]     [세션2]        [세션3]       [세션4]     [세션5]
```

---

## 레인별 브랜치 및 작업 범위

### 🏗️ LANE 0: Foundation (기반 인프라)

**브랜치 패턴**: `claude/lane0-foundation-*`

**작업 범위**:
```
docs/ontology/              # 온톨로지 문서 전체
├── mission-vision.md
├── brand-voice.md
├── target-customer.md
└── product-taxonomy.md

database/                   # DB 스키마
├── schema.sql
├── migrations/
└── seeds/

mcp/                        # MCP 설정
├── connections.json
└── servers/

src/agents/base/            # Base Agent 프레임워크
src/types/                  # 공통 타입 정의
src/utils/                  # 공통 유틸리티

schedules/                  # 스케줄 정의
prompts/system/             # 시스템 프롬프트
```

**의존성**: 없음 (최초 시작)

**완료 기준**:
- [ ] 온톨로지 문서 4개 완료
- [ ] DB 스키마 생성 및 마이그레이션
- [ ] MCP 연결 설정 완료
- [ ] BaseAgent 클래스 구현
- [ ] 공통 타입/유틸리티 정의

---

### ⚡ LANE 1: Core Operations (핵심 운영)

**브랜치 패턴**: `claude/lane1-core-ops-*`

**작업 범위**:
```
docs/agents/01-order/       # 주문 에이전트 문서
docs/agents/02-cs/          # CS 에이전트 문서
docs/agents/05-inventory/   # 재고 에이전트 문서
docs/agents/13-logistics/   # 물류 에이전트 문서

src/agents/order/           # 주문 에이전트 코드
src/agents/cs/              # CS 에이전트 코드
src/agents/inventory/       # 재고 에이전트 코드
src/agents/logistics/       # 물류 에이전트 코드

docs/topology/workflows/
├── order-flow.md
├── cs-inquiry-flow.md
├── cs-complaint-flow.md
├── cs-return-flow.md
├── inventory-sync-flow.md
├── inventory-reorder-flow.md
└── logistics-fulfillment-flow.md
```

**의존성**: LANE 0 완료 필요

**서브 에이전트**:
| 메인 | 서브 에이전트 |
|------|-------------|
| Order (3) | 주문수집, 배송관리, 반품/교환 |
| CS (5) | 문의응대, 리뷰관리, AS처리, VOC분석, 클레임처리 |
| Inventory (3) | 재고동기화, 발주관리, 원가분석 |
| Logistics (3) | 3PL관리, 배송최적화, 품질관리 |

**완료 기준**:
- [ ] 4개 메인 에이전트 구현
- [ ] 14개 서브 에이전트 구현
- [ ] 7개 워크플로우 정의
- [ ] 쿠팡/네이버/Cafe24 API 연동

---

### 📢 LANE 2: Marketing & Content (마케팅/콘텐츠)

**브랜치 패턴**: `claude/lane2-marketing-*`

**작업 범위**:
```
docs/agents/03-marketing/      # 마케팅 에이전트 문서
docs/agents/04-detail-page/    # 상세페이지 에이전트 문서
docs/agents/14-media/          # 미디어 에이전트 문서

src/agents/marketing/          # 마케팅 에이전트 코드
src/agents/detail-page/        # 상세페이지 에이전트 코드
src/agents/media/              # 미디어 에이전트 코드

docs/topology/workflows/
├── marketing-campaign-flow.md
├── marketing-content-flow.md
├── marketing-crm-flow.md
├── marketing-promotion-flow.md
├── marketing-influencer-flow.md
├── marketing-social-listening-flow.md
├── detail-page-flow.md
└── media-production-flow.md
```

**의존성**: LANE 0 완료 필요

**서브 에이전트**:
| 메인 | 서브 에이전트 |
|------|-------------|
| Marketing (7) | 퍼포먼스, 콘텐츠, CRM, 프로모션, 인플루언서, 소셜리스닝, 브랜드 |
| DetailPage (3) | 기획, 제작, 최적화 |
| Media (3) | 촬영관리, 에셋관리, 편집 |

**완료 기준**:
- [ ] 3개 메인 에이전트 구현
- [ ] 13개 서브 에이전트 구현
- [ ] 8개 워크플로우 정의
- [ ] 메타/네이버 광고 API 연동

---

### 📋 LANE 3: Management & Compliance (관리/컴플라이언스)

**브랜치 패턴**: `claude/lane3-management-*`

**작업 범위**:
```
docs/agents/06-accounting/     # 회계 에이전트 문서
docs/agents/07-biz-support/    # 지원사업 에이전트 문서
docs/agents/09-legal/          # 법률 에이전트 문서
docs/agents/10-ip/             # 지재권 에이전트 문서

src/agents/accounting/         # 회계 에이전트 코드
src/agents/biz-support/        # 지원사업 에이전트 코드
src/agents/legal/              # 법률 에이전트 코드
src/agents/ip/                 # 지재권 에이전트 코드

docs/topology/workflows/
├── accounting-daily-flow.md
├── accounting-tax-flow.md
├── support-program-flow.md
├── legal-compliance-flow.md
└── intellectual-property-flow.md
```

**의존성**: LANE 0 완료 필요

**서브 에이전트**:
| 메인 | 서브 에이전트 |
|------|-------------|
| Accounting (4) | 매출정산, 비용관리, 세무, 손익분석 |
| BizSupport (3) | 모니터링, 신청지원, 사후관리 |
| Legal (3) | 인증관리, 광고심의, 규정준수 |
| IP (3) | 권리관리, 침해감시, 대응 |

**완료 기준**:
- [ ] 4개 메인 에이전트 구현
- [ ] 13개 서브 에이전트 구현
- [ ] 5개 워크플로우 정의

---

### 📊 LANE 4: Analytics & Growth (분석/성장)

**브랜치 패턴**: `claude/lane4-analytics-*`

**작업 범위**:
```
docs/agents/08-product/        # 제품기획 에이전트 문서
docs/agents/11-analytics/      # 분석 에이전트 문서
docs/agents/12-crisis/         # 위기관리 에이전트 문서
docs/agents/15-partnership/    # 제휴 에이전트 문서
docs/agents/16-loyalty/        # 로열티 에이전트 문서

src/agents/product/            # 제품기획 에이전트 코드
src/agents/analytics/          # 분석 에이전트 코드
src/agents/crisis/             # 위기관리 에이전트 코드
src/agents/partnership/        # 제휴 에이전트 코드
src/agents/loyalty/            # 로열티 에이전트 코드

docs/topology/workflows/
├── product-planning-flow.md
├── product-launch-flow.md
├── data-analytics-flow.md
├── crisis-management-flow.md
├── partnership-flow.md
└── loyalty-program-flow.md
```

**의존성**: LANE 0 완료, LANE 1 부분 완료 필요

**서브 에이전트**:
| 메인 | 서브 에이전트 |
|------|-------------|
| Product (3) | 리서치, 기획, 피드백분석 |
| Analytics (3) | 대시보드, 리포트, 예측 |
| Crisis (3) | 모니터링, 대응, 복구 |
| Partnership (3) | B2B, 도매, 공동구매 |
| Loyalty (3) | 멤버십, 포인트, VIP관리 |

**완료 기준**:
- [ ] 5개 메인 에이전트 구현
- [ ] 15개 서브 에이전트 구현
- [ ] 6개 워크플로우 정의

---

### 🎯 LANE 5: Integration & Orchestration (통합/오케스트레이션)

**브랜치 패턴**: `claude/lane5-integration-*`

**작업 범위**:
```
docs/agents/00-supervisor/     # Supervisor 에이전트 문서

src/agents/supervisor/         # Supervisor 에이전트 코드
src/workflows/                 # 워크플로우 엔진
├── WorkflowEngine.ts
├── StateMachine.ts
└── ErrorRecovery.ts

schedules/
└── cron-jobs.md              # 상세 스케줄 구현

prompts/templates/             # 에이전트 프롬프트 템플릿
```

**의존성**: LANE 1, LANE 2 완료 필요

**완료 기준**:
- [ ] Supervisor 에이전트 구현
- [ ] 워크플로우 엔진 구현
- [ ] 21개 워크플로우 연동
- [ ] 크론 스케줄러 구현
- [ ] 모니터링 대시보드

---

## 브랜치 명명 규칙

```
claude/lane{N}-{domain}-{session-id}

예시:
- claude/lane0-foundation-abc123
- claude/lane1-core-ops-def456
- claude/lane2-marketing-ghi789
```

## 작업 시작 가이드

### 새 세션에서 작업 시작 시

```bash
# 1. 최신 main 가져오기
git fetch origin main
git checkout main
git pull origin main

# 2. 담당 레인 브랜치 생성 (또는 기존 브랜치 체크아웃)
git checkout -b claude/lane{N}-{domain}-{session-id}

# 3. 작업 진행
# ...

# 4. 커밋 및 푸시
git add .
git commit -m "feat(lane{N}): 작업 내용"
git push -u origin claude/lane{N}-{domain}-{session-id}
```

### 커밋 메시지 규칙

```
feat(lane{N}): 새 기능 추가
fix(lane{N}): 버그 수정
docs(lane{N}): 문서 수정
refactor(lane{N}): 리팩토링
test(lane{N}): 테스트 추가

예시:
- feat(lane0): Add BaseAgent class
- feat(lane1): Implement OrderAgent with 3 sub-agents
- docs(lane2): Add marketing workflow documentation
```

---

## 동기화 포인트 (Sync Points)

```
SYNC-0 (LANE 0 완료)
    │
    ├──→ LANE 1 시작 가능
    ├──→ LANE 2 시작 가능
    └──→ LANE 3 시작 가능

SYNC-1 (LANE 1 완료)
    │
    └──→ LANE 4 시작 가능
         LANE 5 부분 시작 가능

SYNC-2 (LANE 2 완료)
    │
    └──→ LANE 5 Supervisor 확장 가능

SYNC-F (전체 완료)
    │
    └──→ 프로덕션 배포
```

---

## 충돌 방지 규칙

### 각 레인이 수정 가능한 파일

| 레인 | 수정 가능 | 수정 금지 |
|------|----------|----------|
| L0 | `docs/ontology/`, `database/`, `mcp/`, `src/agents/base/`, `src/types/`, `src/utils/` | 다른 레인의 에이전트 코드 |
| L1 | `docs/agents/01,02,05,13/`, `src/agents/order,cs,inventory,logistics/` | L0 기반 파일, 다른 레인 파일 |
| L2 | `docs/agents/03,04,14/`, `src/agents/marketing,detail-page,media/` | L0 기반 파일, 다른 레인 파일 |
| L3 | `docs/agents/06,07,09,10/`, `src/agents/accounting,biz-support,legal,ip/` | L0 기반 파일, 다른 레인 파일 |
| L4 | `docs/agents/08,11,12,15,16/`, `src/agents/product,analytics,crisis,partnership,loyalty/` | L0 기반 파일, 다른 레인 파일 |
| L5 | `docs/agents/00/`, `src/agents/supervisor/`, `src/workflows/` | 다른 레인의 에이전트 코드 |

### 공유 파일 수정 시

다음 파일들은 **LANE 0에서만** 수정합니다:
- `README.md`
- `package.json`
- `tsconfig.json`
- `.env.example`
- `database/schema.sql`

다른 레인에서 수정이 필요한 경우, LANE 0 담당 세션에 요청하거나 PR을 통해 머지합니다.

---

## 레인별 프롬프트 템플릿

각 레인에서 Claude 세션 시작 시 사용할 프롬프트:

### LANE 1 시작 프롬프트

```
썬데이허그 AI 에이전트 시스템의 LANE 1 (Core Operations) 개발을 진행합니다.

브랜치: claude/lane1-core-ops-{세션ID}

담당 에이전트:
- Order Agent (3 sub)
- CS Agent (5 sub)
- Inventory Agent (3 sub)
- Logistics Agent (3 sub)

BRANCH_GUIDE.md를 확인하고, LANE 0 결과물(BaseAgent, types, utils)을 기반으로 개발해주세요.
```

### LANE 2 시작 프롬프트

```
썬데이허그 AI 에이전트 시스템의 LANE 2 (Marketing & Content) 개발을 진행합니다.

브랜치: claude/lane2-marketing-{세션ID}

담당 에이전트:
- Marketing Agent (7 sub)
- DetailPage Agent (3 sub)
- Media Agent (3 sub)

BRANCH_GUIDE.md를 확인하고, LANE 0 결과물을 기반으로 개발해주세요.
```

(LANE 3, 4, 5도 동일한 패턴으로 작성)

---

## 체크리스트

### 세션 시작 전
- [ ] 최신 main 브랜치 pull
- [ ] 담당 레인 확인
- [ ] 의존 레인 완료 여부 확인
- [ ] 브랜치 생성/체크아웃

### 작업 중
- [ ] 담당 파일만 수정
- [ ] 커밋 메시지 규칙 준수
- [ ] 테스트 코드 작성

### 세션 종료 전
- [ ] 모든 변경사항 커밋
- [ ] 브랜치 푸시
- [ ] 작업 현황 문서화
