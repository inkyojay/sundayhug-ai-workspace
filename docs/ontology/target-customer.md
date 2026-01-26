# 썬데이허그 타겟 고객 정의

> AI 에이전트의 고객 이해 및 맞춤 응대를 위한 핵심 온톨로지 문서

---

## 1. 주요 페르소나

### 1.1 페르소나 1: 첫째맘 "민지"

```yaml
persona_first_time_mom:
  id: PERSONA_FIRST_MOM
  name: "민지"
  archetype: "신중한 첫째맘"

  demographics:
    age: 32
    gender: "여성"
    location: "경기도 분당"
    occupation: "대기업 마케터 (현재 육아휴직)"
    income: "맞벌이 가구 연 1억원"
    education: "4년제 대학 졸업"
    marital_status: "기혼 3년차"

  baby_info:
    baby_age: "생후 4개월"
    baby_gender: "딸"
    birth_type: "첫째"

  psychographics:
    personality:
      - "꼼꼼하고 계획적"
      - "정보 수집을 철저히 함"
      - "불안감이 있지만 티 안 냄"
      - "완벽주의 성향"

    values:
      - "아기에게 최고만 주고 싶음"
      - "안전이 최우선"
      - "가격보다 품질"
      - "후기/리뷰 중시"

    interests:
      - "육아 정보 카페 활동"
      - "인스타 육아 계정 팔로우"
      - "제품 비교 분석"

  behavior:
    shopping_pattern:
      - "구매 전 최소 3일 리서치"
      - "네이버 카페 검색 필수"
      - "리뷰 최소 50개 이상 확인"
      - "가격비교 앱 사용"

    channel_preference:
      primary: "네이버 스마트스토어"
      secondary: "쿠팡"
      research: "네이버 카페, 인스타그램"

    decision_factors:
      1: "안전 인증 여부"
      2: "실제 사용 후기"
      3: "브랜드 신뢰도"
      4: "AS/교환 정책"
      5: "가격"

  pain_points:
    - "첫 아이라 뭐가 좋은지 모름"
    - "비싼 제품이 무조건 좋은 건지 의문"
    - "실패하면 어쩌나 하는 불안"
    - "정보 과잉으로 오히려 결정 어려움"
    - "아기가 안 쓰면 돈 낭비"

  goals:
    - "검증된 좋은 제품만 사고 싶다"
    - "선배맘들의 실제 경험을 알고 싶다"
    - "구매 후 후회하고 싶지 않다"

  triggers_to_buy:
    - "육아맘 카페 추천 글"
    - "인플루언서 실사용 후기"
    - "상세한 사용 가이드"
    - "교환/환불 정책 명확"

  objections:
    - "처음 들어보는 브랜드인데..."
    - "더 유명한 브랜드도 있는데..."
    - "사용 기간이 짧으면 아깝지 않을까?"

  communication_preference:
    tone: "전문적이면서 따뜻한"
    content: "상세한 정보, 근거 제시"
    response_speed: "빠른 답변 기대"

  sundayhug_message:
    hook: "처음이라 고민 많으시죠? 저도 그랬어요."
    value: "직접 써보고 엄선한 제품만 판매해요"
    proof: "실제 사용 후기 500건+"
```

### 1.2 페르소나 2: 둘째맘 "수진"

