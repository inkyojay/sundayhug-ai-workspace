# SundayHug AI - LangGraph 리팩토링 계획서

> 작성일: 2026-02-04
> 목적: TypeScript 기반 에이전트 시스템을 LangGraph(Python) 기반으로 전환
> 최종 목표: 자가 학습이 가능한 AI 에이전트 시스템 구축

---

## 1. 현재 상태 분석

### 1.1 기존 프로젝트 현황

| 항목 | 현재 상태 |
|------|----------|
| 언어 | TypeScript |
| 코드량 | ~75,000줄 |
| 에이전트 | 17개 메인 + 53개 서브 |
| 데이터베이스 | Supabase (PostgreSQL) |
| 프론트엔드 | React 19 + Zustand |
| 실행 상태 | 미완성 (엔트리 포인트 없음) |

### 1.2 전환 필요성

1. **코드 복잡도**: 직접 구현한 상태 머신, 워크플로우 엔진이 복잡함
2. **자가 학습 목표**: Python ML/AI 생태계 활용 필요
3. **개발 속도**: LangGraph로 90% 코드 감소 예상
4. **유지보수**: 프레임워크 지원으로 안정성 향상

### 1.3 전환 후 예상 구조

```
현재: 75,000줄 (TypeScript)
  ↓
전환 후: ~5,000줄 (Python + LangGraph)
```

---

## 2. 목표 아키텍처

### 2.1 새로운 프로젝트 구조

