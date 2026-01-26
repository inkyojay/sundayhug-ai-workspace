import { useEffect, useState } from 'react';
import { BoxIconLine, ArrowUpIcon, ArrowDownIcon } from '../../icons';
import Badge from '../ui/badge/Badge';
import { ordersService } from '../../services/orders';

interface OrderStats {
  totalSales: number;
  orderCount: number;
  pendingOrders: number;
}

export default function NewOrdersCard() {
  const [stats, setStats] = useState<OrderStats>({
    totalSales: 0,
    orderCount: 23,
    pendingOrders: 5,
  });
  const [loading, setLoading] = useState(true);
  const [changePercent] = useState(-3.2); // 전일 대비 변화율 (더미)

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

  const isPositive = changePercent > 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-center w-12 h-12 bg-success-50 rounded-xl dark:bg-success-500/15">
        <BoxIconLine className="text-success-500 size-6 dark:text-success-400" />
      </div>

      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            신규 주문
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {loading ? (
              <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 w-16 inline-block" />
            ) : (
              `${stats.orderCount}건`
            )}
          </h4>
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            처리대기 {stats.pendingOrders}건
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
