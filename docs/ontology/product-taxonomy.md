# 썬데이허그 제품 분류 체계

> AI 에이전트의 제품 관리 및 추천을 위한 핵심 온톨로지 문서

---

## 1. 제품 카테고리 계층 구조

### 1.1 카테고리 트리

```
SUNDAYHUG (ROOT)
│
├── BED (아기침대)
│   ├── BED-COMP (절충형 아기침대)
│   │   ├── BED-COMP-STD (표준형)
│   │   ├── BED-COMP-PRM (프리미엄)
│   │   └── BED-COMP-TRV (휴대용)
│   │
│   ├── BED-BSNT (바시넷)
│   │   ├── BED-BSNT-FLD (접이식)
│   │   └── BED-BSNT-ROK (흔들림)
│   │
│   └── BED-ACCS (침대 액세서리)
│       ├── BED-ACCS-MAT (매트리스)
│       ├── BED-ACCS-BMP (범퍼)
│       └── BED-ACCS-NET (모기장)
│
├── SLEEP (수면용품)
│   ├── SLEEP-BAG (슬리핑백)
│   │   ├── SLEEP-BAG-SUM (여름용)
│   │   ├── SLEEP-BAG-WIN (겨울용)
│   │   └── SLEEP-BAG-4SS (사계절용)
│   │
│   ├── SLEEP-SWD (스와들)
│   │   ├── SLEEP-SWD-BSC (기본형)
│   │   ├── SLEEP-SWD-ZIP (지퍼형)
│   │   └── SLEEP-SWD-TRS (트랜지션)
│   │
│   └── SLEEP-ACCS (수면 액세서리)
│       ├── SLEEP-ACCS-PLW (베개)
│       └── SLEEP-ACCS-BLK (이불)
│
├── SOUND (사운드)
│   ├── SOUND-WN (백색소음기)
│   │   ├── SOUND-WN-BSC (기본형)
│   │   ├── SOUND-WN-PRM (프리미엄)
│   │   └── SOUND-WN-PRT (휴대용)
│   │
│   └── SOUND-ACCS (사운드 액세서리)
│       └── SOUND-ACCS-CHG (충전기)
│
└── ACCS (육아 액세서리)
    ├── ACCS-FEED (수유용품)
    │   ├── ACCS-FEED-PLW (수유쿠션)
    │   └── ACCS-FEED-CVR (수유커버)
    │
    ├── ACCS-BATH (목욕용품)
    │   ├── ACCS-BATH-TUB (욕조)
    │   └── ACCS-BATH-TWL (타월)
    │
    └── ACCS-ETC (기타)
        ├── ACCS-ETC-MBL (모빌)
        └── ACCS-ETC-TOY (장난감)
```

### 1.2 카테고리 코드 체계

```yaml
category_code_system:
  structure: "{LEVEL1}-{LEVEL2}-{LEVEL3}"

  level1:  # 대분류
    BED: "아기침대"
    SLEEP: "수면용품"
    SOUND: "사운드"
    ACCS: "액세서리"

  level2:  # 중분류
    # BED 하위
    COMP: "절충형"
    BSNT: "바시넷"
    ACCS: "액세서리"

    # SLEEP 하위
    BAG: "슬리핑백"
    SWD: "스와들"

    # SOUND 하위
    WN: "백색소음기"

    # ACCS 하위
    FEED: "수유용품"
    BATH: "목욕용품"
    ETC: "기타"

  level3:  # 소분류
    # 공통
    STD: "표준형"
    BSC: "기본형"
    PRM: "프리미엄"
    TRV: "휴대용"
    PRT: "포터블"

    # 시즌
    SUM: "여름용"
    WIN: "겨울용"
    4SS: "사계절"

    # 형태
    FLD: "접이식"
    ROK: "흔들림"
    ZIP: "지퍼형"
    TRS: "트랜지션"

    # 제품별
    MAT: "매트리스"
    BMP: "범퍼"
    NET: "모기장"
    PLW: "베개"
    BLK: "이불"
    TUB: "욕조"
    TWL: "타월"
    MBL: "모빌"
    TOY: "장난감"
    CVR: "커버"
    CHG: "충전기"
```

