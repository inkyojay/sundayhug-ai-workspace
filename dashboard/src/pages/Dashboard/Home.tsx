import PageMeta from "../../components/common/PageMeta";
import {
  TodaySalesCard,
  NewOrdersCard,
  CSPendingCard,
  InventoryAlertCard,
} from "../../components/dashboard";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import {
  dummyOrders,
  orderStatusLabels,
  orderStatusColors,
  channelLabels,
} from "../../services/orders";
import {
  dummyCSTickets,
  ticketStatusLabels,
  ticketStatusColors,
  ticketPriorityLabels,
  ticketPriorityColors,
} from "../../services/cs";
import type { Order, CSTicket } from "../../types/database";

export default function Home() {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentTickets, setRecentTickets] = useState<CSTicket[]>([]);

  useEffect(() => {
    // 최근 주문 5건
    setRecentOrders(dummyOrders.slice(0, 5));
    // 최근 CS 티켓 5건
    setRecentTickets(dummyCSTickets.slice(0, 5));
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <PageMeta
        title="대시보드 | 썬데이허그 AI"
        description="썬데이허그 AI 이커머스 대시보드"
      />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* 현황 카드들 */}
        <div className="col-span-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
            <TodaySalesCard />
            <NewOrdersCard />
            <CSPendingCard />
            <InventoryAlertCard />
          </div>
        </div>

        {/* 최근 주문 */}
        <div className="col-span-12 xl:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
            <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  최근 주문
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/orders"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                >
                  전체보기
                </a>
              </div>
            </div>
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      주문번호
                    </TableCell>
                    <TableCell
                      isHeader
                      className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      채널
                    </TableCell>
                    <TableCell
                      isHeader
                      className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      금액
                    </TableCell>
                    <TableCell
                      isHeader
                      className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      상태
                    </TableCell>
                    <TableCell
                      isHeader
                      className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      주문일시
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="py-3">
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {order.order_code}
                        </p>
                        <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                          {order.shipping_name}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <Badge size="sm" color="light">
                          {channelLabels[order.channel]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge size="sm" color={orderStatusColors[order.status]}>
                          {orderStatusLabels[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        {formatDate(order.ordered_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* 최근 CS 티켓 */}
        <div className="col-span-12 xl:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
            <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  최근 CS 티켓
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/cs"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                >
                  전체보기
                </a>
              </div>
            </div>
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      티켓번호
                    </TableCell>
                    <TableCell
                      isHeader
                      className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      우선순위
                    </TableCell>
                    <TableCell
                      isHeader
                      className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      상태
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="py-3">
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {ticket.ticket_code}
                        </p>
                        <span className="text-gray-500 text-theme-xs dark:text-gray-400 line-clamp-1">
                          {ticket.subject}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          size="sm"
                          color={ticketPriorityColors[ticket.priority]}
                        >
                          {ticketPriorityLabels[ticket.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          size="sm"
                          color={ticketStatusColors[ticket.status]}
                        >
                          {ticketStatusLabels[ticket.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
