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
  dummyOrders,
  orderStatusLabels,
  orderStatusColors,
  channelLabels,
} from '../../services/orders';
import type { Order, OrderStatus, ChannelType } from '../../types/database';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelType | 'all'>('all');

  useEffect(() => {
    // 데이터 로드 (더미 데이터 사용)
    const loadOrders = async () => {
      setLoading(true);
      try {
        // 실제 API 호출 대신 더미 데이터 사용
        await new Promise((resolve) => setTimeout(resolve, 300));
        setOrders(dummyOrders);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  // 필터링된 주문 목록
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (channelFilter !== 'all' && order.channel !== channelFilter) return false;
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

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

  const statusOptions: (OrderStatus | 'all')[] = [
    'all',
    'pending',
    'paid',
    'preparing',
    'shipping',
    'delivered',
    'cancelled',
    'refund_requested',
    'refunded',
  ];

  const channelOptions: (ChannelType | 'all')[] = [
    'all',
    'coupang',
    'naver',
    'cafe24',
    'own_mall',
    'offline',
  ];

  return (
    <>
      <PageMeta title="주문 관리 | 썬데이허그 AI" description="주문 관리 페이지" />

      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              주문 관리
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              전체 주문 목록과 상태를 관리합니다.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              총 {filteredOrders.length}건
            </span>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              상태
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? '전체' : orderStatusLabels[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              채널
            </label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as ChannelType | 'all')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {channelOptions.map((channel) => (
                <option key={channel} value={channel}>
                  {channel === 'all' ? '전체' : channelLabels[channel]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 주문 테이블 */}
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
                      주문번호
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      채널
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      고객정보
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      금액
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
                      운송장번호
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      주문일시
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                        주문 내역이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                      >
                        <TableCell className="px-6 py-4">
                          <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {order.order_code}
                          </p>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge size="sm" color="light">
                            {channelLabels[order.channel]}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {order.shipping_name}
                          </p>
                          <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                            {order.shipping_phone}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge size="sm" color={orderStatusColors[order.status]}>
                            {orderStatusLabels[order.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                          {order.tracking_number || '-'}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                          {formatDate(order.ordered_at)}
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
            {filteredOrders.length}개의 주문 중 1-{Math.min(10, filteredOrders.length)}개 표시
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