### 1.3 카테고리별 상세 정보

```yaml
category_details:
  BED-COMP:
    name_ko: "절충형 아기침대"
    name_en: "Compact Baby Bed"
    description: "접이식 기능이 있어 이동과 보관이 편리한 아기침대"
    target_age: "0-24개월"
    key_features:
      - "접이식 구조"
      - "높이 조절"
      - "이동 바퀴"
    price_range: "150,000-350,000원"
    bestseller: true
    margin_tier: "A"

  SLEEP-BAG:
    name_ko: "슬리핑백"
    name_en: "Sleeping Bag"
    description: "아기를 감싸 안전하고 편안한 수면 환경을 제공"
    target_age: "0-36개월"
    key_features:
      - "TOG 등급별 보온성"
      - "양방향 지퍼"
      - "통기성 원단"
    price_range: "35,000-80,000원"
    bestseller: true
    margin_tier: "B"

  SLEEP-SWD:
    name_ko: "스와들"
    name_en: "Swaddle"
    description: "신생아의 모로반사를 줄여주는 포대기형 제품"
    target_age: "0-6개월"
    key_features:
      - "탈착식 날개"
      - "신축성 원단"
      - "안전한 고정"
    price_range: "25,000-55,000원"
    bestseller: false
    margin_tier: "B"

  SOUND-WN:
    name_ko: "백색소음기"
    name_en: "White Noise Machine"
    description: "아기의 숙면을 돕는 다양한 백색소음 제공"
    target_age: "0-24개월+"
    key_features:
      - "다양한 사운드"
      - "타이머 기능"
      - "휴대성"
    price_range: "30,000-80,000원"
    bestseller: true
    margin_tier: "A"
```

---

## 2. SKU 명명 규칙

### 2.1 SKU 구조

```yaml
sku_structure:
  format: "SH-{CATEGORY}-{PRODUCT}-{VARIANT}-{OPTION}"
  total_length: "최대 20자"

  components:
    prefix:
      value: "SH"
      meaning: "SundayHug 브랜드 식별자"

    category:
      length: "2-4자"
      source: "카테고리 Level2 코드"
      examples:
        - "COMP"  # 절충형 침대
        - "BAG"   # 슬리핑백
        - "SWD"   # 스와들
        - "WN"    # 백색소음기

    product:
      length: "3-4자"
      meaning: "제품 시리즈/모델명"
      examples:
        - "DRM1"  # Dream 시리즈 1세대
        - "CLM2"  # Calm 시리즈 2세대
        - "SFT1"  # Soft 시리즈 1세대

    variant:
      length: "2-3자"
      meaning: "제품 변형 (타입/시즌)"
      examples:
        - "SM"    # Summer (여름)
        - "WN"    # Winter (겨울)
        - "4S"    # 4 Season (사계절)
        - "PR"    # Premium
        - "BS"    # Basic

    option:
      length: "2-4자"
      meaning: "색상/사이즈"
      examples:
        - "GY"    # Gray
        - "PK"    # Pink
        - "IV"    # Ivory
        - "S"     # Small
        - "M"     # Medium
        - "L"     # Large
```

### 2.2 SKU 예시

