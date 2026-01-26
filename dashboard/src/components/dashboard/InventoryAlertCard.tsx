import { useEffect, useState } from 'react';
import { BoxCubeIcon, ArrowUpIcon, ArrowDownIcon } from '../../icons';
import Badge from '../ui/badge/Badge';
import { inventoryService } from '../../services/inventory';

interface InventoryStats {
  outOfStock: number;
  lowStock: number;
  normalStock: number;
  total: number;
}

export default function InventoryAlertCard() {
  const [stats, setStats] = useState<InventoryStats>({
    outOfStock: 1,
    lowStock: 2,
    normalStock: 3,
    total: 6,
  });
  const [loading, setLoading] = useState(true);
  const [changePercent] = useState(2); // 전일 대비 변화율 (더미)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await inventoryService.getAlertStats();
        if (data) {
          setStats(data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const alertCount = stats.outOfStock + stats.lowStock;
  const isPositive = changePercent > 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-center w-12 h-12 bg-error-50 rounded-xl dark:bg-error-500/15">
        <BoxCubeIcon className="text-error-500 size-6 dark:text-error-400" />
      </div>

      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            재고 알림
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {loading ? (
              <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 w-16 inline-block" />
            ) : (
              `${alertCount}건`
            )}
          </h4>
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            품절 {stats.outOfStock}건 | 부족 {stats.lowStock}건
          </span>
        </div>
        <Badge color={isPositive ? 'error' : 'success'}>
          {isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />}
          {Math.abs(changePercent)}건
        </Badge>
      </div>
    </div>
  );
}