```
sundayhug-ai-langgraph/
│
├── src/
│   ├── agents/                    # LangGraph 에이전트
│   │   ├── graphs/                # 메인 그래프 정의
│   │   │   ├── supervisor.py      # 총괄 라우터
│   │   │   ├── order_graph.py     # 주문 처리
│   │   │   ├── cs_graph.py        # CS 처리
│   │   │   ├── inventory_graph.py # 재고 관리
│   │   │   ├── marketing_graph.py # 마케팅
│   │   │   ├── analytics_graph.py # 분석
│   │   │   ├── accounting_graph.py# 회계
│   │   │   └── logistics_graph.py # 물류
│   │   │
│   │   ├── nodes/                 # 노드 함수들
│   │   │   ├── order_nodes.py
│   │   │   ├── cs_nodes.py
│   │   │   └── common_nodes.py
│   │   │
│   │   ├── tools/                 # 도구 정의
│   │   │   ├── supabase_tools.py  # DB 조회/수정
│   │   │   ├── channel_tools.py   # 쿠팡, 네이버, Cafe24
│   │   │   └── notification_tools.py
│   │   │
│   │   └── state/                 # 상태 스키마
│   │       └── schemas.py
│   │
│   ├── api/                       # FastAPI 서버
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── chat.py
│   │   │   ├── agents.py
│   │   │   └── feedback.py
│   │   └── middleware/
│   │
│   ├── integrations/              # 외부 연동
│   │   ├── supabase.py
│   │   ├── coupang.py
│   │   ├── naver.py
│   │   └── cafe24.py
│   │
│   ├── learning/                  # 자가 학습
│   │   ├── rag/
│   │   │   ├── vectorstore.py
│   │   │   └── auto_learn.py
│   │   ├── feedback/
│   │   │   └── collector.py
│   │   └── fine_tuning/
│   │       └── pipeline.py
│   │
│   └── config/
│       ├── settings.py
│       ├── prompts.py
│       └── langsmith.py
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── data/                          # 벡터 DB, 체크포인트
├── scripts/                       # 유틸리티 스크립트
├── pyproject.toml
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

### 2.2 기술 스택

| 구분 | 기술 |
|------|------|
| 언어 | Python 3.11+ |
| 에이전트 프레임워크 | LangGraph 0.2+ |
| LLM | Claude (Anthropic) / GPT-4 (OpenAI) |
| API 서버 | FastAPI |
| 데이터베이스 | Supabase (PostgreSQL + pgvector) |
| 벡터 저장소 | Supabase pgvector |
| 모니터링 | LangSmith |
| 프론트엔드 | 기존 React 대시보드 유지 |
| 컨테이너 | Docker |

### 2.3 에이전트 아키텍처 (17개 메인 + 53개 서브)

```
👤 대표 (최종 의사결정)
  │
  └─ 🤖 총괄 에이전트 (Supervisor)
       │    - 역할: 대표와 1차 소통, 업무분배, 오케스트레이션
       │    - 스킬: 전체시스템 상태조회, 에이전트호출, 우선순위판단, 브리핑생성
       │
       ├─ 💰 주문 에이전트 (Order)
       │    ├─ 주문수집 서브에이전트
       │    │    - 역할: 쿠팡/스마트스토어/자사몰 주문 자동 수집
       │    │    - 스킬: 각 채널 API 연동, 주문데이터 정규화
       │    ├─ 배송관리 서브에이전트
       │    │    - 역할: 송장등록, 배송추적, 배송완료 처리
       │    │    - 스킬: 택배사 API, 송장번호 등록, 배송상태 조회
       │    └─ 반품/교환 서브에이전트
       │         - 역할: 반품접수, 수거요청, 환불처리
       │         - 스킬: 반품사유 분류, 환불금액 계산, 재고복원
       │
       ├─ 💬 CS 에이전트 (Customer Service)
       │    ├─ 문의응대 서브에이전트
       │    │    - 역할: 카톡/게시판/이메일 문의 자동응답
       │    │    - 스킬: FAQ검색, 주문조회, 배송조회, 답변생성
       │    ├─ 리뷰관리 서브에이전트
       │    │    - 역할: 리뷰수집, 감정분석, 답변생성
       │    │    - 스킬: 리뷰크롤링, 감정분류, 맞춤답변 생성
       │    ├─ AS처리 서브에이전트
       │    │    - 역할: AS접수, 진행추적, 완료안내
       │    │    - 스킬: AS티켓 생성, 상태업데이트, 알림발송
       │    └─ VOC분석 서브에이전트
       │         - 역할: 클레임분류, 패턴분석, 인사이트 도출
       │         - 스킬: 텍스트분류, 키워드추출, 트렌드분석
       │
       ├─ 📢 마케팅 에이전트 (Marketing)
       │    ├─ 퍼포먼스 서브에이전트
       │    │    - 역할: 광고데이터 수집, ROAS분석, 예산최적화 제안
       │    │    - 스킬: 메타/네이버/쿠팡 광고 API, 성과리포트 생성
       │    ├─ 콘텐츠 서브에이전트
       │    │    - 역할: 카드뉴스, 블로그, SNS, 숏폼 콘텐츠 제작
       │    │    - 스킬: 이미지생성, 카피라이팅, 해시태그 추천
       │    ├─ CRM 서브에이전트
       │    │    - 역할: 고객세그먼트, 알림톡발송, 재구매유도
       │    │    - 스킬: 세그먼트분류, 카카오알림톡API, 메시지최적화
       │    ├─ 프로모션 서브에이전트
       │    │    - 역할: 프로모션기획, 쿠폰관리, 성과분석
       │    │    - 스킬: 프로모션캘린더, 쿠폰생성, ROI계산
       │    ├─ 인플루언서 서브에이전트
       │    │    - 역할: 인플루언서 발굴, 컨택, 시딩, 성과추적
       │    │    - 스킬: 인플루언서DB, 컨택템플릿, 협업히스토리관리
       │    └─ 소셜리스닝 서브에이전트
       │         - 역할: 커뮤니티모니터링, 트렌드분석, 브랜드언급추적
       │         - 스킬: 맘카페크롤링, 키워드알림, 감정분석
       │
       ├─ 🎨 상세페이지 에이전트 (Detail Page)
       │    ├─ 기획 서브에이전트
       │    │    - 역할: 상세페이지 구성안 작성, 경쟁사 벤치마킹
       │    │    - 스킬: 경쟁사분석, 구성안템플릿, USP도출
       │    ├─ 제작 서브에이전트
       │    │    - 역할: 카피작성, 레이아웃생성, 이미지배치
       │    │    - 스킬: 카피라이팅, HTML생성, 이미지편집
       │    └─ 최적화 서브에이전트
       │         - 역할: A/B테스트, 전환율분석, 개선제안
       │         - 스킬: 전환율추적, 히트맵분석, 개선안생성
       │
       ├─ 📦 재고 에이전트 (Inventory)
       │    ├─ 재고동기화 서브에이전트
       │    │    - 역할: 채널별 재고 실시간 동기화
       │    │    - 스킬: 멀티채널 재고API, 재고차이알림
       │    ├─ 발주관리 서브에이전트
       │    │    - 역할: 발주제안, 발주서생성, 입고추적
       │    │    - 스킬: 안전재고계산, 발주서생성, 입고등록
       │    └─ 원가분석 서브에이전트
       │         - 역할: 원가계산, 마진분석, 가격제안
       │         - 스킬: 원가계산, 마진율분석, 가격시뮬레이션
       │
       ├─ 💵 회계 에이전트 (Accounting)
       │    ├─ 매출정산 서브에이전트
       │    │    - 역할: 채널별 정산수집, 대사확인
       │    │    - 스킬: 정산데이터수집, 매출대사, 차이분석
       │    ├─ 비용관리 서브에이전트
       │    │    - 역할: 지출분류, 카드내역정리
       │    │    - 스킬: 거래내역분류, 비용카테고리매핑
       │    ├─ 세무 서브에이전트
       │    │    - 역할: 세금계산서관리, 부가세자료, 기장데이터
       │    │    - 스킬: 세금계산서발행/수취, 부가세집계, 기장자료생성
       │    └─ 손익분석 서브에이전트
       │         - 역할: 손익계산, 리포트생성
       │         - 스킬: 손익계산서생성, 채널별수익성분석
       │
       ├─ 📋 지원사업 에이전트 (Biz Support)
       │    ├─ 모니터링 서브에이전트
       │    │    - 역할: 지원사업 크롤링, 적합성 매칭
       │    │    - 스킬: 정부사이트크롤링, 조건매칭, 알림발송
       │    ├─ 신청지원 서브에이전트
       │    │    - 역할: 서류준비, 사업계획서 초안작성
       │    │    - 스킬: 서류체크리스트, 사업계획서템플릿, 자동완성
       │    └─ 사후관리 서브에이전트
       │         - 역할: 결과추적, 정산/보고서 관리
       │         - 스킬: 일정알림, 보고서템플릿, 정산자료정리
       │
       ├─ 🎁 제품기획 에이전트 (Product)
       │    ├─ 리서치 서브에이전트
       │    │    - 역할: 시장조사, 경쟁사분석
       │    │    - 스킬: 트렌드검색, 경쟁사모니터링, 시장규모분석
       │    ├─ 기획 서브에이전트
       │    │    - 역할: 신제품컨셉, 스펙정의
       │    │    - 스킬: 컨셉문서작성, 스펙시트생성, 원가추정
       │    └─ 피드백분석 서브에이전트
       │         - 역할: 리뷰분석, 개선점도출
       │         - 스킬: 리뷰마이닝, 불만사항분류, 개선우선순위
       │
       ├─ ⚖️ 법률 에이전트 (Legal)
       │    ├─ 인증관리 서브에이전트
       │    │    - 역할: KC, 안전인증 유효기간/갱신 관리
       │    │    - 스킬: 인증만료알림, 갱신일정관리, 서류준비
       │    ├─ 광고심의 서브에이전트
       │    │    - 역할: 광고문구검토, 위반방지
       │    │    - 스킬: 광고문구체크, 위반사례DB, 수정제안
       │    └─ 규정준수 서브에이전트
       │         - 역할: 전자상거래법, 개인정보보호 준수
       │         - 스킬: 규정체크리스트, 위반감지, 개선안내
       │
       ├─ 🛡️ 지재권 에이전트 (IP)
       │    ├─ 권리관리 서브에이전트
       │    │    - 역할: 상표/디자인권 등록/갱신 관리
       │    │    - 스킬: 권리현황DB, 갱신알림, 신규출원지원
       │    ├─ 침해감시 서브에이전트
       │    │    - 역할: 카피캣 모니터링, 침해알림
       │    │    - 스킬: 이미지유사도검색, 상품명모니터링, 알림
       │    └─ 대응 서브에이전트
       │         - 역할: 침해대응, 법적조치 에스컬레이션
       │         - 스킬: 침해증거수집, 내용증명초안, 신고접수
       │
       ├─ 📊 분석 에이전트 (Analytics)
       │    ├─ 대시보드 서브에이전트
       │    │    - 역할: KPI집계, 실시간 시각화
       │    │    - 스킬: 데이터집계, 차트생성, 대시보드업데이트
       │    ├─ 리포트 서브에이전트
       │    │    - 역할: 일간/주간/월간 리포트 자동생성
       │    │    - 스킬: 리포트템플릿, 자동생성, 발송
       │    └─ 예측 서브에이전트
       │         - 역할: 수요예측, 매출예측, 이상감지
       │         - 스킬: 시계열분석, 이상탐지, 예측모델
       │
       ├─ 🚨 위기관리 에이전트 (Crisis)
       │    ├─ 모니터링 서브에이전트
       │    │    - 역할: 악성리뷰, 이슈 실시간 감지
       │    │    - 스킬: 키워드알림, 감정분석, 이슈분류
       │    ├─ 대응 서브에이전트
       │    │    - 역할: 초기대응, SOP실행
       │    │    - 스킬: 대응템플릿, SOP조회, 에스컬레이션
       │    └─ 복구 서브에이전트
       │         - 역할: 사후분석, 재발방지
       │         - 스킬: 사후보고서, 원인분석, 개선안도출
       │
       ├─ 🚚 물류 에이전트 (Logistics)
       │    ├─ 3PL관리 서브에이전트
       │    │    - 역할: 풀필먼트 성과추적
       │    │    - 스킬: 출고율추적, SLA모니터링, 성과리포트
       │    ├─ 배송최적화 서브에이전트
       │    │    - 역할: 배송비분석, 업체비교
       │    │    - 스킬: 배송비계산, 업체별비교, 최적화제안
       │    └─ 품질관리 서브에이전트
       │         - 역할: 지연/파손 모니터링
       │         - 스킬: 배송사고추적, 클레임집계, 업체평가
       │
       ├─ 📸 미디어 에이전트 (Media)
       │    ├─ 촬영관리 서브에이전트
       │    │    - 역할: 촬영스케줄, 외주관리
       │    │    - 스킬: 일정관리, 외주DB, 견적비교
       │    ├─ 에셋관리 서브에이전트
       │    │    - 역할: 이미지/영상 라이브러리 관리
       │    │    - 스킬: 에셋태깅, 검색, 버전관리
       │    └─ 편집 서브에이전트
       │         - 역할: 간단한 이미지/영상 편집
       │         - 스킬: 리사이즈, 워터마크, 썸네일생성
       │
       ├─ 🤝 제휴 에이전트 (Partnership)
       │    ├─ B2B 서브에이전트
       │    │    - 역할: 납품문의, 견적, 계약관리
       │    │    - 스킬: 견적서생성, 계약서관리, 납품일정
       │    ├─ 도매 서브에이전트
       │    │    - 역할: 도매/총판 관리
       │    │    - 스킬: 도매가관리, 거래처DB, 주문처리
       │    └─ 공동구매 서브에이전트
       │         - 역할: 공구진행, 정산
       │         - 스킬: 공구페이지, 참여자관리, 정산처리
       │
       └─ ⭐ 로열티 에이전트 (Loyalty)
            ├─ 멤버십 서브에이전트
            │    - 역할: 등급관리, 혜택적용
            │    - 스킬: 등급계산, 혜택자동적용, 등급변동알림
            ├─ 포인트 서브에이전트
            │    - 역할: 적립/사용/소멸 관리
            │    - 스킬: 포인트계산, 소멸예정알림, 사용내역
            └─ VIP관리 서브에이전트
                 - 역할: VIP케어, 이탈방지
                 - 스킬: VIP식별, 전용혜택, 이탈징후감지