```yaml
sku_examples:
  baby_bed:
    - sku: "SH-COMP-DRM1-PR-GY"
      meaning: "썬데이허그 절충형침대 드림1 프리미엄 그레이"
      full_name: "[썬데이허그] 드림 프리미엄 절충형 아기침대 (그레이)"

    - sku: "SH-COMP-DRM1-BS-IV"
      meaning: "썬데이허그 절충형침대 드림1 베이직 아이보리"
      full_name: "[썬데이허그] 드림 베이직 절충형 아기침대 (아이보리)"

  sleeping_bag:
    - sku: "SH-BAG-CLM2-SM-S"
      meaning: "썬데이허그 슬리핑백 캄2 여름용 S사이즈"
      full_name: "[썬데이허그] 캄 슬리핑백 여름용 (S, 0-6개월)"

    - sku: "SH-BAG-CLM2-WN-M"
      meaning: "썬데이허그 슬리핑백 캄2 겨울용 M사이즈"
      full_name: "[썬데이허그] 캄 슬리핑백 겨울용 (M, 6-12개월)"

  swaddle:
    - sku: "SH-SWD-SFT1-BS-PK"
      meaning: "썬데이허그 스와들 소프트1 베이직 핑크"
      full_name: "[썬데이허그] 소프트 스와들 (핑크)"

  white_noise:
    - sku: "SH-WN-ZEN1-PR-WH"
      meaning: "썬데이허그 백색소음기 젠1 프리미엄 화이트"
      full_name: "[썬데이허그] 젠 프리미엄 백색소음기 (화이트)"
```

### 2.3 색상 코드 표준

```yaml
color_codes:
  neutral:
    GY: { name_ko: "그레이", name_en: "Gray", hex: "#808080" }
    IV: { name_ko: "아이보리", name_en: "Ivory", hex: "#FFFFF0" }
    WH: { name_ko: "화이트", name_en: "White", hex: "#FFFFFF" }
    BG: { name_ko: "베이지", name_en: "Beige", hex: "#F5F5DC" }
    CR: { name_ko: "크림", name_en: "Cream", hex: "#FFFDD0" }

  soft_colors:
    PK: { name_ko: "핑크", name_en: "Pink", hex: "#FFB6C1" }
    BL: { name_ko: "블루", name_en: "Blue", hex: "#ADD8E6" }
    MN: { name_ko: "민트", name_en: "Mint", hex: "#98FF98" }
    LV: { name_ko: "라벤더", name_en: "Lavender", hex: "#E6E6FA" }
    YL: { name_ko: "옐로우", name_en: "Yellow", hex: "#FFFFE0" }

  patterns:
    ST: { name_ko: "스트라이프", name_en: "Stripe" }
    DT: { name_ko: "도트", name_en: "Dot" }
    FL: { name_ko: "플로럴", name_en: "Floral" }
    AN: { name_ko: "애니멀", name_en: "Animal" }
    SR: { name_ko: "별", name_en: "Star" }
```

### 2.4 사이즈 코드 표준

```yaml
size_codes:
  sleeping_bag:
    S: { name: "Small", age_range: "0-6개월", height: "~70cm" }
    M: { name: "Medium", age_range: "6-12개월", height: "70-80cm" }
    L: { name: "Large", age_range: "12-24개월", height: "80-90cm" }
    XL: { name: "X-Large", age_range: "24-36개월", height: "90-100cm" }

  swaddle:
    NB: { name: "Newborn", age_range: "0-2개월", weight: "~4.5kg" }
    S: { name: "Small", age_range: "2-4개월", weight: "4.5-6kg" }
    M: { name: "Medium", age_range: "4-6개월", weight: "6-8kg" }

  baby_bed:
    STD: { name: "Standard", dimension: "100x60cm" }
    EXT: { name: "Extended", dimension: "120x70cm" }
    CMP: { name: "Compact", dimension: "90x50cm" }
```

---

## 3. 제품 속성 정의

### 3.1 공통 속성

```yaml
common_attributes:
  identification:
    - id: "sku"
      type: "string"
      required: true
      description: "고유 상품 식별 코드"

    - id: "product_name"
      type: "string"
      required: true
      description: "상품 표시명"

    - id: "category"
      type: "string"
      required: true
      description: "카테고리 코드"

  pricing:
    - id: "list_price"
      type: "number"
      required: true
      description: "정가"
      unit: "원"

    - id: "sale_price"
      type: "number"
      required: false
      description: "할인가"
      unit: "원"

    - id: "cost_price"
      type: "number"
      required: true
      description: "원가"
      unit: "원"
      visibility: "internal"

  inventory:
    - id: "stock_quantity"
      type: "number"
      required: true
      description: "현재 재고 수량"

    - id: "safety_stock"
      type: "number"
      required: true
      description: "안전 재고 수량"
      default: 10

    - id: "lead_time"
      type: "number"
      required: true
      description: "발주 후 입고까지 소요일"
      unit: "일"

  status:
    - id: "status"
      type: "enum"
      values: ["active", "inactive", "discontinued", "coming_soon"]
      required: true
      description: "판매 상태"

    - id: "visibility"
      type: "enum"
      values: ["visible", "hidden"]
      required: true
      description: "노출 여부"
```