```yaml
persona_second_time_mom:
  id: PERSONA_SECOND_MOM
  name: "수진"
  archetype: "효율 추구 둘째맘"

  demographics:
    age: 36
    gender: "여성"
    location: "서울 마포구"
    occupation: "프리랜서 디자이너"
    income: "맞벌이 가구 연 8천만원"
    education: "4년제 대학 졸업"
    marital_status: "기혼 6년차"

  baby_info:
    first_child_age: "4세 (아들)"
    second_child_age: "생후 6개월 (딸)"
    birth_type: "둘째"

  psychographics:
    personality:
      - "효율적이고 실용적"
      - "시간이 부족함"
      - "경험에서 우러난 자신감"
      - "불필요한 건 과감히 생략"

    values:
      - "가성비 중시"
      - "실용성 우선"
      - "시간 절약"
      - "검증된 제품 재구매"

    interests:
      - "육아 꿀팁 공유"
      - "중고거래 활용"
      - "효율적 살림"

  behavior:
    shopping_pattern:
      - "첫째 때 좋았던 건 바로 재구매"
      - "리서치 시간 최소화"
      - "모바일 쇼핑 위주"
      - "정기배송/구독 선호"

    channel_preference:
      primary: "쿠팡 (로켓배송)"
      secondary: "네이버 스마트스토어"
      others: "중고나라, 당근마켓"

    decision_factors:
      1: "빠른 배송"
      2: "첫째 때 경험"
      3: "가성비"
      4: "간편한 구매 과정"
      5: "브랜드 (검증된)"

  pain_points:
    - "시간이 너무 부족"
    - "첫째 케어하면서 둘째 보기 힘듦"
    - "첫째 때 물건 재사용하고 싶은데 상태가..."
    - "뭐가 필요한지는 아는데 고를 시간이 없음"

  goals:
    - "빠르게 결정하고 빠르게 받고 싶다"
    - "검증된 제품 쉽게 찾고 싶다"
    - "둘째도 안전하게, 하지만 효율적으로"

  triggers_to_buy:
    - "로켓배송/당일배송"
    - "1+1, 묶음 할인"
    - "첫째 때 사용했던 브랜드"
    - "간단한 상품 설명"

  objections:
    - "첫째 때 안 써봤는데..."
    - "배송 언제 와요?"
    - "더 싼 데 없어요?"

  communication_preference:
    tone: "간결하고 핵심만"
    content: "빠른 정보 전달"
    response_speed: "즉시 답변 선호"

  sundayhug_message:
    hook: "바쁜 둘째맘을 위한 빠른 답변, 빠른 배송"
    value: "한 번 써보신 분들이 재구매하는 제품"
    proof: "재구매율 40%"
```

### 1.3 페르소나 3: 선물구매자 "현우"

```yaml
persona_gift_buyer:
  id: PERSONA_GIFT_BUYER
  name: "현우"
  archetype: "센스있는 선물러"

  demographics:
    age: 34
    gender: "남성"
    location: "서울 강남구"
    occupation: "IT 스타트업 PM"
    income: "연 6천만원"
    education: "4년제 대학 졸업"
    marital_status: "미혼"

  relationship_to_baby:
    type: "조카/지인 아기"
    closeness: "친한 친구 또는 형제의 아기"

  psychographics:
    personality:
      - "센스있다는 말 듣고 싶음"
      - "실용적인 걸 선물하고 싶음"
      - "육아는 잘 모름"
      - "선택 장애 있음"

    values:
      - "받는 사람이 진짜 쓸 수 있는 선물"
      - "적당한 가격대"
      - "포장/배송이 깔끔해야"
      - "고급스러워 보이면 좋겠음"

    interests:
      - "트렌디한 제품"
      - "SNS에서 본 것들"
      - "선물 추천 콘텐츠"

  behavior:
    shopping_pattern:
      - "출산 소식 듣고 바로 검색"
      - "'출산 선물 추천' 검색"
      - "가격대별 필터링"
      - "선물포장 옵션 확인"

    channel_preference:
      primary: "네이버 쇼핑"
      secondary: "쿠팡"
      research: "블로그, 유튜브"

    decision_factors:
      1: "선물 적합성"
      2: "가격대 (5-10만원)"
      3: "포장/배송"
      4: "브랜드 인지도"
      5: "리뷰"

  pain_points:
    - "뭘 사야 할지 모르겠음"
    - "이미 있는 거면 어쩌지"
    - "쓸모없는 선물이면 어쩌지"
    - "육아용품 처음 사봄"

  goals:
    - "센스있다는 말 듣고 싶다"
    - "받는 사람이 실제로 사용했으면"
    - "고민 없이 빠르게 결정하고 싶다"

  triggers_to_buy:
    - "'출산 선물 추천' 컨텐츠"
    - "선물세트/기프트박스"
    - "가격대별 추천"
    - "선물포장 무료"

  objections:
    - "이거 진짜 쓰는 거 맞아요?"
    - "사이즈/월령 맞춰야 하나요?"
    - "선물포장 되나요?"
    - "직접 전달 안 하는데 메시지 넣을 수 있어요?"

  communication_preference:
    tone: "친절하고 가이드해주는"
    content: "추천/큐레이션"
    response_speed: "보통"

  sundayhug_message:
    hook: "고민 없이 선물하세요, 엄마들이 진짜 원하는 제품"
    value: "실제 엄마들이 받고 싶어하는 선물"
    proof: "선물용 구매 만족도 98%"
```