```

### 2.4 에이전트 요약표

| # | 메인 에이전트 | 서브 에이전트 수 | 핵심 역할 |
|:-:|--------------|:---------------:|----------|
| 0 | 🤖 Supervisor | - | 업무분배, 오케스트레이션 |
| 1 | 💰 Order | 3개 | 주문수집, 배송, 반품/교환 |
| 2 | 💬 CS | 4개 | 문의응대, 리뷰, AS, VOC분석 |
| 3 | 📢 Marketing | 6개 | 퍼포먼스, 콘텐츠, CRM, 프로모션, 인플루언서, 소셜리스닝 |
| 4 | 🎨 DetailPage | 3개 | 기획, 제작, 최적화 |
| 5 | 📦 Inventory | 3개 | 재고동기화, 발주, 원가분석 |
| 6 | 💵 Accounting | 4개 | 정산, 비용, 세무, 손익 |
| 7 | 📋 BizSupport | 3개 | 지원사업 모니터링, 신청, 사후관리 |
| 8 | 🎁 Product | 3개 | 리서치, 기획, 피드백분석 |
| 9 | ⚖️ Legal | 3개 | 인증, 광고심의, 규정준수 |
| 10 | 🛡️ IP | 3개 | 권리관리, 침해감시, 대응 |
| 11 | 📊 Analytics | 3개 | 대시보드, 리포트, 예측 |
| 12 | 🚨 Crisis | 3개 | 모니터링, 대응, 복구 |
| 13 | 🚚 Logistics | 3개 | 3PL, 배송최적화, 품질관리 |
| 14 | 📸 Media | 3개 | 촬영, 에셋, 편집 |
| 15 | 🤝 Partnership | 3개 | B2B, 도매, 공동구매 |
| 16 | ⭐ Loyalty | 3개 | 멤버십, 포인트, VIP |

**총계: 17개 메인 에이전트 + 53개 서브에이전트 = 70개 에이전트**

---

## 3. 7-Phase 리팩토링 계획

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        전체 로드맵 (16-18주)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Phase 1        Phase 2        Phase 3        Phase 4                  │
│  ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐                 │
│  │ 환경  │ ───▶ │ Core │ ───▶ │Super-│ ───▶ │ 확장  │                 │
│  │ 설정  │       │Agent │       │visor │       │Agent │                 │
│  └──────┘       └──────┘       └──────┘       └──────┘                 │
│   1-2주          2-3주          1-2주          3-4주                    │
│                                                                         │
│  Phase 5        Phase 6        Phase 7                                 │
│  ┌──────┐       ┌──────┐       ┌──────┐                                │
│  │ API  │ ───▶ │모니터│ ───▶ │ 자가  │                                │
│  │Server│       │ 링   │       │ 학습  │                                │
│  └──────┘       └──────┘       └──────┘                                │
│   2주            1주            3-4주                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: 환경 설정 및 기반 구축 (1-2주)

### 목표
- Python 프로젝트 초기화
- 핵심 의존성 설치
- 기본 구조 설정
- Supabase 연동 확인

### 작업 목록

#### 1.1 프로젝트 초기화
```bash
mkdir sundayhug-ai-langgraph
cd sundayhug-ai-langgraph
poetry init
# 또는
uv init
```

#### 1.2 의존성 설치
```toml
# pyproject.toml
[project]
name = "sundayhug-ai"
version = "0.1.0"
python = "^3.11"

