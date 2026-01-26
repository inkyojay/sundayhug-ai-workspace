/**
 * AS처리 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: AS접수, 진행추적, 완료안내
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult, NotificationPriority } from '../../../types';
import { ASRequest, ASType, ASStatus, ASCost } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * ASHandlerSubAgent 클래스
 * A/S 요청 처리를 담당하는 서브에이전트
 */
export class ASHandlerSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('ASHandlerSubAgent initializing...');
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('ASHandlerSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'create_as_request':
        const requestData = context.data as Partial<ASRequest>;
        const createdRequest = await this.createASRequest(requestData);
        return this.createSuccessResult(createdRequest, startTime);

      case 'update_as_status':
        const updateResult = await this.updateAllASStatuses();
        return this.createSuccessResult(updateResult, startTime);

      case 'complete_as_request':
        const { requestId, solution, cost } = context.data as {
          requestId: string;
          solution: string;
          cost?: ASCost;
        };
        const completedRequest = await this.completeASRequest(requestId, solution, cost);
        return this.createSuccessResult(completedRequest, startTime);

      default:
        const defaultResult = await this.updateAllASStatuses();
        return this.createSuccessResult(defaultResult, startTime);
    }
  }

  /**
   * AS 요청 생성
   */
  async createASRequest(data: Partial<ASRequest>): Promise<ASRequest> {
    this.logger.info('Creating AS request...');

    const request: ASRequest = {
      id: uuidv4(),
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      customerContact: data.customerContact || '',
      orderId: data.orderId,
      productId: data.productId || '',
      productName: data.productName || '',
      purchaseDate: data.purchaseDate,
      type: data.type || ASType.REPAIR,
      status: ASStatus.REQUESTED,
      symptom: data.symptom || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 보증 기간 확인
    const warrantyCheck = await this.checkWarranty(request);
    if (warrantyCheck.inWarranty) {
      request.cost = {
        laborCost: 0,
        partsCost: 0,
        shippingCost: 3000,
        totalCost: 3000,
        warranty: true,
        warrantyNote: warrantyCheck.note,
      };
    }

    // DB에 저장
    const db = this.getDatabase('as_requests');
    await db.create({
      ...request,
      created_at: request.createdAt,
      updated_at: request.updatedAt,
    });

    // 고객에게 접수 안내
    await this.sendASConfirmation(request);

    this.logger.info('AS request created', { requestId: request.id });

    return request;
  }

  /**
   * 보증 기간 확인
   */
  private async checkWarranty(request: ASRequest): Promise<{ inWarranty: boolean; note?: string }> {
    if (!request.purchaseDate) {
      return { inWarranty: false, note: '구매일 확인 불가' };
    }

    const purchaseDate = new Date(request.purchaseDate);
    const now = new Date();
    const warrantyPeriod = 365 * 24 * 60 * 60 * 1000; // 1년

    if (now.getTime() - purchaseDate.getTime() <= warrantyPeriod) {
      return { inWarranty: true, note: '무상 보증 기간 내' };
    }

    return { inWarranty: false, note: '보증 기간 만료' };
  }

  /**
   * AS 접수 확인 안내
   */
  private async sendASConfirmation(request: ASRequest): Promise<void> {
    // TODO: 실제 알림 발송 (카카오톡, SMS 등)
    this.logger.info('Sending AS confirmation', { requestId: request.id });
  }

  /**
   * 모든 AS 상태 업데이트
   */
  async updateAllASStatuses(): Promise<{ updated: number }> {
    this.logger.info('Updating all AS statuses...');

    const db = this.getDatabase('as_requests');
    const result = await db.findMany<ASRequest>({
      status: { $in: [ASStatus.REQUESTED, ASStatus.CONFIRMED, ASStatus.IN_PROGRESS, ASStatus.WAITING_PARTS] },
    });

    if (result.error || !result.data) {
      return { updated: 0 };
    }

    let updated = 0;

    for (const request of result.data) {
      const newStatus = await this.checkASProgress(request);

      if (newStatus !== request.status) {
        await db.update({ id: request.id }, {
          status: newStatus,
          updated_at: new Date(),
        });

        // 상태 변경 알림
        await this.notifyStatusChange(request, newStatus);
        updated++;
      }
    }

    return { updated };
  }

  /**
   * AS 진행 상태 확인
   */
  private async checkASProgress(request: ASRequest): Promise<ASStatus> {
    // TODO: 실제 AS 진행 상태 확인 로직
    // 현재는 시뮬레이션

    const daysSinceCreated = (Date.now() - request.createdAt.getTime()) / (24 * 60 * 60 * 1000);

    switch (request.status) {
      case ASStatus.REQUESTED:
        if (daysSinceCreated >= 1) return ASStatus.CONFIRMED;
        break;
      case ASStatus.CONFIRMED:
        if (daysSinceCreated >= 2) return ASStatus.IN_PROGRESS;
        break;
      case ASStatus.IN_PROGRESS:
        if (daysSinceCreated >= 5) return ASStatus.COMPLETED;
        break;
    }

    return request.status;
  }

  /**
   * 상태 변경 알림
   */
  private async notifyStatusChange(request: ASRequest, newStatus: ASStatus): Promise<void> {
    const statusMessages: Record<ASStatus, string> = {
      [ASStatus.REQUESTED]: 'A/S 요청이 접수되었습니다.',
      [ASStatus.CONFIRMED]: 'A/S 요청이 확인되었습니다. 곧 진행됩니다.',
      [ASStatus.IN_PROGRESS]: 'A/S가 진행 중입니다.',
      [ASStatus.WAITING_PARTS]: '부품 입고 대기 중입니다.',
      [ASStatus.COMPLETED]: 'A/S가 완료되었습니다.',
      [ASStatus.CANCELLED]: 'A/S 요청이 취소되었습니다.',
    };

    // TODO: 고객에게 알림 발송
    this.logger.info('Notifying AS status change', {
      requestId: request.id,
      newStatus,
      message: statusMessages[newStatus],
    });
  }

  /**
   * AS 요청 완료
   */
  async completeASRequest(requestId: string, solution: string, cost?: ASCost): Promise<ASRequest | null> {
    const db = this.getDatabase('as_requests');
    const result = await db.findById<ASRequest>(requestId);

    if (result.error || !result.data) {
      this.logger.error('AS request not found', new Error(`Request ${requestId} not found`));
      return null;
    }

    const request = result.data;

    const updatedRequest: ASRequest = {
      ...request,
      status: ASStatus.COMPLETED,
      solution,
      cost: cost || request.cost,
      completedDate: new Date(),
      updatedAt: new Date(),
    };

    await db.update({ id: requestId }, {
      status: ASStatus.COMPLETED,
      solution,
      cost: updatedRequest.cost,
      completed_date: updatedRequest.completedDate,
      updated_at: updatedRequest.updatedAt,
    });

    // 완료 안내 발송
    await this.sendCompletionNotice(updatedRequest);

    this.logger.info('AS request completed', { requestId });

    return updatedRequest;
  }

  /**
   * 완료 안내 발송
   */
  private async sendCompletionNotice(request: ASRequest): Promise<void> {
    // TODO: 실제 알림 발송
    this.logger.info('Sending AS completion notice', { requestId: request.id });

    await this.notifyParent(
      'A/S 완료',
      `[${request.productName}] A/S가 완료되었습니다.\n해결: ${request.solution}`,
      NotificationPriority.MEDIUM
    );
  }

  /**
   * AS 요청 취소
   */
  async cancelASRequest(requestId: string, reason: string): Promise<ASRequest | null> {
    const db = this.getDatabase('as_requests');

    await db.update({ id: requestId }, {
      status: ASStatus.CANCELLED,
      technician_note: reason,
      updated_at: new Date(),
    });

    const result = await db.findById<ASRequest>(requestId);
    return result.data || null;
  }

  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'processing',
      message: 'A/S 요청 처리 중...',
    };
  }
}

export default ASHandlerSubAgent;