---

## 2. 고객 여정 맵 (Customer Journey Map)

### 2.1 첫째맘 고객 여정

```yaml
journey_first_time_mom:
  stage_1_awareness:
    name: "인지 (Awareness)"
    duration: "임신 중기 ~ 출산 전"
    customer_action:
      - "육아 카페 가입 및 정보 수집"
      - "'출산준비물' 검색"
      - "지인에게 추천 요청"
    touchpoints:
      - "네이버 카페"
      - "인스타그램 육아 계정"
      - "블로그 후기"
    emotion: "기대 + 불안 (😊😰)"
    sundayhug_action:
      - "인스타그램 콘텐츠 노출"
      - "육아카페 체험단 진행"
      - "SEO 최적화된 블로그 콘텐츠"

  stage_2_consideration:
    name: "고려 (Consideration)"
    duration: "출산 1개월 전 ~ 출산 후 1개월"
    customer_action:
      - "브랜드별 비교"
      - "리뷰 정독"
      - "가격 비교"
      - "Q&A 문의"
    touchpoints:
      - "네이버 스마트스토어"
      - "쿠팡"
      - "브랜드 인스타그램"
    emotion: "고민 + 비교 (🤔)"
    sundayhug_action:
      - "상세한 제품 설명 페이지"
      - "빠른 Q&A 답변"
      - "경쟁 제품 대비 장점 명확화"

  stage_3_purchase:
    name: "구매 (Purchase)"
    duration: "결정 후 즉시"
    customer_action:
      - "최종 가격 확인"
      - "쿠폰/적립금 적용"
      - "결제"
    touchpoints:
      - "스마트스토어 결제"
      - "쿠팡 결제"
    emotion: "기대 + 살짝 불안 (😊😅)"
    sundayhug_action:
      - "간편한 결제 과정"
      - "첫 구매 쿠폰"
      - "주문 확인 메시지"

  stage_4_delivery:
    name: "배송 (Delivery)"
    duration: "결제 후 1-3일"
    customer_action:
      - "배송 추적"
      - "도착 확인"
      - "언박싱"
    touchpoints:
      - "배송 알림 (카카오톡)"
      - "택배"
    emotion: "기다림 → 설렘 (⏳😍)"
    sundayhug_action:
      - "빠른 출고"
      - "꼼꼼한 포장"
      - "배송 상태 알림"

  stage_5_usage:
    name: "사용 (Usage)"
    duration: "배송 후 ~"
    customer_action:
      - "제품 사용"
      - "사용법 확인"
      - "만족/불만족 경험"
    touchpoints:
      - "제품"
      - "사용설명서"
      - "카카오톡 CS"
    emotion: "만족 또는 당황 (😊 or 😓)"
    sundayhug_action:
      - "사용 가이드 제공"
      - "사용 팁 콘텐츠"
      - "빠른 CS 응대"

  stage_6_loyalty:
    name: "충성 (Loyalty)"
    duration: "재구매 시점"
    customer_action:
      - "리뷰 작성"
      - "지인 추천"
      - "재구매"
    touchpoints:
      - "리뷰 플랫폼"
      - "SNS"
      - "오프라인 대화"
    emotion: "만족 + 신뢰 (😊💙)"
    sundayhug_action:
      - "리뷰 작성 유도"
      - "재구매 할인"
      - "VIP 등급 안내"
```

