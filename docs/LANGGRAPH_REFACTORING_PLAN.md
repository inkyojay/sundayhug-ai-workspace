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

## Phase 4: 나머지 에이전트 확장 (3-4주)

### 목표
- 추가 에이전트 구현
- Supervisor 라우팅 확장

### 에이전트 구현 우선순위

#### Phase 4-A (필수) - 2주
| 에이전트 | 역할 | 주요 기능 |
|----------|------|----------|
| Marketing | 마케팅 | 캠페인 관리, 프로모션, CRM |
| Accounting | 회계 | 정산, 매출 분석, 세무 |
| Analytics | 분석 | 리포트 생성, 인사이트 도출 |

#### Phase 4-B (확장) - 1-2주
| 에이전트 | 역할 | 주요 기능 |
|----------|------|----------|
| Logistics | 물류 | 배송 최적화, 물류비 분석 |
| Product | 상품 | 상품 기획, 트렌드 분석 |
| DetailPage | 상세페이지 | 페이지 생성, SEO 최적화 |

#### Phase 4-C (추후) - 필요시
- Legal Agent (법률)
- IP Agent (지재권)
- BizSupport Agent (지원사업)
- Crisis Agent (위기관리)
- Partnership Agent (제휴)
- Loyalty Agent (충성도)
- Media Agent (미디어)

### 완료 조건
- [ ] Marketing Agent 구현
- [ ] Accounting Agent 구현
- [ ] Analytics Agent 구현
- [ ] Logistics Agent 구현
- [ ] Product Agent 구현
- [ ] Supervisor 라우팅 업데이트
- [ ] 통합 테스트

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

| Phase | 기간 | 주요 산출물 |
|-------|------|------------|
| Phase 1 | 1-2주 | 프로젝트 설정, 기본 구조 |
| Phase 2 | 2-3주 | Order, CS, Inventory Agent |
| Phase 3 | 1-2주 | Supervisor, 라우팅 시스템 |
| Phase 4 | 3-4주 | 추가 에이전트 (Marketing, Analytics 등) |
| Phase 5 | 2주 | FastAPI 서버, 프론트엔드 연동 |
| Phase 6 | 1주 | LangSmith 모니터링 |
| Phase 7 | 3-4주 | RAG, Fine-tuning, 자가 학습 |

**총 예상 기간: 16-18주 (약 4개월)**

**핵심 MVP (Phase 1-5): 약 10-12주 (약 3개월)**

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