### 3.2 카테고리별 전용 속성

#### 아기침대 (BED) 속성

```yaml
bed_attributes:
  dimensions:
    - id: "bed_length"
      type: "number"
      unit: "cm"
      description: "침대 길이"

    - id: "bed_width"
      type: "number"
      unit: "cm"
      description: "침대 너비"

    - id: "bed_height_min"
      type: "number"
      unit: "cm"
      description: "침대 최소 높이"

    - id: "bed_height_max"
      type: "number"
      unit: "cm"
      description: "침대 최대 높이"

  features:
    - id: "is_foldable"
      type: "boolean"
      description: "접이식 여부"

    - id: "has_wheels"
      type: "boolean"
      description: "바퀴 유무"

    - id: "wheel_lock"
      type: "boolean"
      description: "바퀴 잠금장치"

    - id: "height_adjustable"
      type: "boolean"
      description: "높이 조절 가능"

    - id: "height_levels"
      type: "number"
      description: "높이 조절 단계 수"

  safety:
    - id: "max_weight"
      type: "number"
      unit: "kg"
      description: "최대 하중"

    - id: "certification"
      type: "array"
      description: "안전 인증"
      values: ["KC", "KPS", "ASTM", "EN"]

  materials:
    - id: "frame_material"
      type: "string"
      description: "프레임 소재"

    - id: "fabric_material"
      type: "string"
      description: "원단 소재"

    - id: "mattress_included"
      type: "boolean"
      description: "매트리스 포함 여부"
```

#### 슬리핑백 (SLEEP-BAG) 속성

```yaml
sleeping_bag_attributes:
  size_fit:
    - id: "size_code"
      type: "enum"
      values: ["S", "M", "L", "XL"]
      description: "사이즈"

    - id: "age_range_min"
      type: "number"
      unit: "개월"
      description: "권장 최소 월령"

    - id: "age_range_max"
      type: "number"
      unit: "개월"
      description: "권장 최대 월령"

    - id: "height_range_min"
      type: "number"
      unit: "cm"
      description: "권장 최소 신장"

    - id: "height_range_max"
      type: "number"
      unit: "cm"
      description: "권장 최대 신장"

  thermal:
    - id: "tog_rating"
      type: "number"
      description: "TOG 보온 등급"
      values: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]

    - id: "season"
      type: "enum"
      values: ["summer", "spring_fall", "winter", "all_season"]
      description: "적합 계절"

    - id: "recommended_temp_min"
      type: "number"
      unit: "°C"
      description: "권장 실내온도 최소"

    - id: "recommended_temp_max"
      type: "number"
      unit: "°C"
      description: "권장 실내온도 최대"

  design:
    - id: "zipper_type"
      type: "enum"
      values: ["one_way", "two_way"]
      description: "지퍼 타입"

    - id: "has_shoulder_snaps"
      type: "boolean"
      description: "어깨 스냅버튼"

    - id: "detachable_sleeves"
      type: "boolean"
      description: "탈착식 소매"

  materials:
    - id: "outer_fabric"
      type: "string"
      description: "겉감 소재"

    - id: "inner_fabric"
      type: "string"
      description: "안감 소재"

    - id: "filling"
      type: "string"
      description: "충전재"

    - id: "is_organic"
      type: "boolean"
      description: "유기농 인증"
```

#### 스와들 (SLEEP-SWD) 속성

