import { useEffect, useState } from 'react';
import { DollarLineIcon, ArrowUpIcon, ArrowDownIcon } from '../../icons';
import Badge from '../ui/badge/Badge';
import { ordersService } from '../../services/orders';

interface SalesStats {
  totalSales: number;
  orderCount: number;
  pendingOrders: number;
}

export default function TodaySalesCard() {
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 1234000,
    orderCount: 23,
    pendingOrders: 5,
  });
  const [loading, setLoading] = useState(true);
  const [changePercent] = useState(12.5); // 전일 대비 변화율 (더미)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await ordersService.getTodayStats();
        if (data) {
          setStats(data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const isPositive = changePercent > 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-center w-12 h-12 bg-brand-50 rounded-xl dark:bg-brand-500/15">
        <DollarLineIcon className="text-brand-500 size-6 dark:text-brand-400" />
      </div>

      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            오늘 매출
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {loading ? (
              <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 w-32 inline-block" />
            ) : (
              formatCurrency(stats.totalSales)
            )}
          </h4>
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            주문 {stats.orderCount}건
          </span>
        </div>
        <Badge color={isPositive ? 'success' : 'error'}>
          {isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />}
          {Math.abs(changePercent)}%
        </Badge>
      </div>
    </div>
  );
}