[project.dependencies]
# LangGraph 핵심
langgraph = "^0.2"
langchain = "^0.3"
langchain-openai = "^0.2"
langchain-anthropic = "^0.2"

# 데이터베이스
supabase = "^2.0"
pgvector = "^0.2"

# API 서버
fastapi = "^0.115"
uvicorn = "^0.32"

# 유틸리티
pydantic = "^2.0"
httpx = "^0.27"
python-dotenv = "^1.0"

# 모니터링
langsmith = "^0.1"
```

#### 1.3 환경 변수 설정
```bash
# .env
# LLM
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# 채널 API
COUPANG_ACCESS_KEY=xxx
COUPANG_SECRET_KEY=xxx
NAVER_CLIENT_ID=xxx
NAVER_CLIENT_SECRET=xxx
CAFE24_CLIENT_ID=xxx
CAFE24_CLIENT_SECRET=xxx

# LangSmith
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=xxx
LANGCHAIN_PROJECT=sundayhug-ai
```

#### 1.4 기본 상태 스키마 정의
```python
# src/agents/state/schemas.py
from typing import TypedDict, Annotated, Literal
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    """모든 에이전트가 공유하는 기본 상태"""
    messages: Annotated[list, add_messages]
    current_agent: str
    user_id: str
    session_id: str
    context: dict
    tools_output: list
    needs_approval: bool
    approval_level: Literal["none", "low", "medium", "high", "critical"]
    error: str | None
```

#### 1.5 Supabase 유틸리티
```python
# src/integrations/supabase.py
from supabase import create_client, Client
from config.settings import settings

class SupabaseManager:
    _client: Client | None = None

    @classmethod
    def get_client(cls) -> Client:
        if cls._client is None:
            cls._client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
        return cls._client
```

### 완료 조건
- [ ] Python 프로젝트 생성 완료
- [ ] 모든 의존성 설치 확인
- [ ] 환경 변수 설정 완료
- [ ] 상태 스키마 정의 완료
- [ ] Supabase 연결 테스트 통과
- [ ] 기본 프로젝트 구조 생성

---

## Phase 2: Core 에이전트 구현 (2-3주)

### 목표
- 핵심 3개 에이전트 구현 (Order, CS, Inventory)
- 공통 도구(Tools) 정의
- 기본 워크플로우 테스트

### 작업 목록

#### 2.1 도구(Tools) 정의
```python
# src/agents/tools/supabase_tools.py
from langchain_core.tools import tool
from integrations.supabase import SupabaseManager

@tool
async def get_orders(status: str = None, channel: str = None, limit: int = 10) -> list:
    """주문 목록을 조회합니다."""
    return await SupabaseManager.get_orders({"status": status, "channel": channel, "limit": limit})

@tool
async def get_order_detail(order_id: str) -> dict:
    """주문 상세 정보를 조회합니다."""
    return await SupabaseManager.get_order_by_id(order_id)

@tool
async def update_order_status(order_id: str, new_status: str) -> dict:
    """주문 상태를 업데이트합니다."""
    return await SupabaseManager.update_order(order_id, {"status": new_status})

@tool
async def get_cs_tickets(status: str = None, priority: str = None) -> list:
    """CS 티켓 목록을 조회합니다."""
    return await SupabaseManager.get_cs_tickets({"status": status, "priority": priority})

@tool
async def get_inventory(product_id: str = None, low_stock: bool = False) -> list:
    """재고 정보를 조회합니다."""
    return await SupabaseManager.get_inventory({"product_id": product_id, "low_stock": low_stock})
```

#### 2.2 Order Agent 그래프
```python
# src/agents/graphs/order_graph.py
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_anthropic import ChatAnthropic

from agents.state.schemas import OrderState
from agents.tools.supabase_tools import get_orders, get_order_detail, update_order_status

llm = ChatAnthropic(model="claude-sonnet-4-20250514")
llm_with_tools = llm.bind_tools([get_orders, get_order_detail, update_order_status])

async def order_agent_node(state: OrderState) -> dict:
    """주문 관련 요청을 처리하는 메인 에이전트"""
    messages = state["messages"]
    response = await llm_with_tools.ainvoke(messages)
    return {"messages": [response]}

def should_continue(state: OrderState) -> str:
    """다음 단계 결정"""
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return "end"

def create_order_graph():
    graph = StateGraph(OrderState)

    graph.add_node("agent", order_agent_node)
    graph.add_node("tools", ToolNode([get_orders, get_order_detail, update_order_status]))

    graph.set_entry_point("agent")

    graph.add_conditional_edges(
        "agent",
        should_continue,
        {"tools": "tools", "end": END}
    )

    graph.add_edge("tools", "agent")

    return graph.compile()

order_graph = create_order_graph()
```

#### 2.3 CS Agent 그래프
```python
# src/agents/graphs/cs_graph.py
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import interrupt

async def analyze_sentiment(state: CSState) -> dict:
    """고객 감정 분석"""
    # 구현
    pass

async def generate_response(state: CSState) -> dict:
    """자동 응답 생성"""
    # 구현
    pass

def create_cs_graph():
    graph = StateGraph(CSState)

    graph.add_node("analyze", analyze_sentiment)
    graph.add_node("respond", generate_response)
    graph.add_node("escalate", lambda s: interrupt("관리자 검토 필요"))

    graph.set_entry_point("analyze")

    graph.add_conditional_edges(
        "analyze",
        lambda s: "escalate" if s["sentiment"] == "negative" else "respond",
        {"respond": "respond", "escalate": "escalate"}
    )

    graph.add_edge("respond", END)
    graph.add_edge("escalate", END)

    return graph.compile()