### 2.2 고객 여정별 핵심 접점 요약

| 단계 | 핵심 접점 | AI 에이전트 역할 | 성공 지표 |
|------|----------|----------------|----------|
| **인지** | SNS, 카페 | 콘텐츠 기획 지원 | 도달율, 팔로워 |
| **고려** | 상품페이지, Q&A | 빠른 문의 응대 | Q&A 응답률, 전환율 |
| **구매** | 결제 페이지 | 장바구니 이탈 방지 | 구매 전환율 |
| **배송** | 카카오톡 알림 | 배송 상태 안내 | 배송 만족도 |
| **사용** | CS 채널 | 사용 문의 응대 | 문의 해결률 |
| **충성** | 리뷰, 재구매 | 리뷰 요청, VIP 관리 | 재구매율, NPS |

---

## 3. Pain Points 분석

### 3.1 페르소나별 Pain Points

```yaml
pain_points_matrix:
  first_time_mom:
    high_priority:
      - id: PP_FTM_01
        pain: "뭐가 좋은지 모르겠음"
        intensity: 9/10
        frequency: "매우 높음"
        solution: "상세한 비교 가이드, 추천 큐레이션"

      - id: PP_FTM_02
        pain: "실패하면 어쩌나 불안"
        intensity: 8/10
        frequency: "높음"
        solution: "교환/환불 정책 강조, 실사용 후기"

      - id: PP_FTM_03
        pain: "정보가 너무 많아 혼란"
        intensity: 7/10
        frequency: "높음"
        solution: "핵심 정보 요약, 명확한 추천"

    medium_priority:
      - id: PP_FTM_04
        pain: "아기가 안 쓰면 돈 낭비"
        intensity: 6/10
        frequency: "중간"
        solution: "사용 기간 안내, 중고 판매 팁"

  second_time_mom:
    high_priority:
      - id: PP_STM_01
        pain: "시간이 부족"
        intensity: 9/10
        frequency: "매우 높음"
        solution: "빠른 결제, 빠른 배송, 간결한 정보"

      - id: PP_STM_02
        pain: "첫째 케어하며 쇼핑 어려움"
        intensity: 8/10
        frequency: "높음"
        solution: "모바일 최적화, 원클릭 재구매"

    medium_priority:
      - id: PP_STM_03
        pain: "예산 제약"
        intensity: 6/10
        frequency: "중간"
        solution: "묶음 할인, 정기배송 할인"

  gift_buyer:
    high_priority:
      - id: PP_GB_01
        pain: "뭘 사야 할지 모름"
        intensity: 9/10
        frequency: "매우 높음"
        solution: "선물 추천 가이드, 선물세트"

      - id: PP_GB_02
        pain: "쓸모없는 선물이면 어쩌지"
        intensity: 8/10
        frequency: "높음"
        solution: "실사용 후기 강조, 인기 상품 추천"

    medium_priority:
      - id: PP_GB_03
        pain: "선물 포장/메시지"
        intensity: 5/10
        frequency: "높음"
        solution: "무료 선물포장, 메시지 카드"
```

### 3.2 공통 Pain Points 및 대응

| Pain Point | 대상 | 심각도 | AI 에이전트 대응 |
|------------|------|--------|----------------|
| **배송 지연 불안** | 전체 | 높음 | 실시간 배송 추적 안내, 선제적 알림 |
| **제품 선택 어려움** | 첫째맘, 선물러 | 높음 | 맞춤 추천, 비교 가이드 제공 |
| **사이즈/호환 불확실** | 전체 | 중간 | 명확한 스펙 안내, 호환성 체크 |
| **AS/교환 걱정** | 전체 | 중간 | 정책 명확히 안내, 간편한 절차 |
| **품질 불안** | 첫째맘 | 중간 | 인증서/테스트 결과 공유 |

