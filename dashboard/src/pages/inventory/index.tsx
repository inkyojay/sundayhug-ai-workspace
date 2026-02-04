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
  dummyInventory,
  getInventoryStatus,
  inventoryStatusLabels,
  inventoryStatusColors,
} from '../../services/inventory';
import type { Inventory, Product } from '../../types/database';

type InventoryWithProduct = Inventory & { product?: Product };

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'low' | 'out'>('all');

  useEffect(() => {
    // 데이터 로드 (더미 데이터 사용)
    const loadInventory = async () => {
      setLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setInventory(dummyInventory);
      } finally {
        setLoading(false);
      }
    };
    loadInventory();
  }, []);

  // 필터링된 재고 목록
  const filteredInventory = inventory.filter((item) => {
    if (statusFilter === 'all') return true;
    const status = getInventoryStatus(item);
    return status === statusFilter;
  });

  // 통계 계산
  const stats = {
    total: inventory.length,
    normal: inventory.filter((i) => getInventoryStatus(i) === 'normal').length,
    low: inventory.filter((i) => getInventoryStatus(i) === 'low').length,
    out: inventory.filter((i) => getInventoryStatus(i) === 'out').length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  // 재고 수준 진행바 색상
  const getProgressColor = (available: number, safety: number) => {
    if (available === 0) return 'bg-error-500';
    if (available <= safety) return 'bg-warning-500';
    return 'bg-success-500';
  };

  const statusOptions: ('all' | 'normal' | 'low' | 'out')[] = ['all', 'normal', 'low', 'out'];

  return (
    <>
      <PageMeta title="재고 관리 | 썬데이허그 AI" description="재고 관리 페이지" />

      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              재고 관리
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              상품 재고 현황을 관리합니다.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              총 {filteredInventory.length}개 상품
            </span>
          </div>
        </div>

        {/* 상태 요약 카드 */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl border p-4 text-left transition-colors ${
              statusFilter === 'all'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">전체 상품</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </p>
          </button>
          <button
            onClick={() => setStatusFilter('normal')}
            className={`rounded-xl border p-4 text-left transition-colors ${
              statusFilter === 'normal'
                ? 'border-success-500 bg-success-50 dark:bg-success-500/10'
                : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">정상</p>
            <p className="mt-1 text-2xl font-bold text-success-600 dark:text-success-400">
              {stats.normal}
            </p>
          </button>
          <button
            onClick={() => setStatusFilter('low')}
            className={`rounded-xl border p-4 text-left transition-colors ${
              statusFilter === 'low'
                ? 'border-warning-500 bg-warning-50 dark:bg-warning-500/10'
                : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">부족</p>
            <p className="mt-1 text-2xl font-bold text-warning-600 dark:text-orange-400">
              {stats.low}
            </p>
          </button>
          <button
            onClick={() => setStatusFilter('out')}
            className={`rounded-xl border p-4 text-left transition-colors ${
              statusFilter === 'out'
                ? 'border-error-500 bg-error-50 dark:bg-error-500/10'
                : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">품절</p>
            <p className="mt-1 text-2xl font-bold text-error-600 dark:text-error-400">
              {stats.out}
            </p>
          </button>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              재고 상태
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? '전체' : inventoryStatusLabels[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 재고 테이블 */}
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
                      상품정보
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      SKU
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      판매가
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      총 재고
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      가용 재고
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      재고 수준
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-6 py-4 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      상태
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                        재고 정보가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item) => {
                      const status = getInventoryStatus(item);
                      const progressPercent = item.safety_stock > 0
                        ? Math.min((item.available_quantity / (item.safety_stock * 2)) * 100, 100)
                        : 100;

                      return (
                        <TableRow
                          key={item.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                        >
                          <TableCell className="px-6 py-4">
                            <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {item.product?.name || '상품명 없음'}
                            </p>
                            <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                              {item.product?.category || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                            {item.sku}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            {item.product?.sale_price ? (
                              <div>
                                <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                  {formatCurrency(item.product.sale_price)}
                                </p>
                                <span className="text-gray-400 text-theme-xs line-through">
                                  {formatCurrency(item.product.base_price)}
                                </span>
                              </div>
                            ) : (
                              <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                {formatCurrency(item.product?.base_price || 0)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                            {item.total_quantity}개
                            {item.reserved_quantity > 0 && (
                              <span className="text-gray-500 text-theme-xs dark:text-gray-400 ml-1">
                                (예약 {item.reserved_quantity})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                            {item.available_quantity}개
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="w-24">
                              <div className="flex items-center justify-between text-theme-xs mb-1">
                                <span className="text-gray-500 dark:text-gray-400">
                                  안전재고: {item.safety_stock}
                                </span>
                              </div>
                              <div className="h-2 w-full bg-gray-200 rounded-full dark:bg-gray-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${getProgressColor(
                                    item.available_quantity,
                                    item.safety_stock
                                  )}`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge size="sm" color={inventoryStatusColors[status]}>
                              {inventoryStatusLabels[status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredInventory.length}개의 상품 중 1-{Math.min(10, filteredInventory.length)}개 표시
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