cs_graph = create_cs_graph()
```

#### 2.4 Inventory Agent 그래프
```python
# src/agents/graphs/inventory_graph.py
from langgraph.graph import StateGraph, END

async def check_inventory(state: AgentState) -> dict:
    """재고 확인"""
    # 구현
    pass

async def generate_alert(state: AgentState) -> dict:
    """재고 부족 알림 생성"""
    # 구현
    pass

def create_inventory_graph():
    graph = StateGraph(AgentState)

    graph.add_node("check", check_inventory)
    graph.add_node("alert", generate_alert)

    graph.set_entry_point("check")
    graph.add_edge("check", "alert")
    graph.add_edge("alert", END)

    return graph.compile()

inventory_graph = create_inventory_graph()
```

### 완료 조건
- [ ] 도구(Tools) 정의 완료
- [ ] Order Agent 그래프 구현 및 테스트
- [ ] CS Agent 그래프 구현 및 테스트
- [ ] Inventory Agent 그래프 구현 및 테스트
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 통과

---

## Phase 3: Supervisor 및 라우팅 시스템 (1-2주)

### 목표
- Supervisor 라우터 구현
- 조건부 라우팅 시스템
- 체크포인트 설정

### 작업 목록

#### 3.1 Supervisor 그래프
```python
# src/agents/graphs/supervisor.py
from langgraph.graph import StateGraph, END
from pydantic import BaseModel
from typing import Literal

class RouteDecision(BaseModel):
    agent: Literal["order", "cs", "inventory", "marketing", "general"]
    confidence: float
    reasoning: str

async def router_node(state: AgentState) -> dict:
    """요청을 분석하고 적절한 에이전트로 라우팅"""

    system_prompt = """
    당신은 이커머스 AI 시스템의 라우터입니다.
    사용자 요청을 분석하고 적절한 에이전트를 선택하세요.

    에이전트 목록:
    - order: 주문 조회, 취소, 환불, 배송 관련
    - cs: 고객 문의, 불만, 리뷰 관련
    - inventory: 재고 확인, 발주, 상품 관리
    - marketing: 마케팅, 프로모션, 광고
    - general: 기타 일반 질문
    """

    structured_llm = llm.with_structured_output(RouteDecision)
    response = await structured_llm.ainvoke([
        {"role": "system", "content": system_prompt},
        *state["messages"]
    ])

    return {"current_agent": response.agent}

def route_to_agent(state: AgentState) -> str:
    return state["current_agent"]

def create_supervisor_graph():
    graph = StateGraph(AgentState)

    graph.add_node("router", router_node)
    graph.add_node("order", order_graph)
    graph.add_node("cs", cs_graph)
    graph.add_node("inventory", inventory_graph)
    graph.add_node("general", general_response_node)

    graph.set_entry_point("router")

    graph.add_conditional_edges(
        "router",
        route_to_agent,
        {
            "order": "order",
            "cs": "cs",
            "inventory": "inventory",
            "general": "general"
        }
    )

    for agent in ["order", "cs", "inventory", "general"]:
        graph.add_edge(agent, END)

    return graph.compile()

supervisor = create_supervisor_graph()
```

#### 3.2 체크포인트 설정
```python
# src/agents/checkpointer.py
from langgraph.checkpoint.postgres import PostgresSaver

checkpointer = PostgresSaver.from_conn_string(settings.DATABASE_URL)

supervisor = create_supervisor_graph().compile(checkpointer=checkpointer)
```

### 완료 조건
- [ ] Supervisor 라우터 구현
- [ ] 조건부 라우팅 테스트
- [ ] 체크포인터 연동
- [ ] 중단/재개 테스트 통과

---

## Phase 4: 나머지 에이전트 확장 (4-6주)

### 목표
- 14개 추가 에이전트 구현
- Supervisor 라우팅 확장
- 서브에이전트 통합

### 에이전트 구현 우선순위

#### Phase 4-A: 핵심 비즈니스 (2주)

| 에이전트 | 서브에이전트 | 주요 기능 | 우선순위 |
|----------|-------------|----------|:--------:|
| 📢 **Marketing** | 퍼포먼스, 콘텐츠, CRM, 프로모션, 인플루언서, 소셜리스닝 | 광고 ROAS, 콘텐츠 제작, 고객 세그먼트 | 🔴 필수 |
| 💵 **Accounting** | 매출정산, 비용관리, 세무, 손익분석 | 채널 정산, 세금계산서, P&L | 🔴 필수 |
| 📊 **Analytics** | 대시보드, 리포트, 예측 | KPI 집계, 자동 리포트, 수요예측 | 🔴 필수 |

```python
# Marketing Agent 구조 예시
marketing_graph = StateGraph(MarketingState)
marketing_graph.add_node("performance", performance_subagent)
marketing_graph.add_node("content", content_subagent)
marketing_graph.add_node("crm", crm_subagent)
marketing_graph.add_node("promotion", promotion_subagent)
marketing_graph.add_node("influencer", influencer_subagent)
marketing_graph.add_node("social_listening", social_listening_subagent)
```

#### Phase 4-B: 운영 지원 (2주)

| 에이전트 | 서브에이전트 | 주요 기능 | 우선순위 |
|----------|-------------|----------|:--------:|
| 🚚 **Logistics** | 3PL관리, 배송최적화, 품질관리 | 풀필먼트, 배송비 분석, 사고 추적 | 🟡 중요 |
| 🎨 **DetailPage** | 기획, 제작, 최적화 | 상세페이지 생성, A/B테스트 | 🟡 중요 |
| 🎁 **Product** | 리서치, 기획, 피드백분석 | 시장조사, 신제품 컨셉 | 🟡 중요 |
| 📸 **Media** | 촬영관리, 에셋관리, 편집 | 이미지/영상 라이브러리 | 🟡 중요 |

#### Phase 4-C: 관리/컴플라이언스 (1주)

| 에이전트 | 서브에이전트 | 주요 기능 | 우선순위 |
|----------|-------------|----------|:--------:|
| ⚖️ **Legal** | 인증관리, 광고심의, 규정준수 | KC인증, 광고법 검토 | 🟢 선택 |
| 🛡️ **IP** | 권리관리, 침해감시, 대응 | 상표권, 카피캣 모니터링 | 🟢 선택 |
| 📋 **BizSupport** | 모니터링, 신청지원, 사후관리 | 정부 지원사업 | 🟢 선택 |

#### Phase 4-D: 성장/위기 관리 (1주)

| 에이전트 | 서브에이전트 | 주요 기능 | 우선순위 |
|----------|-------------|----------|:--------:|
| 🚨 **Crisis** | 모니터링, 대응, 복구 | 악성리뷰 감지, SOP 실행 | 🟢 선택 |
| 🤝 **Partnership** | B2B, 도매, 공동구매 | 납품, 도매 거래 | 🟢 선택 |
| ⭐ **Loyalty** | 멤버십, 포인트, VIP관리 | 등급/포인트, 이탈방지 | 🟢 선택 |

### 서브에이전트 구현 패턴

```python
# 서브에이전트는 별도 그래프로 구현
# src/agents/graphs/marketing/performance_subagent.py