### 3.3 Pain Point 감지 신호

```yaml
pain_point_detection:
  keywords:
    uncertainty:
      - "어떤 게 좋아요?"
      - "추천해주세요"
      - "비교해주세요"
      - "차이가 뭐예요?"

    anxiety:
      - "걱정돼요"
      - "불안해요"
      - "실패하면"
      - "환불 가능해요?"

    time_pressure:
      - "급해요"
      - "빨리"
      - "언제 와요"
      - "출산 예정일이"

    budget_concern:
      - "비싸요"
      - "할인"
      - "쿠폰"
      - "더 싼 거"

  response_strategy:
    uncertainty: "명확한 추천 + 근거 제시"
    anxiety: "공감 + 안심 정보 제공"
    time_pressure: "빠른 응답 + 배송 정보 강조"
    budget_concern: "가성비 강조 + 할인 정보"
```

---

## 4. 고객 세그먼트 정의

### 4.1 가치 기반 세그먼트

```yaml
customer_segments:
  vip:
    id: SEGMENT_VIP
    name: "VIP 고객"
    criteria:
      - "누적 구매 금액 50만원 이상"
      - "OR 구매 횟수 5회 이상"
      - "OR 리뷰 작성 3회 이상 (포토리뷰 포함)"

    characteristics:
      - "브랜드 충성도 높음"
      - "재구매 주기 짧음"
      - "주변 추천 활발"

    value:
      ltv_estimate: "100만원+"
      referral_potential: "높음"

    treatment:
      priority: "최우선"
      response_time: "30분 이내"
      benefits:
        - "전용 할인 쿠폰 (10%)"
        - "신제품 우선 안내"
        - "무료 배송"
        - "교환/환불 우대"

    communication:
      tone: "특별 대우, 감사 강조"
      channel: "카카오톡 개인 메시지"

  regular:
    id: SEGMENT_REGULAR
    name: "일반 고객"
    criteria:
      - "구매 이력 1-4회"
      - "누적 구매 금액 10만원-50만원"

    characteristics:
      - "브랜드 인지도 있음"
      - "재구매 가능성 있음"
      - "아직 충성도 형성 중"

    value:
      ltv_estimate: "30-50만원"
      referral_potential: "중간"

    treatment:
      priority: "표준"
      response_time: "2시간 이내"
      benefits:
        - "재구매 시 5% 할인"
        - "리뷰 작성 시 적립금"

    communication:
      tone: "친절하고 전문적"
      channel: "자동화 + 필요시 수동"

    upgrade_trigger:
      - "3회 이상 구매"
      - "누적 50만원 달성"
      - "포토리뷰 작성"

  new_customer:
    id: SEGMENT_NEW
    name: "신규 고객"
    criteria:
      - "첫 구매"
      - "또는 첫 문의"

    characteristics:
      - "브랜드 경험 없음"
      - "불확실성 높음"
      - "첫인상이 중요"

    value:
      ltv_estimate: "미확정"
      conversion_priority: "높음"

    treatment:
      priority: "높음 (전환 목적)"
      response_time: "1시간 이내"
      benefits:
        - "첫 구매 10% 할인"
        - "무료 배송 쿠폰"

    communication:
      tone: "환영, 안심, 가이드"
      channel: "적극적 응대"

    conversion_actions:
      - "첫 구매 쿠폰 안내"
      - "베스트셀러 추천"
      - "FAQ 선제적 안내"

  at_risk:
    id: SEGMENT_AT_RISK
    name: "이탈 위험 고객"
    criteria:
      - "마지막 구매 후 6개월 이상 경과"
      - "OR 최근 부정적 리뷰/CS 이력"
      - "OR 환불/교환 2회 이상"

    characteristics:
      - "재구매 의향 낮음"
      - "불만족 경험 가능성"
      - "이탈 가능성 높음"

    value:
      ltv_estimate: "감소 추세"
      recovery_priority: "중간"

    treatment:
      priority: "관리 필요"
      response_time: "1시간 이내"
      benefits:
        - "컴백 쿠폰 (15%)"
        - "개인화된 추천"

    communication:
      tone: "진심어린 관심, 문제 해결 의지"
      channel: "개인화 메시지"

    recovery_actions:
      - "이탈 원인 파악"
      - "맞춤 쿠폰 발송"
      - "신제품 안내"
      - "만족도 조사"
```