```yaml
swaddle_attributes:
  size_fit:
    - id: "size_code"
      type: "enum"
      values: ["NB", "S", "M"]
      description: "사이즈"

    - id: "weight_range_min"
      type: "number"
      unit: "kg"
      description: "권장 최소 체중"

    - id: "weight_range_max"
      type: "number"
      unit: "kg"
      description: "권장 최대 체중"

  design:
    - id: "swaddle_type"
      type: "enum"
      values: ["wrap", "zip", "hybrid"]
      description: "스와들 타입"

    - id: "arm_design"
      type: "enum"
      values: ["arms_in", "arms_out", "convertible"]
      description: "팔 디자인"

    - id: "leg_design"
      type: "enum"
      values: ["sack", "open"]
      description: "다리 디자인"

  features:
    - id: "hip_safe"
      type: "boolean"
      description: "고관절 안전 디자인"

    - id: "noise_level"
      type: "enum"
      values: ["silent", "quiet", "standard"]
      description: "소음 수준 (벨크로 등)"
```

#### 백색소음기 (SOUND-WN) 속성

```yaml
white_noise_attributes:
  sound:
    - id: "sound_count"
      type: "number"
      description: "내장 사운드 수"

    - id: "sound_types"
      type: "array"
      description: "사운드 종류"
      values: ["white_noise", "pink_noise", "brown_noise", "heartbeat", "lullaby", "rain", "wave", "fan"]

    - id: "volume_levels"
      type: "number"
      description: "볼륨 단계 수"

    - id: "max_decibel"
      type: "number"
      unit: "dB"
      description: "최대 출력"

  timer:
    - id: "has_timer"
      type: "boolean"
      description: "타이머 기능"

    - id: "timer_options"
      type: "array"
      description: "타이머 옵션"
      unit: "분"
      example: [30, 60, 90, 120, "continuous"]

  power:
    - id: "power_source"
      type: "enum"
      values: ["battery", "usb", "adapter", "hybrid"]
      description: "전원 방식"

    - id: "battery_life"
      type: "number"
      unit: "시간"
      description: "배터리 지속시간"

    - id: "rechargeable"
      type: "boolean"
      description: "충전식 여부"

  physical:
    - id: "weight"
      type: "number"
      unit: "g"
      description: "무게"

    - id: "is_portable"
      type: "boolean"
      description: "휴대용 여부"

    - id: "has_nightlight"
      type: "boolean"
      description: "수면등 기능"

    - id: "light_colors"
      type: "array"
      description: "수면등 색상"
```

---

## 4. 시즌별 제품 분류

### 4.1 시즌 정의

```yaml
season_definitions:
  spring:
    id: "SPRING"
    months: [3, 4, 5]
    name_ko: "봄"
    avg_temp_range: "10-20°C"
    indoor_temp_target: "22-24°C"

  summer:
    id: "SUMMER"
    months: [6, 7, 8]
    name_ko: "여름"
    avg_temp_range: "25-35°C"
    indoor_temp_target: "24-26°C"

  fall:
    id: "FALL"
    months: [9, 10, 11]
    name_ko: "가을"
    avg_temp_range: "10-20°C"
    indoor_temp_target: "22-24°C"

  winter:
    id: "WINTER"
    months: [12, 1, 2]
    name_ko: "겨울"
    avg_temp_range: "-10-5°C"
    indoor_temp_target: "22-24°C"
```

### 4.2 시즌별 제품 매트릭스

```yaml
seasonal_product_matrix:
  sleeping_bag:
    summer:
      tog_range: [0.5, 1.0]
      products:
        - "SH-BAG-CLM2-SM"
      marketing_focus: "통기성, 시원함"
      stock_priority: "high"

    spring_fall:
      tog_range: [1.0, 2.0]
      products:
        - "SH-BAG-CLM2-4S"
      marketing_focus: "적정 보온, 범용성"
      stock_priority: "high"

    winter:
      tog_range: [2.5, 3.5]
      products:
        - "SH-BAG-CLM2-WN"
      marketing_focus: "보온성, 따뜻함"
      stock_priority: "high"

  swaddle:
    summer:
      material: "면", "모달"
      products:
        - "SH-SWD-SFT1-SM"
      marketing_focus: "가볍고 시원한"

    winter:
      material: "기모", "플리스"
      products:
        - "SH-SWD-SFT1-WN"
      marketing_focus: "포근하고 따뜻한"

    all_season:
      material: "면"
      products:
        - "SH-SWD-SFT1-BS"
      marketing_focus: "사계절 활용"
```

