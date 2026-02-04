# Sundayhug AI Agent System - Automation Schedule

> 썬데이허그 AI 에이전트 시스템의 자동화 작업 스케줄 정의서
>
> 최종 업데이트: 2026-01-26

---

## 목차

1. [실시간 (Event-driven)](#1-실시간-event-driven)
2. [시간별 (Hourly)](#2-시간별-hourly)
3. [일별 (Daily)](#3-일별-daily)
4. [주별 (Weekly)](#4-주별-weekly)
5. [월별 (Monthly)](#5-월별-monthly)
6. [분기/연간 (Quarterly/Yearly)](#6-분기연간-quarterlyyearly)

---

## 우선순위 정의

| 등급 | 설명 | 응답 시간 |
|------|------|----------|
| **P0** | Critical - 즉시 처리 필수 | < 1분 |
| **P1** | High - 빠른 처리 필요 | < 5분 |
| **P2** | Medium - 일반 처리 | < 30분 |
| **P3** | Low - 여유있게 처리 | < 2시간 |

---

## 1. 실시간 (Event-driven)

> 이벤트 발생 즉시 트리거되는 작업들

| Job ID | 작업명 | Trigger | 담당 Workflow | 담당 Agent | 설명 | 우선순위 |
|--------|--------|---------|---------------|------------|------|----------|
| `EVT-001` | 신규 주문 알림 | `order.created` | `order-processing.yaml` | Order Agent | 신규 주문 접수 시 카카오톡 알림 발송 및 주문 처리 시작 | **P0** |
| `EVT-002` | CS 문의 라우팅 | `cs.inquiry.received` | `cs-routing.yaml` | CS Agent | 고객 문의 접수 시 카테고리 분류 및 담당자 배정 | **P0** |
| `EVT-003` | 재고 부족 알림 | `inventory.low_stock` | `inventory-alert.yaml` | Inventory Agent | 안전재고 이하 감지 시 알림 및 발주 제안 | **P0** |
| `EVT-004` | 위기 감지 (부정 리뷰) | `review.negative.detected` | `crisis-detection.yaml` | Marketing Agent | 2점 이하 리뷰 감지 시 즉시 알림 및 대응 가이드 제공 | **P0** |
| `EVT-005` | 결제 완료 처리 | `payment.completed` | `payment-processing.yaml` | Order Agent | 결제 완료 시 주문 확정 및 배송 준비 시작 | **P1** |
| `EVT-006` | 환불 요청 처리 | `refund.requested` | `refund-processing.yaml` | Order Agent | 환불 요청 접수 시 자동 검토 및 처리 | **P1** |
| `EVT-007` | 배송 상태 변경 | `shipping.status.changed` | `shipping-notification.yaml` | Order Agent | 배송 상태 변경 시 고객 알림 | **P2** |

### Event Trigger 설정

```yaml
# Event-driven jobs configuration
events:
  order.created:
    source: [naver, coupang, kakao, self]
    webhook: /webhooks/order/new

  cs.inquiry.received:
    source: [kakao_channel, naver_talk, email]
    webhook: /webhooks/cs/inquiry

  inventory.low_stock:
    threshold: safety_stock
    check_interval: realtime

  review.negative.detected:
    rating_threshold: 2
    sentiment_threshold: -0.5

  payment.completed:
    source: [pg_callback]
    webhook: /webhooks/payment/complete
```

---

## 2. 시간별 (Hourly)

> 매시간 실행되는 정기 작업

| Job ID | 작업명 | Cron 표현식 | 담당 Workflow | 담당 Agent | 설명 | 우선순위 |
|--------|--------|-------------|---------------|------------|------|----------|
| `HRL-001` | 네이버 주문 동기화 | `0 * * * *` | `sync-orders-naver.yaml` | Data Sync Agent | 네이버 스마트스토어 주문 동기화 | **P1** |
| `HRL-002` | 쿠팡 주문 동기화 | `5 * * * *` | `sync-orders-coupang.yaml` | Data Sync Agent | 쿠팡 주문 동기화 | **P1** |
| `HRL-003` | 카카오 주문 동기화 | `10 * * * *` | `sync-orders-kakao.yaml` | Data Sync Agent | 카카오톡 스토어 주문 동기화 | **P1** |
| `HRL-004` | 통합 재고 동기화 | `15 * * * *` | `sync-inventory.yaml` | Inventory Agent | 전 채널 재고 수량 동기화 | **P1** |
| `HRL-005` | CS 미처리 알림 | `30 * * * *` | `cs-pending-alert.yaml` | CS Agent | 1시간 이상 미처리 CS 건 알림 | **P1** |
| `HRL-006` | 실시간 매출 집계 | `45 * * * *` | `hourly-sales-summary.yaml` | Analytics Agent | 시간별 매출 현황 집계 | **P2** |
| `HRL-007` | 경쟁사 가격 모니터링 | `50 * * * *` | `price-monitoring.yaml` | Marketing Agent | 경쟁사 가격 변동 체크 | **P3** |

### Hourly Jobs 실행 시간 분산

```
:00 - 네이버 동기화
:05 - 쿠팡 동기화
:10 - 카카오 동기화
:15 - 재고 동기화
:30 - CS 미처리 알림
:45 - 매출 집계
:50 - 가격 모니터링
```

---

## 3. 일별 (Daily)

> 매일 특정 시간에 실행되는 정기 작업

| Job ID | 작업명 | Cron 표현식 | 담당 Workflow | 담당 Agent | 설명 | 우선순위 |
|--------|--------|-------------|---------------|------------|------|----------|
| `DLY-001` | 일일 정산 | `0 23 * * *` | `daily-settlement.yaml` | Finance Agent | 전 채널 일일 매출/수수료 정산 | **P1** |
| `DLY-002` | 일일 리포트 (카카오톡) | `0 9 * * *` | `daily-report-kakao.yaml` | Analytics Agent | 전일 실적 요약 리포트 카카오톡 발송 | **P1** |
| `DLY-003` | 배송 상태 일괄 업데이트 | `0 6 * * *` | `shipping-status-batch.yaml` | Order Agent | 전체 배송 상태 일괄 조회 및 업데이트 | **P1** |
| `DLY-004` | 리뷰 수집 (네이버) | `0 7 * * *` | `collect-reviews-naver.yaml` | Marketing Agent | 네이버 신규 리뷰 수집 및 분석 | **P2** |
| `DLY-005` | 리뷰 수집 (쿠팡) | `10 7 * * *` | `collect-reviews-coupang.yaml` | Marketing Agent | 쿠팡 신규 리뷰 수집 및 분석 | **P2** |
| `DLY-006` | 소셜 리스닝 | `0 8 * * *` | `social-listening.yaml` | Marketing Agent | SNS/커뮤니티 브랜드 언급 수집 | **P2** |
| `DLY-007` | DB 백업 | `0 4 * * *` | `database-backup.yaml` | System Agent | 전체 데이터베이스 백업 | **P1** |
| `DLY-008` | 미발송 주문 체크 | `0 10 * * *` | `unfulfilled-orders.yaml` | Order Agent | 48시간 이상 미발송 주문 알림 | **P1** |
| `DLY-009` | 키워드 순위 체크 | `0 11 * * *` | `keyword-ranking.yaml` | Marketing Agent | 네이버 검색 키워드 순위 체크 | **P2** |
| `DLY-010` | 광고 성과 집계 | `0 2 * * *` | `ads-performance.yaml` | Marketing Agent | 전일 광고 성과 집계 (ROAS 등) | **P2** |

### Daily Jobs 타임라인

```
04:00 - DB 백업
06:00 - 배송 상태 업데이트
07:00 - 리뷰 수집 (네이버)
07:10 - 리뷰 수집 (쿠팡)
08:00 - 소셜 리스닝
09:00 - 일일 리포트 발송 ← 업주 출근 시간
10:00 - 미발송 주문 체크
11:00 - 키워드 순위 체크
23:00 - 일일 정산
02:00 - 광고 성과 집계 (익일)
```

---

## 4. 주별 (Weekly)

> 매주 특정 요일에 실행되는 정기 작업

| Job ID | 작업명 | Cron 표현식 | 담당 Workflow | 담당 Agent | 설명 | 우선순위 |
|--------|--------|-------------|---------------|------------|------|----------|
| `WKL-001` | 주간 분석 리포트 | `0 9 * * 1` | `weekly-analytics.yaml` | Analytics Agent | 주간 실적/트렌드 분석 리포트 생성 (월요일) | **P1** |
| `WKL-002` | 마케팅 성과 분석 | `0 10 * * 1` | `marketing-performance.yaml` | Marketing Agent | 주간 마케팅 캠페인 성과 분석 (월요일) | **P2** |
| `WKL-003` | 재고 리뷰 | `0 9 * * 3` | `inventory-review.yaml` | Inventory Agent | 주간 재고 현황 분석 및 발주 제안 (수요일) | **P2** |
| `WKL-004` | CS 품질 분석 | `0 14 * * 5` | `cs-quality-analysis.yaml` | CS Agent | 주간 CS 응대 품질 분석 (금요일) | **P2** |
| `WKL-005` | FAQ 업데이트 | `0 15 * * 5` | `faq-update.yaml` | CS Agent | 자주 묻는 질문 분석 및 FAQ 업데이트 (금요일) | **P3** |
| `WKL-006` | 경쟁사 분석 | `0 11 * * 1` | `competitor-analysis.yaml` | Marketing Agent | 주간 경쟁사 동향 분석 (월요일) | **P3** |
| `WKL-007` | 베스트셀러 분석 | `0 13 * * 1` | `bestseller-analysis.yaml` | Analytics Agent | 주간 인기 상품 트렌드 분석 (월요일) | **P2** |
| `WKL-008` | 시스템 헬스 체크 | `0 5 * * 0` | `system-health.yaml` | System Agent | 주간 시스템 상태 점검 (일요일) | **P2** |

### Weekly Jobs 요일별 배치

```
일요일: 시스템 헬스 체크 (05:00)
월요일: 주간 리포트 (09:00) → 마케팅 성과 (10:00) → 경쟁사 분석 (11:00) → 베스트셀러 (13:00)
수요일: 재고 리뷰 (09:00)
금요일: CS 품질 분석 (14:00) → FAQ 업데이트 (15:00)
```

---

## 5. 월별 (Monthly)

> 매월 특정 일에 실행되는 정기 작업

| Job ID | 작업명 | Cron 표현식 | 담당 Workflow | 담당 Agent | 설명 | 우선순위 |
|--------|--------|-------------|---------------|------------|------|----------|
| `MTH-001` | 월간 정산 | `0 10 1 * *` | `monthly-settlement.yaml` | Finance Agent | 전월 매출/비용 최종 정산 (매월 1일) | **P1** |
| `MTH-002` | 부가세 계산 | `0 11 1 * *` | `vat-calculation.yaml` | Finance Agent | 월별 부가세 예상액 계산 (매월 1일) | **P1** |
| `MTH-003` | 월간 KPI 리포트 | `0 9 2 * *` | `monthly-kpi-report.yaml` | Analytics Agent | 월간 KPI 달성률 분석 리포트 (매월 2일) | **P1** |
| `MTH-004` | 고객 세그먼트 갱신 | `0 3 1 * *` | `customer-segmentation.yaml` | Analytics Agent | RFM 분석 기반 고객 세그먼트 갱신 (매월 1일) | **P2** |
| `MTH-005` | 지원사업 탐색 | `0 9 15 * *` | `subsidy-search.yaml` | Biz Support Agent | 신규 정부/지자체 지원사업 탐색 (매월 15일) | **P2** |
| `MTH-006` | 채널 수수료 분석 | `0 14 5 * *` | `channel-fee-analysis.yaml` | Finance Agent | 채널별 수수료 비교 분석 (매월 5일) | **P2** |
| `MTH-007` | 휴면 고객 관리 | `0 10 10 * *` | `dormant-customer.yaml` | Marketing Agent | 휴면 고객 재활성화 캠페인 (매월 10일) | **P3** |
| `MTH-008` | 재고 회전율 분석 | `0 9 5 * *` | `inventory-turnover.yaml` | Inventory Agent | 월간 재고 회전율 분석 (매월 5일) | **P2** |
| `MTH-009` | 리뷰 트렌드 분석 | `0 10 3 * *` | `review-trend.yaml` | Marketing Agent | 월간 리뷰 트렌드 및 인사이트 (매월 3일) | **P2** |

### Monthly Jobs 일자별 배치

```
1일:  월간 정산 (10:00) → 부가세 계산 (11:00), 고객 세그먼트 갱신 (03:00)
2일:  월간 KPI 리포트 (09:00)
3일:  리뷰 트렌드 분석 (10:00)
5일:  채널 수수료 분석 (14:00), 재고 회전율 분석 (09:00)
10일: 휴면 고객 관리 (10:00)
15일: 지원사업 탐색 (09:00)
```

---

## 6. 분기/연간 (Quarterly/Yearly)

> 분기 또는 연간 단위로 실행되는 정기 작업

### 분기별 (Quarterly)

| Job ID | 작업명 | Cron 표현식 | 담당 Workflow | 담당 Agent | 설명 | 우선순위 |
|--------|--------|-------------|---------------|------------|------|----------|
| `QTR-001` | 분기 결산 | `0 10 1 1,4,7,10 *` | `quarterly-closing.yaml` | Finance Agent | 분기별 재무 결산 (1,4,7,10월 1일) | **P1** |
| `QTR-002` | 분기 부가세 신고 준비 | `0 9 15 1,4,7,10 *` | `vat-report-prep.yaml` | Finance Agent | 부가세 신고 자료 준비 (1,4,7,10월 15일) | **P1** |
| `QTR-003` | 분기 사업 리뷰 | `0 9 5 1,4,7,10 *` | `quarterly-review.yaml` | Analytics Agent | 분기별 사업 성과 리뷰 | **P2** |
| `QTR-004` | 시즌 상품 기획 | `0 9 1 2,5,8,11 *` | `seasonal-planning.yaml` | Marketing Agent | 다음 분기 시즌 상품 기획 | **P2** |

### 연간 (Yearly)

| Job ID | 작업명 | Cron 표현식 | 담당 Workflow | 담당 Agent | 설명 | 우선순위 |
|--------|--------|-------------|---------------|------------|------|----------|
| `YRL-001` | 연간 결산 | `0 10 2 1 *` | `yearly-closing.yaml` | Finance Agent | 연간 재무 결산 (1월 2일) | **P0** |
| `YRL-002` | 지재권 갱신 체크 | `0 9 1 1 *` | `ip-renewal-check.yaml` | Legal Agent | 상표/특허 갱신 일정 체크 (1월 1일) | **P1** |
| `YRL-003` | 연간 KPI 리뷰 | `0 9 3 1 *` | `yearly-kpi-review.yaml` | Analytics Agent | 연간 목표 달성률 분석 (1월 3일) | **P1** |
| `YRL-004` | 연간 사업 계획 | `0 9 10 1 *` | `yearly-planning.yaml` | Biz Support Agent | 신년도 사업 계획 수립 지원 (1월 10일) | **P2** |
| `YRL-005` | 4대보험 정산 | `0 9 10 3 *` | `insurance-settlement.yaml` | Finance Agent | 연간 4대보험 정산 (3월 10일) | **P1** |

### 분기/연간 캘린더

```
1월:  연간 결산(2일), 지재권 체크(1일), 연간 KPI 리뷰(3일), 사업 계획(10일), 분기 결산(1일), 부가세 준비(15일)
2월:  시즌 상품 기획(1일)
3월:  4대보험 정산(10일)
4월:  분기 결산(1일), 분기 리뷰(5일), 부가세 준비(15일)
5월:  시즌 상품 기획(1일)
7월:  분기 결산(1일), 분기 리뷰(5일), 부가세 준비(15일)
8월:  시즌 상품 기획(1일)
10월: 분기 결산(1일), 분기 리뷰(5일), 부가세 준비(15일)
11월: 시즌 상품 기획(1일)
```

---

## Job 실행 설정

### 공통 설정

```yaml
# config/scheduler-config.yaml
scheduler:
  timezone: "Asia/Seoul"
  max_retries: 3
  retry_delay: 300  # 5분

  notification:
    on_failure: true
    on_success: false  # P0/P1만 true
    channels:
      - kakao_channel
      - slack

  logging:
    level: INFO
    retention_days: 90
```

### 실행 환경 조건

```yaml
execution_conditions:
  # 영업일만 실행
  business_days_only:
    - DLY-002  # 일일 리포트
    - HRL-005  # CS 미처리 알림

  # 주말 제외
  exclude_weekends:
    - HRL-006  # 실시간 매출 집계

  # 공휴일 스킵
  skip_holidays:
    - MTH-005  # 지원사업 탐색
```

---

## 모니터링 및 알림

### Job 실패 시 알림 설정

| 우선순위 | 알림 채널 | 에스컬레이션 |
|----------|----------|--------------|
| **P0** | 카카오톡 + 전화 | 즉시 |
| **P1** | 카카오톡 + 슬랙 | 5분 후 |
| **P2** | 슬랙 | 30분 후 |
| **P3** | 이메일 | 다음 영업일 |

### 대시보드

```
Grafana Dashboard: /dashboards/cron-jobs-monitoring
- 실행 성공률
- 평균 실행 시간
- 실패 로그
- 대기 중인 Job
```

---

## 유지보수 가이드

### Job 추가 절차

1. 이 문서에 Job 정보 추가
2. Workflow YAML 파일 생성 (`/workflows/`)
3. Agent 매핑 설정
4. 테스트 실행
5. 프로덕션 배포

### Job 비활성화

```bash
# 특정 Job 일시 중지
./scripts/scheduler.sh pause JOB_ID

# 재개
./scripts/scheduler.sh resume JOB_ID
```

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-26 | 1.0.0 | 최초 작성 | AI Agent |

---

> **Note**: 모든 시간은 한국 시간(KST, Asia/Seoul) 기준입니다.