from langgraph.graph import StateGraph, END

class PerformanceState(AgentState):
    ad_platform: Literal["meta", "naver", "coupang", "google"]
    metrics: dict
    recommendations: list

@tool
async def get_ad_performance(platform: str, date_range: dict) -> dict:
    """광고 성과 데이터 조회"""
    pass

@tool
async def calculate_roas(campaign_id: str) -> float:
    """ROAS 계산"""
    pass

@tool
async def suggest_budget_optimization(campaign_id: str) -> dict:
    """예산 최적화 제안"""
    pass

async def analyze_performance(state: PerformanceState) -> dict:
    """성과 분석"""
    metrics = await get_ad_performance.ainvoke({
        "platform": state["ad_platform"],
        "date_range": state["context"]["date_range"]
    })
    return {"metrics": metrics}

async def generate_recommendations(state: PerformanceState) -> dict:
    """최적화 제안 생성"""
    roas = await calculate_roas.ainvoke(state["context"]["campaign_id"])
    suggestions = await suggest_budget_optimization.ainvoke(state["context"]["campaign_id"])
    return {"recommendations": [suggestions]}

def create_performance_subagent():
    graph = StateGraph(PerformanceState)

    graph.add_node("analyze", analyze_performance)
    graph.add_node("recommend", generate_recommendations)

    graph.set_entry_point("analyze")
    graph.add_edge("analyze", "recommend")
    graph.add_edge("recommend", END)

    return graph.compile()

performance_subagent = create_performance_subagent()
```

### 프로젝트 구조 (Phase 4 완료 후)

```
src/agents/graphs/
├── supervisor.py                  # 총괄 라우터
│
├── order/                         # 주문 에이전트
│   ├── order_graph.py
│   ├── order_collector.py         # 서브: 주문수집
│   ├── shipping_manager.py        # 서브: 배송관리
│   └── return_handler.py          # 서브: 반품/교환
│
├── cs/                            # CS 에이전트
│   ├── cs_graph.py
│   ├── inquiry_responder.py       # 서브: 문의응대
│   ├── review_manager.py          # 서브: 리뷰관리
│   ├── as_handler.py              # 서브: AS처리
│   └── voc_analyzer.py            # 서브: VOC분석
│
├── inventory/                     # 재고 에이전트
│   ├── inventory_graph.py
│   ├── stock_sync.py              # 서브: 재고동기화
│   ├── reorder_manager.py         # 서브: 발주관리
│   └── cost_analyzer.py           # 서브: 원가분석
│
├── marketing/                     # 마케팅 에이전트
│   ├── marketing_graph.py
│   ├── performance.py             # 서브: 퍼포먼스
│   ├── content.py                 # 서브: 콘텐츠
│   ├── crm.py                     # 서브: CRM
│   ├── promotion.py               # 서브: 프로모션
│   ├── influencer.py              # 서브: 인플루언서
│   └── social_listening.py        # 서브: 소셜리스닝
│
├── accounting/                    # 회계 에이전트
│   ├── accounting_graph.py
│   ├── settlement.py              # 서브: 매출정산
│   ├── expense.py                 # 서브: 비용관리
│   ├── tax.py                     # 서브: 세무
│   └── pnl.py                     # 서브: 손익분석
│
├── analytics/                     # 분석 에이전트
│   ├── analytics_graph.py
│   ├── dashboard.py               # 서브: 대시보드
│   ├── report.py                  # 서브: 리포트
│   └── forecast.py                # 서브: 예측
│
├── logistics/                     # 물류 에이전트
│   ├── logistics_graph.py
│   ├── tpl_manager.py             # 서브: 3PL관리
│   ├── shipping_optimizer.py      # 서브: 배송최적화
│   └── quality_control.py         # 서브: 품질관리
│
├── detail_page/                   # 상세페이지 에이전트
│   ├── detail_page_graph.py
│   ├── planner.py                 # 서브: 기획
│   ├── creator.py                 # 서브: 제작
│   └── optimizer.py               # 서브: 최적화
│
├── product/                       # 제품기획 에이전트
│   ├── product_graph.py
│   ├── researcher.py              # 서브: 리서치
│   ├── planner.py                 # 서브: 기획
│   └── feedback_analyzer.py       # 서브: 피드백분석
│
├── legal/                         # 법률 에이전트
│   ├── legal_graph.py
│   ├── certification.py           # 서브: 인증관리
│   ├── ad_review.py               # 서브: 광고심의
│   └── compliance.py              # 서브: 규정준수
│
├── ip/                            # 지재권 에이전트
│   ├── ip_graph.py
│   ├── rights_manager.py          # 서브: 권리관리
│   ├── infringement_monitor.py    # 서브: 침해감시
│   └── response.py                # 서브: 대응
│
├── biz_support/                   # 지원사업 에이전트
│   ├── biz_support_graph.py
│   ├── monitor.py                 # 서브: 모니터링
│   ├── applicant.py               # 서브: 신청지원
│   └── follow_up.py               # 서브: 사후관리
│
├── crisis/                        # 위기관리 에이전트
│   ├── crisis_graph.py
│   ├── monitor.py                 # 서브: 모니터링
│   ├── responder.py               # 서브: 대응
│   └── recovery.py                # 서브: 복구
│
├── media/                         # 미디어 에이전트
│   ├── media_graph.py
│   ├── shooting.py                # 서브: 촬영관리
│   ├── asset_manager.py           # 서브: 에셋관리
│   └── editor.py                  # 서브: 편집
│
├── partnership/                   # 제휴 에이전트
│   ├── partnership_graph.py
│   ├── b2b.py                     # 서브: B2B
│   ├── wholesale.py               # 서브: 도매
│   └── group_buying.py            # 서브: 공동구매
│
└── loyalty/                       # 로열티 에이전트
    ├── loyalty_graph.py
    ├── membership.py              # 서브: 멤버십
    ├── points.py                  # 서브: 포인트
    └── vip.py                     # 서브: VIP관리