### 4.3 시즌 전환 캘린더

```yaml
seasonal_transition_calendar:
  winter_to_spring:
    period: "2월 중순 - 3월 초"
    action:
      - "겨울 재고 정리 할인"
      - "봄/사계절 제품 메인 노출"
      - "TOG 가이드 콘텐츠 강화"

  spring_to_summer:
    period: "5월 중순 - 6월 초"
    action:
      - "여름 제품 사전 마케팅"
      - "쿨링 소재 강조"
      - "TOG 0.5-1.0 메인 노출"

  summer_to_fall:
    period: "8월 말 - 9월 초"
    action:
      - "여름 재고 정리"
      - "사계절 제품 추천"
      - "환절기 수면 가이드"

  fall_to_winter:
    period: "11월 초 - 중순"
    action:
      - "겨울 제품 본격 마케팅"
      - "보온 소재 강조"
      - "TOG 2.5+ 메인 노출"
```

### 4.4 시즌별 재고 관리 규칙

```yaml
seasonal_inventory_rules:
  pre_season:
    timing: "시즌 2개월 전"
    action:
      - "수요 예측 기반 발주"
      - "안전재고 150% 확보"
    stock_level: "high"

  in_season:
    timing: "시즌 중"
    action:
      - "주간 재고 모니터링"
      - "빠른 재발주"
    stock_level: "optimal"

  end_of_season:
    timing: "시즌 종료 1개월 전"
    action:
      - "재고 정리 할인 검토"
      - "발주 중단"
    stock_level: "decreasing"

  off_season:
    timing: "비시즌"
    action:
      - "최소 재고 유지"
      - "창고 보관"
    stock_level: "minimal"
    discount_trigger: "50% 이상 재고 시 할인"
```

---

## 5. 제품 관계 정의

### 5.1 관련 제품 (Cross-sell)

```yaml
cross_sell_rules:
  BED-COMP:
    related_products:
      - category: "BED-ACCS-MAT"
        relationship: "필수 액세서리"
        recommendation_strength: "high"

      - category: "SLEEP-BAG"
        relationship: "함께 사용 추천"
        recommendation_strength: "medium"

      - category: "SOUND-WN"
        relationship: "수면 환경 완성"
        recommendation_strength: "medium"

  SLEEP-BAG:
    related_products:
      - category: "SLEEP-SWD"
        relationship: "월령별 전환"
        recommendation_strength: "medium"

      - category: "SLEEP-ACCS-PLW"
        relationship: "함께 사용"
        recommendation_strength: "low"

  SOUND-WN:
    related_products:
      - category: "SOUND-ACCS-CHG"
        relationship: "필수 액세서리"
        recommendation_strength: "high"

      - category: "SLEEP-BAG"
        relationship: "수면 환경"
        recommendation_strength: "medium"
```

### 5.2 상위 제품 (Upsell)

```yaml
upsell_rules:
  from_basic_to_premium:
    - from: "SH-COMP-DRM1-BS"
      to: "SH-COMP-DRM1-PR"
      price_diff: "+50,000원"
      value_proposition:
        - "프리미엄 원단"
        - "추가 액세서리 포함"
        - "연장 보증"

    - from: "SH-WN-ZEN1-BS"
      to: "SH-WN-ZEN1-PR"
      price_diff: "+30,000원"
      value_proposition:
        - "더 많은 사운드"
        - "앱 연동"
        - "야간 조명"

  size_upgrade:
    - trigger: "아기 성장"
      from: "SLEEP-BAG-*-S"
      to: "SLEEP-BAG-*-M"
      timing: "구매 후 4-6개월"
```

### 5.3 세트 상품

