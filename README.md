# 썬데이허그 AI 에이전트 시스템

> 1인 이커머스 기업을 위한 AI 에이전트 군단 시스템

## 개요

**썬데이허그(SundayHug)**는 육아용품 이커머스 기업으로, AI 에이전트 시스템을 통해 대기업 수준의 운영 효율을 달성하는 것을 목표로 합니다.

### 핵심 구성요소

| 구성요소 | 설명 | 위치 |
|---------|------|------|
| 온톨로지 | 기업 철학과 정체성 | `/docs/ontology/` |
| 토폴로지 | 비즈니스 흐름 설계 | `/docs/topology/` |
| 에이전트 | 17개 메인 + 53개 서브 | `/docs/agents/`, `/src/agents/` |
| 데이터 | Supabase 스키마 | `/database/` |
| MCP | 외부 서비스 연결 | `/mcp/` |
| 스케줄 | 자동화 작업 | `/schedules/` |

## 기술 스택

- **Database**: Supabase (PostgreSQL)
- **AI**: Claude + MCP (Model Context Protocol)
- **Documentation**: Notion
- **Communication**: 카카오톡 채널

## 판매 채널

- 쿠팡
- 네이버 스마트스토어
- 자사몰 (Cafe24)

## 에이전트 구조

```
👤 대표 (최종 의사결정)
  │
  └─ 🤖 총괄 에이전트 (Supervisor)
       │
       ├─ 💰 주문 에이전트 (Order) ─────────── 3 서브
       ├─ 💬 CS 에이전트 (CS) ──────────────── 5 서브
       ├─ 📢 마케팅 에이전트 (Marketing) ───── 7 서브
       ├─ 🎨 상세페이지 에이전트 (DetailPage) ─ 3 서브
       ├─ 📦 재고 에이전트 (Inventory) ─────── 3 서브
       ├─ 💵 회계 에이전트 (Accounting) ────── 4 서브
       ├─ 📋 지원사업 에이전트 (BizSupport) ── 3 서브
       ├─ 🎁 제품기획 에이전트 (Product) ───── 3 서브
       ├─ ⚖️ 법률 에이전트 (Legal) ─────────── 3 서브
       ├─ 🛡️ 지재권 에이전트 (IP) ──────────── 3 서브
       ├─ 📊 분석 에이전트 (Analytics) ─────── 3 서브
       ├─ 🚨 위기관리 에이전트 (Crisis) ────── 3 서브
       ├─ 🚚 물류 에이전트 (Logistics) ─────── 3 서브
       ├─ 📸 미디어 에이전트 (Media) ───────── 3 서브
       ├─ 🤝 제휴 에이전트 (Partnership) ───── 3 서브
       └─ ⭐ 로열티 에이전트 (Loyalty) ─────── 3 서브
```

**총합: 17개 메인 에이전트 + 53개 서브 에이전트**

## 병렬 개발 전략

이 프로젝트는 6개의 레인으로 나뉘어 병렬 개발됩니다. 자세한 내용은 [BRANCH_GUIDE.md](./BRANCH_GUIDE.md)를 참조하세요.

| Lane | 브랜치 | 담당 |
|------|--------|------|
| L0 | `claude/lane0-foundation-*` | 기반 인프라 |
| L1 | `claude/lane1-core-ops-*` | 주문, CS, 재고, 물류 |
| L2 | `claude/lane2-marketing-*` | 마케팅, 상세페이지, 미디어 |
| L3 | `claude/lane3-management-*` | 회계, 법률, 지재권, 지원사업 |
| L4 | `claude/lane4-analytics-*` | 분석, 위기관리, 제품, 제휴, 로열티 |
| L5 | `claude/lane5-integration-*` | Supervisor, 워크플로우, 스케줄 |

## 폴더 구조

```
sundayhug-ai-workspace/
├── docs/
│   ├── ontology/           # 기업 철학/정체성
│   ├── agents/             # 에이전트 설계 문서
│   └── topology/           # 워크플로우 설계
├── src/
│   ├── agents/             # 에이전트 소스 코드
│   ├── workflows/          # 워크플로우 엔진
│   ├── mcp/                # MCP 클라이언트
│   ├── utils/              # 유틸리티
│   └── types/              # TypeScript 타입
├── database/
│   ├── migrations/         # DB 마이그레이션
│   └── seeds/              # 시드 데이터
├── mcp/                    # MCP 서버 설정
├── schedules/              # 크론 작업 정의
├── prompts/                # 프롬프트 템플릿
└── tests/                  # 테스트 코드
```

## 시작하기

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env

# 개발 서버 실행
npm run dev
```

## 라이선스

Private - SundayHug Inc.
