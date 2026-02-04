import { useEffect, useRef, useCallback, useState } from "react";
import mermaid, { type MermaidConfig } from "mermaid";
import { useTheme } from "../../context/ThemeContext";

interface MermaidDiagramProps {
  /** Mermaid 다이어그램 정의 문자열 */
  chart: string;
  /** 컴포넌트 추가 클래스 */
  className?: string;
  /** 다이어그램 제목 (선택) */
  title?: string;
  /** 다이어그램 설명 (선택) */
  description?: string;
  /** 로딩 시 표시할 컴포넌트 */
  loadingComponent?: React.ReactNode;
  /** 에러 시 표시할 컴포넌트 */
  errorComponent?: React.ReactNode;
}

// Mermaid 테마 설정
const getMermaidConfig = (isDark: boolean): MermaidConfig => ({
  startOnLoad: false,
  theme: isDark ? "dark" : "default",
  securityLevel: "loose",
  fontFamily: "inherit",
  flowchart: {
    htmlLabels: true,
    curve: "basis",
    padding: 15,
    nodeSpacing: 50,
    rankSpacing: 50,
  },
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
  },
  themeVariables: isDark
    ? {
        // 다크 테마 변수
        primaryColor: "#3b82f6",
        primaryTextColor: "#f3f4f6",
        primaryBorderColor: "#60a5fa",
        lineColor: "#6b7280",
        secondaryColor: "#1f2937",
        tertiaryColor: "#374151",
        background: "#111827",
        mainBkg: "#1f2937",
        secondBkg: "#374151",
        nodeBorder: "#4b5563",
        clusterBkg: "#1f2937",
        clusterBorder: "#4b5563",
        titleColor: "#f9fafb",
        edgeLabelBackground: "#1f2937",
        actorBkg: "#1f2937",
        actorBorder: "#3b82f6",
        actorTextColor: "#f3f4f6",
        actorLineColor: "#6b7280",
        noteBkgColor: "#374151",
        noteTextColor: "#f3f4f6",
        noteBorderColor: "#4b5563",
      }
    : {
        // 라이트 테마 변수
        primaryColor: "#3b82f6",
        primaryTextColor: "#1f2937",
        primaryBorderColor: "#2563eb",
        lineColor: "#9ca3af",
        secondaryColor: "#f3f4f6",
        tertiaryColor: "#e5e7eb",
        background: "#ffffff",
        mainBkg: "#f9fafb",
        secondBkg: "#f3f4f6",
        nodeBorder: "#d1d5db",
        clusterBkg: "#f9fafb",
        clusterBorder: "#d1d5db",
        titleColor: "#111827",
        edgeLabelBackground: "#ffffff",
        actorBkg: "#f3f4f6",
        actorBorder: "#3b82f6",
        actorTextColor: "#1f2937",
        actorLineColor: "#9ca3af",
        noteBkgColor: "#fef3c7",
        noteTextColor: "#1f2937",
        noteBorderColor: "#fcd34d",
      },
});

/**
 * MermaidDiagram 컴포넌트
 *
 * Mermaid.js를 사용하여 다이어그램을 렌더링하는 React 컴포넌트입니다.
 * 다크모드를 자동으로 지원하며, 테마 변경 시 다이어그램이 재렌더링됩니다.
 *
 * @example
 * // 기본 사용법
 * <MermaidDiagram
 *   chart={`
 *     flowchart LR
 *       A[시작] --> B{조건}
 *       B -->|예| C[결과1]
 *       B -->|아니오| D[결과2]
 *   `}
 * />
 *
 * @example
 * // 제목과 설명 포함
 * <MermaidDiagram
 *   chart={diagramCode}
 *   title="주문 처리 플로우"
 *   description="고객 주문부터 배송까지의 전체 프로세스"
 *   className="my-4"
 * />
 */
