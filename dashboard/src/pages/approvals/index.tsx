import { useState, useEffect, useMemo } from 'react';
import PageMeta from '../../components/common/PageMeta';
import Badge from '../../components/ui/badge/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import { supabase } from '../../services/supabase';
import type { ApprovalRequest } from '../../types/database';

// 승인 상태별 배지 색상
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

const getStatusBadge = (status: ApprovalStatus): { color: 'warning' | 'success' | 'error' | 'light'; label: string } => {
  const config: Record<ApprovalStatus, { color: 'warning' | 'success' | 'error' | 'light'; label: string }> = {
    pending: { color: 'warning', label: '대기 중' },
    approved: { color: 'success', label: '승인됨' },
    rejected: { color: 'error', label: '거절됨' },
    expired: { color: 'light', label: '만료됨' },
  };
  return config[status];
};

// 승인 유형 라벨
const getApprovalTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    high_value_order: '고가 주문',
    refund_request: '환불 요청',
    bulk_action: '대량 작업',
    external_api: '외부 API 호출',
    data_export: '데이터 내보내기',
    price_change: '가격 변경',
    inventory_adjustment: '재고 조정',
    marketing_campaign: '마케팅 캠페인',
    system_config: '시스템 설정',
  };
  return labels[type] || type;
};

// 더미 승인 요청 데이터
const DUMMY_APPROVALS: ApprovalRequest[] = [
  {
    id: 'approval-001',
    task_id: 'task-001',
    agent_id: 'agent-001',
    approval_type: 'high_value_order',
    request_data: {
      order_id: 'ORD-2025012700001',
      order_amount: 5500000,
      customer_name: '김민수',
      reason: '500만원 이상 고가 주문 자동 승인 요청',
      action: '주문 확정 및 배송 준비',
    },
    status: 'pending',
    expires_at: '2025-01-28T00:00:00Z',
    created_at: '2025-01-27T08:30:00Z',
    updated_at: '2025-01-27T08:30:00Z',
  },
  {
    id: 'approval-002',
    task_id: 'task-002',
    agent_id: 'agent-002',
    approval_type: 'refund_request',
    request_data: {
      ticket_id: 'CS-2025012700023',
      order_id: 'ORD-2025012500015',
      refund_amount: 89000,
      reason: '고객 요청 - 상품 불만족',
      action: '전액 환불 처리',
    },
    status: 'pending',
    expires_at: '2025-01-27T18:00:00Z',
    created_at: '2025-01-27T09:15:00Z',
    updated_at: '2025-01-27T09:15:00Z',
  },
  {
    id: 'approval-003',
    task_id: 'task-003',
    agent_id: 'agent-003',
    approval_type: 'marketing_campaign',
    request_data: {
      campaign_name: '2025 설날 맞이 할인 이벤트',
      budget: 3000000,
      target_audience: 'VIP 고객',
      duration: '2025-01-25 ~ 2025-02-02',
      action: '캠페인 시작 및 광고 집행',
    },
    status: 'pending',
    expires_at: '2025-01-27T23:59:59Z',
    created_at: '2025-01-27T07:00:00Z',
    updated_at: '2025-01-27T07:00:00Z',
  },
  {
    id: 'approval-004',
    task_id: 'task-004',
    agent_id: 'agent-004',
    approval_type: 'bulk_action',
    request_data: {
      action_type: '재고 일괄 업데이트',
      affected_items: 156,
      reason: '연말 재고 실사 결과 반영',
      action: '156개 상품 재고 수량 조정',
    },
    status: 'pending',
    expires_at: '2025-01-28T12:00:00Z',
    created_at: '2025-01-27T10:00:00Z',
    updated_at: '2025-01-27T10:00:00Z',
  },
  {
    id: 'approval-005',
    task_id: 'task-005',
    agent_id: 'agent-005',
    approval_type: 'price_change',
    request_data: {
      product_name: '프리미엄 스킨케어 세트',
      current_price: 159000,
      new_price: 129000,
      reason: '경쟁사 가격 인하 대응',
      action: '가격 인하 적용',
    },
    status: 'approved',
    expires_at: '2025-01-27T15:00:00Z',
    created_at: '2025-01-27T06:30:00Z',
    updated_at: '2025-01-27T08:00:00Z',
  },
  {
    id: 'approval-006',
    task_id: 'task-006',
    agent_id: 'agent-006',
    approval_type: 'external_api',
    request_data: {
      api_name: '신규 배송업체 API 연동',
      provider: '롯데택배',
      scope: '배송 조회, 발송 등록',
      action: 'API 연동 활성화',
    },
    status: 'rejected',
    expires_at: '2025-01-26T18:00:00Z',
    created_at: '2025-01-26T10:00:00Z',
    updated_at: '2025-01-26T14:30:00Z',
  },
  {
    id: 'approval-007',
    task_id: 'task-007',
    agent_id: 'agent-012',
    approval_type: 'data_export',
    request_data: {
      export_type: '고객 구매 이력 데이터',
      date_range: '2024-01-01 ~ 2024-12-31',
      record_count: 45230,
      format: 'CSV',
      action: '데이터 내보내기 실행',
    },
    status: 'expired',
    expires_at: '2025-01-26T12:00:00Z',
    created_at: '2025-01-25T15:00:00Z',
    updated_at: '2025-01-26T12:00:00Z',
  },
];