### 4.2 세그먼트 전환 규칙

```yaml
segment_transition_rules:
  new_to_regular:
    trigger: "첫 구매 완료"
    action: "환영 메시지 + 재구매 쿠폰"

  regular_to_vip:
    trigger:
      - "누적 구매 50만원 달성"
      - "OR 5회 구매 달성"
    action: "VIP 등업 축하 + 혜택 안내"

  any_to_at_risk:
    trigger:
      - "6개월 무활동"
      - "부정적 리뷰"
      - "환불 2회+"
    action: "이탈 방지 캠페인 대상 등록"

  at_risk_to_regular:
    trigger: "재구매 발생"
    action: "감사 메시지 + 리텐션 쿠폰"

  vip_to_at_risk:
    trigger: "6개월 무활동"
    action: "VIP 전용 컴백 쿠폰 + 대표 직접 연락 고려"
```

### 4.3 세그먼트별 AI 응대 차이

| 항목 | VIP | 일반 | 신규 | 이탈위험 |
|------|-----|------|------|---------|
| **응답 우선순위** | 1순위 | 3순위 | 2순위 | 2순위 |
| **응답 시간 목표** | 30분 | 2시간 | 1시간 | 1시간 |
| **자동화 레벨** | 낮음 (수동 개입) | 높음 | 중간 | 낮음 |
| **할인 권한** | 10%까지 자동 | 5%까지 자동 | 첫구매 쿠폰 | 15%까지 자동 |
| **에스컬레이션** | 모든 불만 즉시 | 심각한 불만만 | 구매 망설임 | 모든 문의 |
| **톤앤매너** | 특별대우 | 표준 | 환영/가이드 | 진심/회복 |

---

## 5. 부록

### 5.1 페르소나 활용 가이드

```yaml
persona_usage_guide:
  customer_identification:
    method: "구매/문의 데이터 기반 추정"
    signals:
      first_time_mom:
        - "첫 구매"
        - "상세한 질문 많음"
        - "비교 문의"
      second_time_mom:
        - "재구매 이력"
        - "간단한 문의"
        - "빠른 결정"
      gift_buyer:
        - "선물 포장 요청"
        - "배송지가 다름"
        - "사이즈/월령 질문"

  communication_adjustment:
    first_time_mom: "상세하고 안심시키는 답변"
    second_time_mom: "간결하고 핵심만"
    gift_buyer: "추천과 가이드 중심"
```

### 5.2 고객 데이터 수집 항목

| 데이터 | 수집 방법 | 활용 |
|--------|----------|------|
| 구매 이력 | 주문 데이터 | 세그먼트 분류, 추천 |
| 문의 이력 | CS 로그 | 니즈 파악, 이탈 예측 |
| 리뷰 | 플랫폼 리뷰 | 만족도 측정, VIP 판별 |
| 아기 월령 | 문의 시 수집 | 제품 추천 |
| 선호 채널 | 활동 데이터 | 커뮤니케이션 최적화 |

### 5.3 문서 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2024-01-26 | AI System | 최초 작성 |

### 5.4 관련 문서

- [미션, 비전 및 핵심가치](./mission-vision.md)
- [브랜드 보이스 가이드](./brand-voice.md)
- [제품 분류 체계](./product-taxonomy.md)

---

*이 문서는 썬데이허그 AI 에이전트가 고객을 이해하고 맞춤 응대를 제공하기 위한 핵심 참조 문서입니다. 고객 세그먼트와 페르소나에 따라 적절한 커뮤니케이션 전략을 적용합니다.*
