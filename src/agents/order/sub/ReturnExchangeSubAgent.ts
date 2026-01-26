/**
 * 반품/교환 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 반품접수, 수거요청, 환불처리를 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult, ApprovalLevel, NotificationPriority } from '../../../types';
import {
  ReturnExchangeRequest,
  ReturnExchangeType,
  ReturnReason,
  ReturnStatus,
  ReturnItem,
  PickupInfo,
  RefundInfo,
  RefundDeduction,
} from '../types';

/**
 * 자동 승인 설정
 */
interface AutoApproveConfig {
  enabled: boolean;
  maxAmount: number;
  allowedReasons: ReturnReason[];
}

/**
 * ReturnExchangeSubAgent 클래스
 * 반품/교환 처리를 담당하는 서브에이전트
 */
export class ReturnExchangeSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('ReturnExchangeSubAgent initializing...');
  }

  /**
   * 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('ReturnExchangeSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  /**
   * 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'process_return_request':
        const request = context.data as ReturnExchangeRequest;
        const processedRequest = await this.processReturnRequest(request);
        return this.createSuccessResult(processedRequest, startTime);

      case 'process_pending_returns':
        const autoApproveConfig = (context.data as { autoApproveConfig?: AutoApproveConfig })?.autoApproveConfig;
        const processedRequests = await this.processPendingReturns(autoApproveConfig);
        return this.createSuccessResult(processedRequests, startTime, {
          processed: processedRequests.length,
        });

      case 'schedule_pickup':
        const { requestId, pickupInfo } = context.data as {
          requestId: string;
          pickupInfo: Partial<PickupInfo>;
        };
        const scheduledRequest = await this.schedulePickup(requestId, pickupInfo);
        return this.createSuccessResult(scheduledRequest, startTime);

      case 'process_refund':
        const { refundRequestId } = context.data as { refundRequestId: string };
        const refundResult = await this.processRefund(refundRequestId);
        return this.createSuccessResult(refundResult, startTime);

      default:
        // 기본: 대기 중인 반품/교환 처리
        const results = await this.processPendingReturns();
        return this.createSuccessResult(results, startTime);
    }
  }

  /**
   * 반품/교환 요청 처리
   */
  async processReturnRequest(request: ReturnExchangeRequest): Promise<ReturnExchangeRequest> {
    this.logger.info('Processing return/exchange request...', {
      requestId: request.id,
      type: request.type,
      reason: request.reason,
    });

    // 요청 유효성 검증
    const validationResult = this.validateRequest(request);
    if (!validationResult.valid) {
      this.logger.warn('Return request validation failed', { errors: validationResult.errors });
      return {
        ...request,
        status: ReturnStatus.REJECTED,
        metadata: { ...request.metadata, rejectionReason: validationResult.errors.join(', ') },
      };
    }

    // 자동 승인 가능 여부 확인
    const totalAmount = request.items.reduce((sum, item) => sum + item.returnAmount, 0);
    const canAutoApprove = this.canAutoApprove(request, totalAmount);

    if (canAutoApprove) {
      // 자동 승인
      this.logger.info('Auto-approving return request', { requestId: request.id });
      return await this.approveReturnRequest(request);
    }

    // 승인 요청
    const approved = await this.requestApprovalFromParent(
      `반품/교환 승인 요청`,
      this.generateApprovalDescription(request),
      request
    );

    if (approved) {
      return await this.approveReturnRequest(request);
    } else {
      return {
        ...request,
        status: ReturnStatus.REJECTED,
        metadata: { ...request.metadata, rejectionReason: '승인 거절됨' },
      };
    }
  }

  /**
   * 요청 유효성 검증
   */
  private validateRequest(request: ReturnExchangeRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 필수 필드 확인
    if (!request.orderId) errors.push('주문 ID가 필요합니다.');
    if (!request.items || request.items.length === 0) errors.push('반품 상품 정보가 필요합니다.');
    if (!request.reason) errors.push('반품 사유가 필요합니다.');

    // 수량 검증
    for (const item of request.items) {
      if (item.returnQuantity > item.quantity) {
        errors.push(`${item.productName}: 반품 수량이 주문 수량을 초과합니다.`);
      }
      if (item.returnQuantity <= 0) {
        errors.push(`${item.productName}: 반품 수량은 1개 이상이어야 합니다.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 자동 승인 가능 여부 확인
   */
  private canAutoApprove(request: ReturnExchangeRequest, totalAmount: number): boolean {
    // 기본 자동 승인 조건:
    // 1. 고객 단순 변심이 아닌 경우 (판매자 귀책)
    // 2. 금액이 5만원 이하인 경우

    const sellerFaultReasons = [
      ReturnReason.WRONG_PRODUCT,
      ReturnReason.DEFECTIVE,
      ReturnReason.DAMAGED,
      ReturnReason.NOT_AS_DESCRIBED,
    ];

    if (sellerFaultReasons.includes(request.reason)) {
      return true;
    }

    // 소액 자동 승인
    if (totalAmount <= 50000) {
      return true;
    }

    return false;
  }

  /**
   * 반품/교환 승인
   */
  private async approveReturnRequest(request: ReturnExchangeRequest): Promise<ReturnExchangeRequest> {
    const updatedRequest: ReturnExchangeRequest = {
      ...request,
      status: ReturnStatus.APPROVED,
      processedAt: new Date(),
    };

    // DB에 저장
    const db = this.getDatabase('return_requests');
    await db.create({
      ...updatedRequest,
      created_at: request.requestedAt,
      updated_at: new Date(),
    });

    // 수거 예약 자동 진행
    if (request.type === ReturnExchangeType.RETURN || request.type === ReturnExchangeType.EXCHANGE) {
      await this.scheduleAutomaticPickup(updatedRequest);
    }

    this.logger.info('Return request approved', { requestId: request.id });

    return updatedRequest;
  }

  /**
   * 승인 설명 생성
   */
  private generateApprovalDescription(request: ReturnExchangeRequest): string {
    const totalAmount = request.items.reduce((sum, item) => sum + item.returnAmount, 0);
    const itemList = request.items.map((item) => `- ${item.productName} (${item.returnQuantity}개): ${item.returnAmount.toLocaleString()}원`).join('\n');

    return `
## 반품/교환 요청 상세

**주문 번호**: ${request.channelOrderId}
**요청 유형**: ${request.type === ReturnExchangeType.RETURN ? '반품' : request.type === ReturnExchangeType.EXCHANGE ? '교환' : '부분 반품'}
**사유**: ${this.getReasonText(request.reason)}
**상세 사유**: ${request.reasonDetail || '-'}

### 반품 상품
${itemList}

**총 환불 예정 금액**: ${totalAmount.toLocaleString()}원
    `.trim();
  }

  /**
   * 사유 텍스트 변환
   */
  private getReasonText(reason: ReturnReason): string {
    const reasonMap: Record<ReturnReason, string> = {
      [ReturnReason.CUSTOMER_CHANGE_MIND]: '단순 변심',
      [ReturnReason.WRONG_SIZE]: '사이즈 불일치',
      [ReturnReason.WRONG_PRODUCT]: '오배송',
      [ReturnReason.DEFECTIVE]: '불량',
      [ReturnReason.DAMAGED]: '파손',
      [ReturnReason.NOT_AS_DESCRIBED]: '상품 설명과 다름',
      [ReturnReason.LATE_DELIVERY]: '배송 지연',
      [ReturnReason.OTHER]: '기타',
    };
    return reasonMap[reason] || reason;
  }

  /**
   * 대기 중인 반품/교환 일괄 처리
   */
  async processPendingReturns(autoApproveConfig?: AutoApproveConfig): Promise<ReturnExchangeRequest[]> {
    this.logger.info('Processing pending return requests...');

    const db = this.getDatabase('return_requests');
    const result = await db.findMany<ReturnExchangeRequest>({
      status: ReturnStatus.REQUESTED,
    });

    if (result.error || !result.data) {
      this.logger.warn('No pending returns or error occurred');
      return [];
    }

    const processedRequests: ReturnExchangeRequest[] = [];

    for (const request of result.data) {
      try {
        const processed = await this.processReturnRequest(request);
        processedRequests.push(processed);
      } catch (error) {
        this.logger.error('Failed to process return request', error as Error, {
          requestId: request.id,
        });
      }
    }

    return processedRequests;
  }

  /**
   * 수거 예약
   */
  async schedulePickup(requestId: string, pickupInfo: Partial<PickupInfo>): Promise<ReturnExchangeRequest | null> {
    this.logger.info('Scheduling pickup...', { requestId });

    const db = this.getDatabase('return_requests');
    const result = await db.findById<ReturnExchangeRequest>(requestId);

    if (result.error || !result.data) {
      this.logger.error('Return request not found', new Error(`Request ${requestId} not found`));
      return null;
    }

    const request = result.data;

    // 수거 정보 업데이트
    const fullPickupInfo: PickupInfo = {
      scheduledDate: pickupInfo.scheduledDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 기본 2일 후
      courierCode: pickupInfo.courierCode || 'cj',
      courierName: pickupInfo.courierName || 'CJ대한통운',
      status: 'scheduled',
      address: pickupInfo.address || '',
      contactPhone: pickupInfo.contactPhone || '',
      memo: pickupInfo.memo,
    };

    const updatedRequest: ReturnExchangeRequest = {
      ...request,
      status: ReturnStatus.PICKUP_SCHEDULED,
      pickupInfo: fullPickupInfo,
    };

    await db.update({ id: requestId }, {
      status: ReturnStatus.PICKUP_SCHEDULED,
      pickup_info: fullPickupInfo,
      updated_at: new Date(),
    });

    this.logger.info('Pickup scheduled', {
      requestId,
      scheduledDate: fullPickupInfo.scheduledDate,
    });

    return updatedRequest;
  }

  /**
   * 자동 수거 예약
   */
  private async scheduleAutomaticPickup(request: ReturnExchangeRequest): Promise<void> {
    // TODO: 실제 택배사 수거 예약 API 연동
    this.logger.info('Scheduling automatic pickup...', { requestId: request.id });

    await this.schedulePickup(request.id, {
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      courierCode: 'cj',
      courierName: 'CJ대한통운',
    });
  }

  /**
   * 환불 처리
   */
  async processRefund(requestId: string): Promise<ReturnExchangeRequest | null> {
    this.logger.info('Processing refund...', { requestId });

    const db = this.getDatabase('return_requests');
    const result = await db.findById<ReturnExchangeRequest>(requestId);

    if (result.error || !result.data) {
      this.logger.error('Return request not found', new Error(`Request ${requestId} not found`));
      return null;
    }

    const request = result.data;

    // 환불 금액 계산
    const refundInfo = this.calculateRefund(request);

    // 환불 처리 (실제로는 결제사 API 호출)
    const refundResult = await this.executeRefund(request, refundInfo);

    if (!refundResult.success) {
      this.logger.error('Refund failed', new Error(refundResult.error || 'Unknown error'));
      return null;
    }

    // 상태 업데이트
    const updatedRequest: ReturnExchangeRequest = {
      ...request,
      status: ReturnStatus.REFUND_COMPLETED,
      refundInfo: {
        ...refundInfo,
        status: 'completed',
        processedAt: new Date(),
      },
      completedAt: new Date(),
    };

    await db.update({ id: requestId }, {
      status: ReturnStatus.REFUND_COMPLETED,
      refund_info: updatedRequest.refundInfo,
      completed_at: new Date(),
      updated_at: new Date(),
    });

    // 알림 발송
    await this.notifyParent(
      '환불 완료',
      `주문 ${request.channelOrderId}의 환불이 완료되었습니다.\n환불 금액: ${refundInfo.totalRefundAmount.toLocaleString()}원`,
      NotificationPriority.MEDIUM
    );

    this.logger.info('Refund completed', {
      requestId,
      refundAmount: refundInfo.totalRefundAmount,
    });

    return updatedRequest;
  }

  /**
   * 환불 금액 계산
   */
  private calculateRefund(request: ReturnExchangeRequest): RefundInfo {
    const productRefundAmount = request.items.reduce((sum, item) => sum + item.returnAmount, 0);
    const deductions: RefundDeduction[] = [];

    // 고객 귀책 사유인 경우 배송비 차감
    const customerFaultReasons = [ReturnReason.CUSTOMER_CHANGE_MIND, ReturnReason.WRONG_SIZE];
    if (customerFaultReasons.includes(request.reason)) {
      deductions.push({
        type: 'shipping_fee',
        amount: 3000,
        reason: '반품 배송비 (고객 귀책)',
      });
    }

    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

    return {
      totalRefundAmount: productRefundAmount - totalDeductions,
      productRefundAmount,
      shippingRefundAmount: 0,
      deductions,
      method: 'original',
      status: 'pending',
    };
  }

  /**
   * 환불 실행
   */
  private async executeRefund(
    request: ReturnExchangeRequest,
    refundInfo: RefundInfo
  ): Promise<{ success: boolean; error?: string }> {
    // TODO: 실제 PG사/결제수단별 환불 API 연동
    this.logger.info('Executing refund...', {
      requestId: request.id,
      amount: refundInfo.totalRefundAmount,
    });

    await this.sleep(500);

    return { success: true };
  }

  /**
   * 현재 진행 상황 조회
   */
  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'processing',
      message: '반품/교환 요청 처리 중...',
    };
  }
}

export default ReturnExchangeSubAgent;