```

### Supervisor 라우팅 업데이트

```python
# src/agents/graphs/supervisor.py (Phase 4 완료 후)

AGENT_ROUTES = {
    "order": order_graph,
    "cs": cs_graph,
    "inventory": inventory_graph,
    "marketing": marketing_graph,
    "accounting": accounting_graph,
    "analytics": analytics_graph,
    "logistics": logistics_graph,
    "detail_page": detail_page_graph,
    "product": product_graph,
    "legal": legal_graph,
    "ip": ip_graph,
    "biz_support": biz_support_graph,
    "crisis": crisis_graph,
    "media": media_graph,
    "partnership": partnership_graph,
    "loyalty": loyalty_graph,
    "general": general_response_node,
}

class RouteDecision(BaseModel):
    agent: Literal[
        "order", "cs", "inventory", "marketing", "accounting",
        "analytics", "logistics", "detail_page", "product",
        "legal", "ip", "biz_support", "crisis", "media",
        "partnership", "loyalty", "general"
    ]
    confidence: float
    reasoning: str
```

### 완료 조건

#### Phase 4-A (필수)
- [ ] Marketing Agent 구현 (6개 서브에이전트)
- [ ] Accounting Agent 구현 (4개 서브에이전트)
- [ ] Analytics Agent 구현 (3개 서브에이전트)

#### Phase 4-B (중요)
- [ ] Logistics Agent 구현 (3개 서브에이전트)
- [ ] DetailPage Agent 구현 (3개 서브에이전트)
- [ ] Product Agent 구현 (3개 서브에이전트)
- [ ] Media Agent 구현 (3개 서브에이전트)

#### Phase 4-C (선택)
- [ ] Legal Agent 구현 (3개 서브에이전트)
- [ ] IP Agent 구현 (3개 서브에이전트)
- [ ] BizSupport Agent 구현 (3개 서브에이전트)

#### Phase 4-D (선택)
- [ ] Crisis Agent 구현 (3개 서브에이전트)
- [ ] Partnership Agent 구현 (3개 서브에이전트)
- [ ] Loyalty Agent 구현 (3개 서브에이전트)

#### 공통
- [ ] Supervisor 라우팅 업데이트 (17개 에이전트)
- [ ] 서브에이전트 통합 테스트
- [ ] E2E 시나리오 테스트

---

## Phase 5: API 서버 및 프론트엔드 연동 (2주)

### 목표
- FastAPI 서버 구현
- 기존 React 대시보드와 연동
- Docker 설정

### 작업 목록

#### 5.1 FastAPI 서버
```python
# src/api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SundayHug AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """메인 채팅 엔드포인트"""
    result = await supervisor.ainvoke(
        {"messages": [{"role": "user", "content": request.message}]},
        config={"configurable": {"thread_id": request.session_id}}
    )
    return {"response": result["messages"][-1].content}

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """스트리밍 응답"""
    # 구현
    pass
```

#### 5.2 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}

  dashboard:
    build: ./dashboard
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://api:8000
```

### 완료 조건
- [ ] FastAPI 서버 구현
- [ ] 채팅 엔드포인트 (일반/스트리밍)
- [ ] 프론트엔드 서비스 수정
- [ ] Docker Compose 설정
- [ ] E2E 테스트 통과

---

## Phase 6: LangSmith 연동 및 모니터링 (1주)

### 목표
- LangSmith 트레이싱 설정
- 피드백 수집 시스템
- 모니터링 대시보드

### 작업 목록

#### 6.1 LangSmith 설정
```python
# src/config/langsmith.py
import os

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "sundayhug-ai"

from langsmith import Client
client = Client()

def log_feedback(run_id: str, score: float, comment: str = None):
    """사용자 피드백 기록"""
    client.create_feedback(run_id=run_id, key="user_rating", score=score, comment=comment)
```

#### 6.2 피드백 API
```python
@app.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    log_feedback(request.run_id, request.score, request.comment)
    return {"status": "ok"}
```

### 완료 조건
- [ ] LangSmith 연동 완료
- [ ] 트레이싱 확인
- [ ] 피드백 수집 API
- [ ] 대시보드 피드백 UI

---

## Phase 7: 자가 학습 시스템 (3-4주)

### 목표
- RAG 시스템 구축
- 자동 지식 축적
- Fine-tuning 파이프라인

### 작업 목록

#### 7.1 RAG 시스템
```python
# src/learning/rag/vectorstore.py
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore

embeddings = OpenAIEmbeddings()

vectorstore = SupabaseVectorStore(
    client=supabase_client,
    embedding=embeddings,
    table_name="knowledge_base",
    query_name="match_documents"
)

async def add_to_knowledge(content: str, metadata: dict):
    """지식 베이스에 추가"""
    await vectorstore.aadd_texts(texts=[content], metadatas=[metadata])

async def search_knowledge(query: str, k: int = 5) -> list:
    """관련 지식 검색"""
    return await vectorstore.asimilarity_search(query, k=k)
```

#### 7.2 자동 지식 축적
```python
# src/learning/rag/auto_learn.py
async def learn_from_good_runs():
    """좋은 평가를 받은 실행에서 학습"""
    good_runs = client.list_runs(
        project_name="sundayhug-ai",
        filter='feedback.score > 0.8'
    )

    for run in good_runs:
        await add_to_knowledge(
            content=f"Q: {run.inputs}\nA: {run.outputs}",
            metadata={"run_id": run.id, "score": run.feedback_stats.get("score")}
        )
```