const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  chart,
  className = "",
  title,
  description,
  loadingComponent,
  errorComponent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagramId] = useState(
    () => `mermaid-${Math.random().toString(36).substring(2, 11)}`
  );

  const renderDiagram = useCallback(async () => {
    if (!containerRef.current || !chart.trim()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 테마에 따른 Mermaid 설정 적용
      const isDark = theme === "dark";
      mermaid.initialize(getMermaidConfig(isDark));

      // 기존 내용 제거
      containerRef.current.innerHTML = "";

      // 다이어그램 렌더링
      const { svg } = await mermaid.render(diagramId, chart.trim());

      if (containerRef.current) {
        containerRef.current.innerHTML = svg;

        // SVG 스타일 조정 (반응형)
        const svgElement = containerRef.current.querySelector("svg");
        if (svgElement) {
          svgElement.style.maxWidth = "100%";
          svgElement.style.height = "auto";
          svgElement.removeAttribute("height");
        }
      }
    } catch (err) {
      console.error("Mermaid rendering error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "다이어그램 렌더링 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }, [chart, theme, diagramId]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  // 로딩 상태
  if (isLoading) {
    return (
      loadingComponent || (
        <div
          className={`flex items-center justify-center p-8 rounded-lg bg-gray-50 dark:bg-gray-800 ${className}`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              다이어그램 로딩 중...
            </span>
          </div>
        </div>
      )
    );
  }

  // 에러 상태
  if (error) {
    return (
      errorComponent || (
        <div
          className={`p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${className}`}
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-300">
                다이어그램 렌더링 오류
              </h4>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        </div>
      )
    );
  }

  return (
    <div className={className}>
      {/* 제목 영역 */}
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}

      {/* 다이어그램 컨테이너 */}
      <div
        ref={containerRef}
        className="overflow-x-auto p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
        aria-label={title || "Mermaid 다이어그램"}
      />
    </div>
  );
};

export default MermaidDiagram;

// 워크플로우 다이어그램 예시 상수들
export const WORKFLOW_DIAGRAM_EXAMPLES = {
  // 주문 처리 플로우차트
  orderProcessFlow: `flowchart LR
    A[신규 주문] --> B{결제 확인}
    B -->|성공| C[재고 확인]
    B -->|실패| D[결제 대기]
    C -->|재고 있음| E[출고 지시]
    C -->|재고 없음| F[재고 부족 알림]
    E --> G[배송 중]
    G --> H[배송 완료]
    D -->|재시도| B
    F -->|입고 시| C`,

  // 주문 상태 다이어그램
  orderStateFlow: `stateDiagram-v2
    [*] --> PENDING: 주문 생성
    PENDING --> PAID: 결제 완료
    PENDING --> CANCELLED: 주문 취소
    PAID --> PROCESSING: 출고 준비
    PROCESSING --> SHIPPED: 발송 완료
    SHIPPED --> DELIVERED: 배송 완료
    DELIVERED --> [*]
    CANCELLED --> [*]`,

  // CS 문의 처리 플로우
  csInquiryFlow: `flowchart TD
    A[문의 접수] --> B[AI 분류]
    B --> C{자동 응답 가능?}
    C -->|예| D[AI 자동 응답]
    C -->|아니오| E[상담원 연결]
    D --> F{해결됨?}
    F -->|예| G[만족도 조사]
    F -->|아니오| E
    E --> H[상담원 응대]
    H --> G
    G --> I[종료]`,

  // 시퀀스 다이어그램 - 주문 처리
  orderSequence: `sequenceDiagram
    participant C as 고객
    participant O as 주문 에이전트
    participant P as 결제 에이전트
    participant I as 재고 에이전트
    participant S as 배송 에이전트

    C->>O: 주문 요청
    O->>P: 결제 확인 요청
    P-->>O: 결제 완료
    O->>I: 재고 확인
    I-->>O: 재고 확보
    O->>S: 출고 지시
    S-->>C: 배송 알림`,

  // 재고 동기화 플로우
  inventorySyncFlow: `flowchart LR
    subgraph 채널
        A[자사몰]
        B[네이버]
        C[쿠팡]
    end

    subgraph 재고관리
        D[재고 에이전트]
        E[(재고 DB)]
    end

    A --> D
    B --> D
    C --> D
    D <--> E
    D --> A
    D --> B
    D --> C`,

  // 에이전트 협업 다이어그램
  agentCollaboration: `flowchart TB
    subgraph Supervisor
        S[supervisor-agent]
    end

    subgraph Core Agents
        O[order-agent]
        I[inventory-agent]
        C[cs-agent]
        P[payment-agent]
        SH[shipping-agent]
    end

    subgraph Support Agents
        K[knowledge-agent]
        R[reporting-agent]
        N[notification-agent]
    end

    S --> O
    S --> I
    S --> C
    S --> P
    S --> SH

    O <--> I
    O <--> P
    O <--> SH
    C <--> K

    O --> N
    C --> N
    SH --> N

    O --> R
    I --> R
    C --> R`,
};

// 유틸리티 함수: 워크플로우 타입에 따른 기본 다이어그램 생성
export const generateWorkflowDiagram = (
  _workflowType:
    | "order"
    | "cs"
    | "inventory"
    | "shipping"
    | "payment"
    | "return",
  steps: Array<{ id: string; label: string; next?: string[] }>
): string => {
  const nodes = steps
    .map((step, index) => {
      const shape =
        index === 0 ? `[${step.label}]` : `(${step.label})`;
      return `    ${step.id}${shape}`;
    })
    .join("\n");

  const edges = steps
    .filter((step) => step.next && step.next.length > 0)
    .flatMap((step) =>
      step.next!.map((nextId) => `    ${step.id} --> ${nextId}`)
    )
    .join("\n");

  return `flowchart TD
${nodes}
${edges}`;
};
