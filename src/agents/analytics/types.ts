/**
 * Analytics Agent 전용 타입 정의
 * LANE 4: Analytics & Growth
 */

// =============================================================================
// 공통 열거형
// =============================================================================

/**
 * 분석 기간 단위
 */
export enum AnalyticsPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

/**
 * KPI 카테고리
 */
export enum KPICategory {
  SALES = 'sales',
  MARKETING = 'marketing',
  CUSTOMER = 'customer',
  INVENTORY = 'inventory',
  OPERATIONS = 'operations',
  FINANCE = 'finance',
}

/**
 * 예측 모델 타입
 */
export enum ForecastModelType {
  TIME_SERIES = 'time_series',
  REGRESSION = 'regression',
  MACHINE_LEARNING = 'machine_learning',
  ENSEMBLE = 'ensemble',
}

/**
 * 이상 감지 심각도
 */
export enum AnomalySeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * 리포트 타입
 */
export enum ReportType {
  DAILY_SUMMARY = 'daily_summary',
  WEEKLY_SUMMARY = 'weekly_summary',
  MONTHLY_SUMMARY = 'monthly_summary',
  AD_HOC = 'ad_hoc',
  CUSTOM = 'custom',
}

/**
 * 리포트 포맷
 */
export enum ReportFormat {
  HTML = 'html',
  PDF = 'pdf',
  EXCEL = 'excel',
  JSON = 'json',
}

// =============================================================================
// 대시보드 관련 타입
// =============================================================================

/**
 * KPI 메트릭
 */