// 에이전트 이름 매핑
const AGENT_NAMES: Record<string, string> = {
  'agent-001': 'Order Agent',
  'agent-002': 'CS Agent',
  'agent-003': 'Marketing Agent',
  'agent-004': 'Inventory Agent',
  'agent-005': 'Product Agent',
  'agent-006': 'Logistics Agent',
  'agent-012': 'Analytics Agent',
};

// 통계 카드 컴포넌트
interface StatCardProps {
  title: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, color, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// 승인 요청 카드 컴포넌트 (그리드 뷰용)
interface ApprovalCardProps {
  approval: ApprovalRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function ApprovalCard({ approval, onApprove, onReject }: ApprovalCardProps) {
  const statusBadge = getStatusBadge(approval.status);
  const requestData = approval.request_data as Record<string, unknown>;
  const expiresAt = approval.expires_at ? new Date(approval.expires_at) : null;
  const isExpiringSoon =
    expiresAt && approval.status === 'pending' && expiresAt.getTime() - Date.now() < 6 * 60 * 60 * 1000;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden ${
        isExpiringSoon
          ? 'border-warning-300 dark:border-warning-500'
          : 'border-gray-100 dark:border-gray-700'
      }`}
    >
      {/* 헤더 */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge color={statusBadge.color} size="sm">
              {statusBadge.label}
            </Badge>
            {isExpiringSoon && (
              <span className="text-xs text-warning-600 dark:text-warning-400 font-medium">
                곧 만료
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(approval.created_at).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          {getApprovalTypeLabel(approval.approval_type)}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          요청자: {AGENT_NAMES[approval.agent_id || ''] || '알 수 없음'}
        </p>
      </div>

      {/* 본문 */}
      <div className="p-5">
        <div className="space-y-2">
          {Object.entries(requestData)
            .filter(([key]) => key !== 'action')
            .slice(0, 3)
            .map(([key, value]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[80px]">
                  {key === 'reason'
                    ? '사유'
                    : key === 'order_id'
                    ? '주문번호'
                    : key === 'order_amount'
                    ? '주문금액'
                    : key === 'refund_amount'
                    ? '환불금액'
                    : key === 'budget'
                    ? '예산'
                    : key === 'affected_items'
                    ? '영향항목'
                    : key}
                  :
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {typeof value === 'number'
                    ? value.toLocaleString('ko-KR') + (key.includes('amount') || key.includes('budget') || key.includes('price') ? '원' : '')
                    : String(value)}
                </span>
              </div>
            ))}
        </div>
        {'action' in requestData && requestData.action != null && (
          <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">작업:</span> {String(requestData.action)}
          </div>
        )}
        {expiresAt && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            만료: {expiresAt.toLocaleString('ko-KR')}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      {approval.status === 'pending' && (
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
          <button
            onClick={() => onReject(approval.id)}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            거절
          </button>
          <button
            onClick={() => onApprove(approval.id)}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            승인
          </button>
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    async function fetchApprovals() {
      try {
        const { data, error } = await supabase
          .from('approval_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setApprovals(data || DUMMY_APPROVALS);
      } catch {
        console.warn('Supabase 연결 실패, 더미 데이터 사용');
        setApprovals(DUMMY_APPROVALS);
      } finally {
        setLoading(false);
      }
    }
    fetchApprovals();
  }, []);

  // 필터링된 승인 요청
  const filteredApprovals = useMemo(() => {
    return approvals.filter((approval) => {
      const statusMatch =
        filterStatus === 'all' || approval.status === filterStatus;
      const typeMatch =
        filterType === 'all' || approval.approval_type === filterType;
      return statusMatch && typeMatch;
    });
  }, [approvals, filterStatus, filterType]);

  // 통계 계산
  const stats = useMemo(() => {
    const pending = approvals.filter((a) => a.status === 'pending').length;
    const approved = approvals.filter((a) => a.status === 'approved').length;
    const rejected = approvals.filter((a) => a.status === 'rejected').length;
    const expired = approvals.filter((a) => a.status === 'expired').length;
    return { total: approvals.length, pending, approved, rejected, expired };
  }, [approvals]);

  // 고유한 승인 유형 목록
  const approvalTypes = useMemo(() => {
    const types = new Set(approvals.map((a) => a.approval_type));
    return Array.from(types);
  }, [approvals]);

  // 승인 핸들러
  const handleApprove = async (id: string) => {
    // 실제로는 API 호출
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: 'approved' as const, updated_at: new Date().toISOString() }
          : a
      )
    );
    alert('승인되었습니다.');
  };

  // 거절 핸들러
  const handleReject = async (id: string) => {
    // 실제로는 API 호출
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: 'rejected' as const, updated_at: new Date().toISOString() }
          : a
      )
    );
    alert('거절되었습니다.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="승인 관리 | 썬데이허그 AI"
        description="승인 요청 관리 페이지"
      />
      <div className="p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            승인 관리
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI 에이전트의 승인 요청을 검토하고 처리합니다.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="전체 요청"
            value={stats.total}
            color="bg-brand-100 dark:bg-brand-500/20"
            icon={
              <svg
                className="w-6 h-6 text-brand-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
          />
          <StatCard
            title="대기 중"
            value={stats.pending}
            color="bg-warning-100 dark:bg-warning-500/20"
            icon={
              <svg
                className="w-6 h-6 text-warning-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            title="승인됨"
            value={stats.approved}
            color="bg-success-100 dark:bg-success-500/20"
            icon={
              <svg
                className="w-6 h-6 text-success-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            title="거절됨"
            value={stats.rejected}
            color="bg-error-100 dark:bg-error-500/20"
            icon={
              <svg
                className="w-6 h-6 text-error-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            title="만료됨"
            value={stats.expired}
            color="bg-gray-100 dark:bg-gray-500/20"
            icon={
              <svg
                className="w-6 h-6 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            }
          />
        </div>

        {/* 필터 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                상태:
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ApprovalStatus | 'all')}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
              >
                <option value="all">전체</option>
                <option value="pending">대기 중</option>
                <option value="approved">승인됨</option>
                <option value="rejected">거절됨</option>
                <option value="expired">만료됨</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                유형:
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
              >
                <option value="all">전체</option>
                {approvalTypes.map((type) => (
                  <option key={type} value={type}>
                    {getApprovalTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>

            {/* 뷰 모드 토글 */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </button>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredApprovals.length}개의 요청 표시 중
            </div>
          </div>
        </div>

        {/* 승인 요청 목록 */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApprovals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <Table className="w-full">
              <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    유형
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    요청자
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    상태
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    요청 시간
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    만료
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    액션
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApprovals.map((approval) => {
                  const statusBadge = getStatusBadge(approval.status);
                  return (
                    <TableRow
                      key={approval.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <TableCell className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {getApprovalTypeLabel(approval.approval_type)}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {AGENT_NAMES[approval.agent_id || ''] || '알 수 없음'}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge color={statusBadge.color} size="sm">
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(approval.created_at).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {approval.expires_at
                          ? new Date(approval.expires_at).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {approval.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReject(approval.id)}
                              className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              거절
                            </button>
                            <button
                              onClick={() => handleApprove(approval.id)}
                              className="px-2 py-1 text-xs font-medium text-white bg-brand-500 rounded hover:bg-brand-600"
                            >
                              승인
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 승인 요청이 없을 때 */}
        {filteredApprovals.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              승인 요청이 없습니다
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              필터 조건에 맞는 승인 요청이 없습니다.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