```yaml
bundle_products:
  newborn_essential:
    id: "BUNDLE-NB-ESS"
    name: "신생아 필수 세트"
    includes:
      - sku: "SH-SWD-SFT1-BS-S"
        quantity: 2
      - sku: "SH-WN-ZEN1-BS-WH"
        quantity: 1
    list_price: 95000
    bundle_price: 79000
    discount_rate: "17%"
    target_persona: "PERSONA_FIRST_MOM"

  sleep_complete:
    id: "BUNDLE-SLP-CMP"
    name: "숙면 완성 세트"
    includes:
      - sku: "SH-BAG-CLM2-4S-M"
        quantity: 1
      - sku: "SH-WN-ZEN1-PR-WH"
        quantity: 1
    list_price: 130000
    bundle_price: 109000
    discount_rate: "16%"
    target_persona: "PERSONA_FIRST_MOM"

  gift_premium:
    id: "BUNDLE-GFT-PRM"
    name: "프리미엄 출산 선물 세트"
    includes:
      - sku: "SH-BAG-CLM2-4S-S"
        quantity: 1
      - sku: "SH-SWD-SFT1-BS-S"
        quantity: 1
      - sku: "SH-WN-ZEN1-BS-WH"
        quantity: 1
    list_price: 145000
    bundle_price: 119000
    discount_rate: "18%"
    target_persona: "PERSONA_GIFT_BUYER"
    gift_wrap: "included"
```

---

## 6. 부록

### 6.1 제품 상태 정의

| 상태 | 코드 | 설명 | 판매 가능 |
|------|------|------|----------|
| **활성** | active | 정상 판매 중 | O |
| **비활성** | inactive | 일시 판매 중지 | X |
| **단종** | discontinued | 영구 판매 종료 | X |
| **출시예정** | coming_soon | 사전 예약 가능 | 사전예약만 |
| **품절** | out_of_stock | 재고 소진 | X |

### 6.2 마진 등급 정의

| 등급 | 마진율 범위 | 관리 정책 |
|------|------------|----------|
| **A** | 40% 이상 | 적극 마케팅, 재고 확보 우선 |
| **B** | 25-40% | 표준 관리 |
| **C** | 15-25% | 효율화 필요, 할인 제한 |
| **D** | 15% 미만 | 단종 검토 대상 |

### 6.3 AI 에이전트 제품 추천 규칙

```yaml
ai_recommendation_rules:
  by_baby_age:
    0-3months:
      priority: ["SLEEP-SWD", "SOUND-WN", "BED-COMP"]
      size: ["NB", "S"]

    3-6months:
      priority: ["SLEEP-BAG", "SLEEP-SWD-TRS", "BED-COMP"]
      size: ["S"]

    6-12months:
      priority: ["SLEEP-BAG", "BED-COMP"]
      size: ["M"]

    12-24months:
      priority: ["SLEEP-BAG", "BED-COMP"]
      size: ["L", "XL"]

  by_season:
    spring_fall:
      sleeping_bag: "4SS"
      tog: [1.0, 1.5, 2.0]

    summer:
      sleeping_bag: "SM"
      tog: [0.5, 1.0]

    winter:
      sleeping_bag: "WN"
      tog: [2.5, 3.0, 3.5]

  by_persona:
    PERSONA_FIRST_MOM:
      recommend: "premium, safety_certified"
      bundle: "newborn_essential"

    PERSONA_SECOND_MOM:
      recommend: "value, proven_products"
      bundle: null

    PERSONA_GIFT_BUYER:
      recommend: "gift_sets, popular_items"
      bundle: "gift_premium"
```

### 6.4 문서 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2024-01-26 | AI System | 최초 작성 |

### 6.5 관련 문서

- [미션, 비전 및 핵심가치](./mission-vision.md)
- [브랜드 보이스 가이드](./brand-voice.md)
- [타겟 고객 정의](./target-customer.md)

---

*이 문서는 썬데이허그 AI 에이전트의 제품 관리, 재고 최적화, 고객 추천을 위한 핵심 참조 문서입니다. 모든 제품 관련 의사결정은 이 분류 체계를 기준으로 합니다.*
