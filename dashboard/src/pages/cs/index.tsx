import { useState, useEffect } from 'react';
import PageMeta from '../../components/common/PageMeta';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import Badge from '../../components/ui/badge/Badge';
import {
  dummyCSTickets,
  ticketStatusLabels,
  ticketStatusColors,
  ticketPriorityLabels,
  ticketPriorityColors,
  ticketTypeLabels,
} from '../../services/cs';
import type { CSTicket, TicketStatus, TicketPriority } from '../../types/database';

export default function CSPage() {
  const [tickets, setTickets] = useState<CSTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');

  useEffect(() => {
    // 데이터 로드 (더미 데이터 사용)
    const loadTickets = async () => {
      setLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setTickets(dummyCSTickets);
      } finally {
        setLoading(false);
      }
    };
    loadTickets();
  }, []);

  // 필터링된 티켓 목록
  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 대기중인 티켓 수 계산
  const pendingCount = tickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress' || t.status === 'escalated'
  ).length;

  const statusOptions: (TicketStatus | 'all')[] = [
    'all',
    'open',
    'in_progress',
    'waiting_customer',
    'resolved',
    'closed',
    'escalated',
  ];

  const priorityOptions: (TicketPriority | 'all')[] = [
    'all',
    'critical',
    'high',
    'medium',
    'low',
  ];

  // 감성 분석 결과에 따른 색상
  const getSentimentColor = (sentiment: string | null): 'success' | 'warning' | 'error' | 'light' => {
    switch (sentiment) {
      case 'positive':
        return 'success';
      case 'negative':
        return 'error';
      case 'neutral':
        return 'light';
      default:
        return 'light';
    }
  };

  const getSentimentLabel = (sentiment: string | null): string => {
    switch (sentiment) {
      case 'positive':
        return '긍정';
      case 'negative':
        return '부정';
      case 'neutral':
        return '중립';
      default:
        return '-';
    }
  };

  return (
    <>
      <PageMeta title="CS 관리 | 썬데이허그 AI" description="CS 티켓 관리 페이지" />

      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              CS 관리
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              고객 서비스 티켓을 관리합니다. 대기 중 {pendingCount}건
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              총 {filteredTickets.length}건
            </span>
          </div>
        </div>

        {/* 상태 요약 카드 */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {statusOptions.slice(1).map((status) => {
            if (status === 'all') return null;
            const count = tickets.filter((t) => t.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  statusFilter === status
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                }`}
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {ticketStatusLabels[status]}
                </p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  {count}
                </p>
              </button>
            );
          })}
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              상태
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? '전체' : ticketStatusLabels[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              우선순위
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority === 'all' ? '전체' : ticketPriorityLabels[priority]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 티켓 테이블 */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-gray-100 dark:border-gray-800 border-b bg-gray-50 dark:bg-gray-800/50">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      티켓번호
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      유형
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      제목
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      우선순위
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      상태
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      AI 분석
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      생성일시
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                        티켓이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                      >
                        <TableCell className="px-6 py-4">
                          <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {ticket.ticket_code}
                          </p>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge size="sm" color="light">
                            {ticketTypeLabels[ticket.ticket_type] || ticket.ticket_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90 max-w-xs truncate">
                            {ticket.subject}
                          </p>
                          {ticket.order_id && (
                            <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                              연결 주문: {ticket.order_id}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge size="sm" color={ticketPriorityColors[ticket.priority]}>
                            {ticketPriorityLabels[ticket.priority]}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge size="sm" color={ticketStatusColors[ticket.status]}>
                            {ticketStatusLabels[ticket.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {ticket.ai_category && (
                              <span className="text-gray-600 text-theme-xs dark:text-gray-300">
                                {ticket.ai_category}
                              </span>
                            )}
                            {ticket.ai_sentiment && (
                              <Badge size="sm" color={getSentimentColor(ticket.ai_sentiment)}>
                                {getSentimentLabel(ticket.ai_sentiment)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                          {formatDate(ticket.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredTickets.length}개의 티켓 중 1-{Math.min(10, filteredTickets.length)}개 표시
          </p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              disabled
            >
              이전
            </button>
            <button
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              disabled
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