#### 7.3 Fine-tuning 파이프라인
```python
# src/learning/fine_tuning/pipeline.py
def export_training_data(min_score: float = 0.8) -> list:
    """파인튜닝용 데이터 추출"""
    training_data = []
    runs = client.list_runs(filter=f'feedback.score >= {min_score}')

    for run in runs:
        training_data.append({
            "messages": [
                {"role": "system", "content": "당신은 이커머스 AI 어시스턴트입니다."},
                {"role": "user", "content": run.inputs["messages"][-1]["content"]},
                {"role": "assistant", "content": run.outputs["messages"][-1]["content"]}
            ]
        })

    return training_data

async def start_fine_tuning(training_file: str):
    """파인튜닝 시작"""
    file = await openai.files.create(file=open(training_file, "rb"), purpose="fine-tune")
    job = await openai.fine_tuning.jobs.create(training_file=file.id, model="gpt-4o-mini")
    return job.id
```

#### 7.4 자동 학습 스케줄러
```python
# src/learning/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', hour=0)
async def daily_learning():
    """매일 자정에 좋은 대화 학습"""
    await learn_from_good_runs()

@scheduler.scheduled_job('cron', day_of_week='sun', hour=3)
async def weekly_training_prep():
    """매주 일요일에 파인튜닝 데이터 준비"""
    data = export_training_data(min_score=0.9)
    if len(data) >= 100:
        save_training_file(data)
```

### 완료 조건
- [ ] pgvector 설정 (Supabase)
- [ ] RAG 시스템 구현
- [ ] 자동 지식 축적 구현
- [ ] RAG 통합 에이전트
- [ ] Fine-tuning 파이프라인
- [ ] 자동 학습 스케줄러
- [ ] 성능 모니터링

---

## 4. 일정 요약

| Phase | 기간 | 주요 산출물 | 에이전트 수 |
|-------|------|------------|:-----------:|
| Phase 1 | 1-2주 | 프로젝트 설정, 기본 구조 | - |
| Phase 2 | 2-3주 | Order, CS, Inventory Agent | 3개 메인 + 10개 서브 |
| Phase 3 | 1-2주 | Supervisor, 라우팅 시스템 | 1개 (Supervisor) |
| Phase 4-A | 2주 | Marketing, Accounting, Analytics | 3개 메인 + 13개 서브 |
| Phase 4-B | 2주 | Logistics, DetailPage, Product, Media | 4개 메인 + 12개 서브 |
| Phase 4-C | 1주 | Legal, IP, BizSupport | 3개 메인 + 9개 서브 |
| Phase 4-D | 1주 | Crisis, Partnership, Loyalty | 3개 메인 + 9개 서브 |
| Phase 5 | 2주 | FastAPI 서버, 프론트엔드 연동 | - |
| Phase 6 | 1주 | LangSmith 모니터링 | - |
| Phase 7 | 3-4주 | RAG, Fine-tuning, 자가 학습 | - |

**총 에이전트: 17개 메인 + 53개 서브 = 70개**

**총 예상 기간: 18-22주 (약 5개월)**

**핵심 MVP (Phase 1-5): 약 12-15주 (약 3.5개월)**
- MVP 포함: Supervisor + Order + CS + Inventory + Marketing + Accounting + Analytics = 7개 메인 에이전트

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          타임라인 (Gantt)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Phase    1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20   │
│  ────────────────────────────────────────────────────────────────────   │
│  P1 환경  ██                                                            │
│  P2 Core    ████                                                        │
│  P3 Super      ██                                                       │
│  P4-A 핵심       ████                                                   │
│  P4-B 운영           ████                                               │
│  P4-C 관리               ██                                             │
│  P4-D 성장                 ██                                           │
│  P5 API                      ████                                       │
│  P6 모니터                       ██                                     │
│  P7 학습                           ████████                             │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────      │
│  MVP 완료 지점 ─────────────────────▲                                   │
│  최종 완료 지점 ─────────────────────────────────────────────▲          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 마이그레이션 전략

### 5.1 점진적 전환

```
단계 1: 새 프로젝트에서 Core 에이전트 구현
        (기존 프로젝트는 참조용으로 유지)

단계 2: API 서버 구축 후 프론트엔드 연결
        (기존 프론트엔드 재사용)

단계 3: 기능 검증 후 기존 프로젝트 아카이브
```

### 5.2 기존 코드 활용

| 기존 코드 | 활용 방안 |
|----------|----------|
| 타입 정의 (types/) | Python Pydantic 모델로 변환 |
| API 클라이언트 | Python httpx로 재구현 |
| 프론트엔드 (dashboard/) | 그대로 사용, API URL만 변경 |
| DB 스키마 | 그대로 사용 |
| 설계 문서 (docs/) | 참조용으로 유지 |

---

## 6. 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| Python 학습 곡선 | 중간 | 단계별 진행, 문서화 |
| LangGraph 버전 변경 | 낮음 | 버전 고정, 마이그레이션 가이드 확인 |
| LLM 비용 증가 | 중간 | 캐싱, 모델 선택 최적화 |
| 프레임워크 의존성 | 중간 | 핵심 로직 분리, 추상화 계층 |

---

## 7. 성공 지표

### MVP 완료 기준
- [ ] 3개 이상의 에이전트가 정상 작동
- [ ] 채팅 인터페이스로 에이전트 호출 가능
- [ ] LangSmith에서 트레이싱 확인 가능
- [ ] 프론트엔드 대시보드 연동 완료

### 최종 완료 기준
- [ ] 모든 핵심 에이전트 구현 (10개 이상)
- [ ] RAG 시스템으로 지식 축적 작동
- [ ] 피드백 기반 자동 학습 파이프라인 가동
- [ ] Fine-tuning 파이프라인 준비 완료
- [ ] 99% 이상 가동률

---

## 부록: 참고 자료

### LangGraph 공식 문서
- https://langchain-ai.github.io/langgraph/

### LangSmith 문서
- https://docs.smith.langchain.com/

### 기존 프로젝트 참조
- 에이전트 설계: `/docs/agents/`
- 타입 정의: `/src/types/`
- API 클라이언트: `/src/infrastructure/api/`

---

*이 계획서는 프로젝트 진행 상황에 따라 업데이트될 수 있습니다.*
