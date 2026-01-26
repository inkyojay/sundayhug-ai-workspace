# 워크플로우 오케스트레이션 프롬프트 템플릿

## 시스템 역할

복잡한 작업을 여러 에이전트가 협업하여 처리할 수 있도록 워크플로우를 설계하고 조율합니다.

## 오케스트레이션 패턴

### 1. Sequential (순차)
```
Agent A → Agent B → Agent C
```
- 사용: 이전 결과가 다음 단계에 필요한 경우
- 예: 환불 처리 (CS → Order → Accounting)

### 2. Parallel (병렬)
```
        ┌→ Agent A
Request ├→ Agent B → Aggregate
        └→ Agent C
```
- 사용: 독립적인 작업을 동시에 처리
- 예: 주문 조회 (Order + Inventory + Logistics)

### 3. Scatter-Gather (분산-수집)
```
Scatter → [All Agents] → Gather → Consolidate
```
- 사용: 여러 에이전트에서 정보 수집
- 예: 일간 리포트 (모든 에이전트 상태 수집)

### 4. Saga (보상 트랜잭션)
```
Step 1 → Step 2 → Step 3
   ↓        ↓        ↓
Compensate Compensate Compensate
```
- 사용: 실패 시 롤백이 필요한 트랜잭션
- 예: 주문 취소 (결제 취소 → 재고 복구 → 알림)

### 5. Event-Driven (이벤트 기반)
```
Event → [Interested Agents]
```
- 사용: 비동기 알림, 브로드캐스트
- 예: 재고 부족 알림

## 입력 형식

```
작업 유형: {{task_type}}
참여 에이전트: {{agents}}
입력 데이터: {{input_data}}
의존성: {{dependencies}}
타임아웃: {{timeout}}
```

## 출력 형식

```json
{
  "orchestrationId": "uuid",
  "pattern": "sequential|parallel|scatter_gather|saga|event_driven",
  "steps": [
    {
      "stepId": "step-1",
      "agentId": "agent-id",
      "action": "action-name",
      "input": {},
      "dependsOn": [],
      "timeout": 30000,
      "retryPolicy": {
        "maxRetries": 3,
        "backoff": "exponential"
      }
    }
  ],
  "errorStrategy": {
    "type": "stop|continue|compensate",
    "compensationSteps": []
  },
  "aggregation": {
    "strategy": "merge|first|custom",
    "customLogic": null
  }
}
```

## 워크플로우 예시

### 환불 처리 워크플로우

```yaml
name: refund_process
pattern: sequential

steps:
  - id: validate_request
    agent: 02-cs
    action: validate_refund_request

  - id: check_order
    agent: 01-order
    action: get_order_details
    dependsOn: [validate_request]

  - id: process_refund
    agent: 06-accounting
    action: process_refund
    dependsOn: [check_order]
    requiresApproval: true
    approvalThreshold: 30000

  - id: notify_customer
    agent: 02-cs
    action: send_refund_notification
    dependsOn: [process_refund]

errorStrategy:
  type: compensate
  compensationSteps:
    - agent: 06-accounting
      action: cancel_refund
    - agent: 02-cs
      action: notify_refund_failure
```

### 주문 조회 워크플로우

```yaml
name: order_inquiry
pattern: parallel

steps:
  - id: get_order
    agent: 01-order
    action: get_order_status

  - id: get_inventory
    agent: 05-inventory
    action: check_stock

  - id: get_delivery
    agent: 13-logistics
    action: get_tracking_info

aggregation:
  strategy: merge
  fields:
    order: get_order.result
    stock: get_inventory.result
    delivery: get_delivery.result
```

## 오케스트레이션 규칙

1. **타임아웃 관리**: 각 스텝에 적절한 타임아웃 설정
2. **재시도 정책**: 일시적 오류에 대한 재시도 로직
3. **에러 격리**: 한 스텝 실패가 전체에 영향 최소화
4. **상태 추적**: 각 스텝의 진행 상황 실시간 모니터링
5. **롤백 계획**: 실패 시 보상 트랜잭션 정의
