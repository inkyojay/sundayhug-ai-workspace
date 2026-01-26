# Partnership Agent

> B2B 납품, 도매/총판 관리, 공동구매 운영을 담당하는 메인 에이전트

---

## 1. 기본 정보

### 1.1 에이전트 식별 정보

| 항목 | 값 |
|------|-----|
| **Agent ID** | `partnership-agent` |
| **Agent Name** | `PartnershipAgent` |
| **한글명** | 제휴/파트너십 에이전트 |
| **유형** | `main` |
| **상위 에이전트** | `none` |
| **버전** | `1.0.0` |
| **최종 수정일** | `2024-01-26` |

### 1.2 에이전트 분류

```yaml
classification:
  domain: "partnership"
  layer: "growth"
  automation_level: "L2"
  criticality: "medium"
```

---

## 2. 역할과 책임

### 2.1 핵심 역할

B2B 고객 납품, 도매/총판 파트너 관리, 공동구매 캠페인 운영을 통해 매출 채널을 다각화하고 파트너 관계를 관리합니다.

### 2.2 주요 책임 (Responsibilities)

| 책임 | 설명 | 자동화 레벨 |
|------|------|------------|
| B2B 문의 관리 | 납품 문의 접수 및 응대 | L3 |
| 견적 관리 | 견적서 작성 및 발송 | L3 |
| 계약 관리 | 계약서 관리 및 갱신 알림 | L3 |
| 도매 주문 관리 | 도매/총판 주문 처리 | L3 |
| 공동구매 운영 | 공구 캠페인 기획 및 운영 | L2 |
| 정산 관리 | 파트너 정산 처리 | L3 |

### 2.3 경계 (Boundaries)

#### 이 에이전트가 하는 것 (In Scope)

- B2B 문의 처리 및 견적 발송
- 파트너 계약 관리
- 도매/총판 주문 처리
- 공동구매 캠페인 운영
- 파트너 정산 처리

#### 이 에이전트가 하지 않는 것 (Out of Scope)

- B2C 주문 처리 -> Order Agent
- 마케팅 캠페인 -> Marketing Agent
- 회계 처리 -> Accounting Agent
- 법적 계약 검토 -> Legal Agent

---

## 3. 권한 (Permissions)

### 3.1 데이터 접근 권한

| 데이터 유형 | 조회 | 생성 | 수정 | 삭제 |
|------------|:----:|:----:|:----:|:----:|
| 파트너 정보 | O | O | O | X |
| 계약 정보 | O | O | O | X |
| 견적서 | O | O | O | O |
| 도매 주문 | O | O | O | X |
| 공동구매 | O | O | O | X |
| 정산 내역 | O | O | O | X |

### 3.2 실행 권한

```yaml
execution_permissions:
  autonomous:
    - "문의 자동 응답"
    - "표준 견적 생성"
    - "도매 주문 접수"
    - "정산 계산"

  requires_approval:
    - action: "대형 계약 체결"
      approver: "sales-manager"
      condition: "월 거래액 1천만원 이상"

    - action: "특별 할인 적용"
      approver: "sales-manager"
      condition: "표준 할인율 초과"

    - action: "공동구매 캠페인 생성"
      approver: "marketing-manager"
      condition: "신규 캠페인"

  prohibited:
    - "승인 없는 가격 할인"
    - "계약 조건 임의 변경"
```

---

## 4. 서브 에이전트

### 4.1 서브 에이전트 목록

| Sub ID | 에이전트명 | 역할 |
|--------|-----------|------|
| `partnership-b2b-subagent` | B2B SubAgent | 납품문의, 견적, 계약관리 |
| `partnership-wholesale-subagent` | Wholesale SubAgent | 도매/총판 관리 |
| `partnership-groupbuying-subagent` | GroupBuying SubAgent | 공구진행, 정산 |

### 4.2 서브 에이전트 협업 구조

```mermaid
flowchart TD
    MAIN["Partnership Agent"] --> B2B["B2B SubAgent"]
    MAIN --> WHOLESALE["Wholesale SubAgent"]
    MAIN --> GROUPBUYING["GroupBuying SubAgent"]

    B2B --> |"계약 체결"| WHOLESALE
    GROUPBUYING --> |"정산 요청"| MAIN
```

---

## 5. 주요 기능

### 5.1 B2B 관리

- **문의 관리**: 납품 문의 접수, 분류, 응대
- **견적 관리**: 견적서 작성, 발송, 추적
- **계약 관리**: 계약 체결, 갱신, 종료 관리

### 5.2 도매/총판 관리

- **주문 관리**: 도매 주문 접수 및 처리
- **재고 할당**: 파트너별 재고 할당
- **가격 관리**: 파트너별 가격 정책 관리

### 5.3 공동구매 관리

- **캠페인 기획**: 공구 기획 및 설정
- **모집 관리**: 참가자 모집 및 관리
- **배송 관리**: 그룹 배송 조율
- **정산 관리**: 인플루언서/주최자 정산

---

## 6. 파트너 등급 체계

| 등급 | 조건 | 할인율 | 혜택 |
|------|------|--------|------|
| Standard | 기본 | 15% | 기본 조건 |
| Silver | 월 500만원 이상 | 18% | 결제 조건 완화 |
| Gold | 월 1,000만원 이상 | 20% | 전담 담당자 |
| Platinum | 월 3,000만원 이상 | 25% | VIP 서비스 |

---

## 7. KPI (핵심 성과 지표)

### 7.1 주요 KPI

| KPI | 정의 | 목표 | 측정 주기 |
|-----|------|------|----------|
| B2B 전환율 | 문의 대비 계약 체결 비율 | 30% | 월간 |
| 견적 응답 시간 | 문의~견적 발송까지 시간 | < 4시간 | 일간 |
| 파트너 유지율 | 연간 파트너 유지 비율 | 85% | 연간 |
| 공구 달성률 | 목표 수량 달성 비율 | 80% | 캠페인별 |
| 정산 정확도 | 정산 오류 없음 비율 | 99.9% | 월간 |

---

## 8. 정산 프로세스

```mermaid
flowchart LR
    A[판매 완료] --> B[정산 기간 종료]
    B --> C[정산 계산]
    C --> D[정산서 발송]
    D --> E{확인}
    E -->|승인| F[지급 처리]
    E -->|이의| G[재검토]
    G --> D
```

---

## 9. 연관 에이전트

| 관계 유형 | 에이전트 | 설명 |
|----------|---------|------|
| 협업 | Order Agent | B2B 주문 처리 연계 |
| 협업 | Inventory Agent | 재고 할당 연계 |
| 협업 | Accounting Agent | 정산/결제 연계 |
| 협업 | Marketing Agent | 공동구매 홍보 연계 |

---

## 10. 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | 2024-01-26 | AI Agent | 최초 작성 |

---

*이 문서는 Partnership Agent의 상세 스펙을 정의합니다.*