export interface KPIMetric {
  /** 메트릭 ID */
  id: string;
  /** 메트릭 이름 */
  name: string;
  /** 카테고리 */
  category: KPICategory;
  /** 현재 값 */
  currentValue: number;
  /** 이전 값 (비교 기간) */
  previousValue: number;
  /** 목표 값 */
  targetValue?: number;
  /** 변화율 (%) */
  changeRate: number;
  /** 단위 */
  unit: string;
  /** 계산 시점 */
  calculatedAt: Date;
  /** 추가 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 대시보드 위젯 설정
 */
export interface DashboardWidget {
  /** 위젯 ID */
  id: string;
  /** 위젯 타입 */
  type: 'chart' | 'gauge' | 'table' | 'number' | 'heatmap';
  /** 제목 */
  title: string;
  /** 데이터 소스 */
  dataSource: string;
  /** 차트 설정 */
  chartConfig?: {
    chartType: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    xAxis?: string;
    yAxis?: string[];
    colors?: string[];
  };
  /** 새로고침 간격 (초) */
  refreshInterval: number;
  /** 위치 및 크기 */
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * 대시보드 설정
 */
export interface DashboardConfig {
  /** 대시보드 ID */
  id: string;
  /** 대시보드 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 위젯 목록 */
  widgets: DashboardWidget[];
  /** 기본 기간 */
  defaultPeriod: AnalyticsPeriod;
  /** 자동 새로고침 여부 */
  autoRefresh: boolean;
  /** 공유 대상 */
  sharedWith: string[];
  /** 생성자 */
  createdBy: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 실시간 메트릭 데이터
 */
export interface RealTimeMetric {
  /** 메트릭 ID */
  metricId: string;
  /** 값 */
  value: number;
  /** 타임스탬프 */
  timestamp: Date;
  /** 채널 */
  channel?: string;
  /** 세그먼트 */
  segment?: string;
}

// =============================================================================
// 리포트 관련 타입
// =============================================================================

/**
 * 리포트 설정
 */
export interface ReportConfig {
  /** 리포트 ID */
  id: string;
  /** 리포트 타입 */
  type: ReportType;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 섹션 목록 */
  sections: ReportSection[];
  /** 기간 설정 */
  period: {
    type: AnalyticsPeriod;
    startDate?: Date;
    endDate?: Date;
  };
  /** 필터 */
  filters?: Record<string, unknown>;
  /** 포맷 */
  format: ReportFormat;
  /** 스케줄 (cron 표현식) */
  schedule?: string;
  /** 수신자 */
  recipients: string[];
  /** 활성화 여부 */
  enabled: boolean;
}

/**
 * 리포트 섹션
 */
export interface ReportSection {
  /** 섹션 ID */
  id: string;
  /** 섹션 제목 */
  title: string;
  /** 섹션 타입 */
  type: 'text' | 'table' | 'chart' | 'summary' | 'comparison';
  /** 데이터 쿼리 */
  query: string;
  /** 시각화 설정 */
  visualization?: Record<string, unknown>;
  /** 순서 */
  order: number;
}

/**
 * 생성된 리포트
 */
export interface GeneratedReport {
  /** 리포트 ID */
  id: string;
  /** 설정 ID 참조 */
  configId: string;
  /** 생성 시간 */
  generatedAt: Date;
  /** 기간 */
  periodStart: Date;
  periodEnd: Date;
  /** 컨텐츠 */
  content: {
    sections: {
      id: string;
      title: string;
      data: unknown;
    }[];
    summary: string;
    insights: string[];
  };
  /** 파일 경로 (저장된 경우) */
  filePath?: string;
  /** 상태 */
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

// =============================================================================
// 예측 관련 타입
// =============================================================================

/**
 * 예측 요청
 */
export interface ForecastRequest {
  /** 요청 ID */
  requestId: string;
  /** 예측 대상 */
  target: 'sales' | 'demand' | 'inventory' | 'traffic';
  /** 모델 타입 */
  modelType: ForecastModelType;
  /** 예측 기간 (일) */
  horizon: number;
  /** 세분화 단위 */
  granularity: 'hourly' | 'daily' | 'weekly';
  /** 필터 */
  filters?: {
    productIds?: string[];
    channels?: string[];
    regions?: string[];
  };
  /** 신뢰 구간 */
  confidenceLevel: number;
}

/**
 * 예측 결과
 */
export interface ForecastResult {
  /** 요청 ID 참조 */
  requestId: string;
  /** 예측 값 */
  predictions: ForecastPoint[];
  /** 모델 메트릭 */
  modelMetrics: {
    mape: number;  // Mean Absolute Percentage Error
    rmse: number;  // Root Mean Square Error
    r2: number;    // R-squared
  };
  /** 생성 시간 */
  generatedAt: Date;
  /** 다음 갱신 예정 */
  nextUpdateAt?: Date;
}

/**
 * 예측 포인트
 */
export interface ForecastPoint {
  /** 날짜 */
  date: Date;
  /** 예측 값 */
  predicted: number;
  /** 신뢰 구간 하한 */
  lowerBound: number;
  /** 신뢰 구간 상한 */
  upperBound: number;
  /** 실제 값 (과거 데이터인 경우) */
  actual?: number;
}

/**
 * 이상 감지 결과
 */
export interface AnomalyDetection {
  /** 감지 ID */
  id: string;
  /** 메트릭 ID */
  metricId: string;
  /** 메트릭 이름 */
  metricName: string;
  /** 감지 시간 */
  detectedAt: Date;
  /** 심각도 */
  severity: AnomalySeverity;
  /** 예상 값 */
  expectedValue: number;
  /** 실제 값 */
  actualValue: number;
  /** 편차 (%) */
  deviation: number;
  /** 설명 */
  description: string;
  /** 가능한 원인 */
  possibleCauses: string[];
  /** 권장 조치 */
  recommendedActions: string[];
  /** 상태 */
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved';
}

// =============================================================================
// 집계 및 트렌드 타입
// =============================================================================

/**
 * 매출 집계
 */
export interface SalesAggregation {
  /** 기간 */
  period: {
    start: Date;
    end: Date;
    type: AnalyticsPeriod;
  };
  /** 총 매출 */
  totalSales: number;
  /** 총 주문 수 */
  totalOrders: number;
  /** 평균 주문 금액 */
  averageOrderValue: number;
  /** 채널별 집계 */
  byChannel: {
    channel: string;
    sales: number;
    orders: number;
    aov: number;
  }[];
  /** 상품별 집계 */
  byProduct: {
    productId: string;
    productName: string;
    sales: number;
    quantity: number;
  }[];
  /** 시간대별 집계 */
  byTime: {
    time: Date;
    sales: number;
    orders: number;
  }[];
}

/**
 * 고객 분석
 */
export interface CustomerAnalytics {
  /** 기간 */
  period: {
    start: Date;
    end: Date;
  };
  /** 총 고객 수 */
  totalCustomers: number;
  /** 신규 고객 수 */
  newCustomers: number;
  /** 재구매 고객 수 */
  repeatCustomers: number;
  /** 이탈 고객 수 */
  churnedCustomers: number;
  /** 고객 생애 가치 */
  averageLTV: number;
  /** 구매 빈도 */
  purchaseFrequency: number;
  /** 세그먼트별 분석 */
  segments: {
    segmentId: string;
    segmentName: string;
    count: number;
    totalSpent: number;
    averageSpent: number;
  }[];
}

/**
 * 트렌드 분석
 */
export interface TrendAnalysis {
  /** 메트릭 ID */
  metricId: string;
  /** 기간 */
  period: AnalyticsPeriod;
  /** 트렌드 방향 */
  direction: 'up' | 'down' | 'stable';
  /** 변화율 (%) */
  changeRate: number;
  /** 데이터 포인트 */
  dataPoints: {
    date: Date;
    value: number;
  }[];
  /** 이동 평균 */
  movingAverage: {
    date: Date;
    value: number;
  }[];
  /** 계절성 패턴 */
  seasonality?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    strength: number;
  };
}

// =============================================================================
// 서브에이전트 태스크 타입
// =============================================================================

/**
 * 대시보드 서브에이전트 태스크
 */
export interface DashboardTaskPayload {
  action: 'aggregate_kpi' | 'update_widget' | 'refresh_realtime' | 'create_dashboard';
  dashboardId?: string;
  widgetId?: string;
  kpiIds?: string[];
  period?: AnalyticsPeriod;
  filters?: Record<string, unknown>;
}

/**
 * 리포트 서브에이전트 태스크
 */
export interface ReportTaskPayload {
  action: 'generate_report' | 'schedule_report' | 'send_report' | 'create_template';
  reportConfigId?: string;
  reportType?: ReportType;
  format?: ReportFormat;
  recipients?: string[];
  customPeriod?: {
    start: Date;
    end: Date;
  };
}

/**
 * 예측 서브에이전트 태스크
 */
export interface ForecastTaskPayload {
  action: 'generate_forecast' | 'detect_anomaly' | 'update_model' | 'evaluate_accuracy';
  forecastRequest?: ForecastRequest;
  metricsToMonitor?: string[];
  modelId?: string;
  evaluationPeriod?: {
    start: Date;
    end: Date;
  };
}
