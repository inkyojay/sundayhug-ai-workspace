/**
 * 썬데이허그 AI 에이전트 시스템 - Shooting Management SubAgent
 *
 * 촬영 관리 담당 서브 에이전트입니다.
 * - 촬영 스케줄 관리
 * - 외주업체 관리
 * - 촬영 결과 처리
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult } from '../../../types';
import {
  ShootingSchedule,
  ShootingType,
  ShootingStatus,
  ShootingResult,
  Vendor,
  VendorType,
  VendorCollaboration,
} from '../types';

/**
 * Shooting Management SubAgent 설정
 */
export interface ShootingManagementSubAgentConfig extends SubAgentConfig {
  // 추가 설정 필요 시 확장
}

/**
 * Shooting Management SubAgent 클래스
 */
export class ShootingManagementSubAgent extends SubAgent {
  constructor(config: ShootingManagementSubAgentConfig) {
    super(config);
  }

  // ===========================================================================
  // 추상 메서드 구현
  // ===========================================================================

  protected async initialize(): Promise<void> {
    this.logger.info('Shooting Management SubAgent initializing...');
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = context.data?.taskType as string;

    try {
      let result: unknown;

      switch (taskType) {
        case 'schedule_shooting':
          result = await this.scheduleShooting(context.data);
          break;
        case 'complete_shooting':
          result = await this.completeShooting(context.data);
          break;
        case 'get_upcoming_schedules':
          result = await this.getUpcomingSchedules(context.data?.days as number);
          break;
        case 'manage_vendors':
          result = await this.manageVendors(context.data);
          break;
        case 'cancel_shooting':
          result = await this.cancelShooting(context.data?.scheduleId as string);
          break;
        default:
          result = await this.getScheduleStats();
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('Shooting Management SubAgent cleanup...');
  }

  // ===========================================================================
  // 비즈니스 로직 메서드
  // ===========================================================================

  /**
   * 촬영 스케줄 생성
   */
  async scheduleShooting(data?: Record<string, unknown>): Promise<ShootingSchedule> {
    const title = data?.title as string || `촬영_${Date.now()}`;
    const type = data?.type as ShootingType || ShootingType.PRODUCT;
    const scheduledDate = new Date(data?.scheduledDate as string || Date.now() + 7 * 24 * 60 * 60 * 1000);
    const productIds = data?.productIds as string[] || [];
    const concept = data?.concept as string || '';
    const vendorId = data?.vendorId as string;

    this.logger.info('Scheduling shooting session...', { title, type });

    // 스케줄 생성
    const schedule: ShootingSchedule = {
      id: `shoot-${Date.now()}`,
      title,
      type,
      status: ShootingStatus.PLANNING,
      scheduledDate,
      location: data?.location as string || '미정',
      productIds,
      vendorId,
      concept,
      referenceImages: data?.referenceImages as string[],
      expectedShots: data?.expectedShots as number || this.getDefaultShots(type),
      budget: data?.budget as number,
      notes: data?.notes as string,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 저장
    const db = this.getDatabase('shooting_schedules');
    await db.create(schedule);

    // 외주업체가 지정된 경우 확정 상태로
    if (vendorId) {
      await this.confirmSchedule(schedule.id, vendorId);
      schedule.status = ShootingStatus.SCHEDULED;
    }

    return schedule;
  }

  /**
   * 촬영 유형별 기본 컷 수
   */
  private getDefaultShots(type: ShootingType): number {
    const defaults: Record<ShootingType, number> = {
      [ShootingType.STUDIO]: 50,
      [ShootingType.LOCATION]: 100,
      [ShootingType.MODEL]: 80,
      [ShootingType.PRODUCT]: 30,
      [ShootingType.VIDEO]: 10,
    };
    return defaults[type] || 30;
  }

  /**
   * 스케줄 확정
   */
  async confirmSchedule(scheduleId: string, vendorId: string): Promise<ShootingSchedule> {
    this.logger.info('Confirming schedule...', { scheduleId, vendorId });

    const db = this.getDatabase('shooting_schedules');
    const { data: schedule } = await db.findById<ShootingSchedule>(scheduleId);

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // 외주업체 확인
    const vendorDb = this.getDatabase('vendors');
    const { data: vendor } = await vendorDb.findById<Vendor>(vendorId);

    if (!vendor || !vendor.active) {
      throw new Error(`Vendor not available: ${vendorId}`);
    }

    await db.update(scheduleId, {
      status: ShootingStatus.SCHEDULED,
      vendorId,
      updatedAt: new Date(),
    });

    return { ...schedule, status: ShootingStatus.SCHEDULED, vendorId };
  }

  /**
   * 촬영 완료 처리
   */
  async completeShooting(data?: Record<string, unknown>): Promise<ShootingSchedule> {
    const scheduleId = data?.scheduleId as string;
    const totalShots = data?.totalShots as number || 0;
    const selectedShots = data?.selectedShots as number || 0;
    const actualCost = data?.actualCost as number;
    const assetIds = data?.assetIds as string[] || [];

    this.logger.info('Completing shooting session...', { scheduleId });

    const db = this.getDatabase('shooting_schedules');
    const { data: schedule } = await db.findById<ShootingSchedule>(scheduleId);

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // 결과 기록
    const result: ShootingResult = {
      scheduleId,
      completedAt: new Date(),
      totalShots,
      selectedShots,
      assetIds,
      actualCost,
      notes: data?.notes as string,
    };

    // 결과 저장
    const resultsDb = this.getDatabase('shooting_results');
    await resultsDb.create(result);

    // 스케줄 상태 업데이트
    await db.update(scheduleId, {
      status: ShootingStatus.COMPLETED,
      updatedAt: new Date(),
    });

    // 외주업체 협업 기록 추가
    if (schedule.vendorId && actualCost) {
      await this.addVendorCollaboration(schedule.vendorId, {
        scheduleId,
        date: new Date(),
        cost: actualCost,
        satisfaction: data?.satisfaction as number,
        feedback: data?.feedback as string,
      });
    }

    return { ...schedule, status: ShootingStatus.COMPLETED };
  }

  /**
   * 촬영 취소
   */
  async cancelShooting(scheduleId: string, reason?: string): Promise<void> {
    this.logger.info('Cancelling shooting...', { scheduleId });

    const db = this.getDatabase('shooting_schedules');
    await db.update(scheduleId, {
      status: ShootingStatus.CANCELLED,
      notes: reason ? `취소 사유: ${reason}` : undefined,
      updatedAt: new Date(),
    });
  }

  /**
   * 다가오는 스케줄 조회
   */
  async getUpcomingSchedules(days: number = 7): Promise<ShootingSchedule[]> {
    const db = this.getDatabase('shooting_schedules');
    const { data: schedules } = await db.findAll<ShootingSchedule>({});

    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return (schedules || []).filter((s) =>
      s.status !== ShootingStatus.CANCELLED &&
      s.status !== ShootingStatus.COMPLETED &&
      s.scheduledDate >= now &&
      s.scheduledDate <= futureDate
    ).sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  /**
   * 외주업체 관리
   */
  async manageVendors(data?: Record<string, unknown>): Promise<unknown> {
    const action = data?.action as string;

    switch (action) {
      case 'create':
        return this.createVendor(data);
      case 'update':
        return this.updateVendor(data?.vendorId as string, data);
      case 'list':
        return this.listVendors(data?.type as VendorType);
      case 'deactivate':
        return this.deactivateVendor(data?.vendorId as string);
      case 'rate':
        return this.rateVendor(
          data?.vendorId as string,
          data?.scheduleId as string,
          data?.rating as number,
          data?.feedback as string
        );
      default:
        return this.listVendors();
    }
  }

  /**
   * 외주업체 생성
   */
  async createVendor(data?: Record<string, unknown>): Promise<Vendor> {
    const name = data?.name as string;
    const type = data?.type as VendorType;

    this.logger.info('Creating vendor...', { name, type });

    const vendor: Vendor = {
      id: `vendor-${Date.now()}`,
      name,
      type,
      contact: {
        phone: data?.phone as string,
        email: data?.email as string,
        kakao: data?.kakao as string,
      },
      portfolioUrl: data?.portfolioUrl as string,
      specialties: data?.specialties as string[] || [],
      averagePrice: data?.averagePrice as number,
      active: true,
      notes: data?.notes as string,
    };

    const db = this.getDatabase('vendors');
    await db.create(vendor);

    return vendor;
  }

  /**
   * 외주업체 수정
   */
  async updateVendor(vendorId: string, data?: Record<string, unknown>): Promise<Vendor> {
    const db = this.getDatabase('vendors');
    const { data: vendor } = await db.findById<Vendor>(vendorId);

    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }

    const updates: Partial<Vendor> = {};
    if (data?.name) updates.name = data.name as string;
    if (data?.contact) updates.contact = data.contact as Vendor['contact'];
    if (data?.portfolioUrl) updates.portfolioUrl = data.portfolioUrl as string;
    if (data?.specialties) updates.specialties = data.specialties as string[];
    if (data?.averagePrice) updates.averagePrice = data.averagePrice as number;
    if (data?.notes) updates.notes = data.notes as string;

    await db.update(vendorId, updates);

    return { ...vendor, ...updates };
  }

  /**
   * 외주업체 목록 조회
   */
  async listVendors(type?: VendorType): Promise<Vendor[]> {
    const db = this.getDatabase('vendors');
    const filters = type ? { type, active: true } : { active: true };
    const { data: vendors } = await db.findAll<Vendor>(filters);

    return vendors || [];
  }

  /**
   * 외주업체 비활성화
   */
  async deactivateVendor(vendorId: string): Promise<void> {
    const db = this.getDatabase('vendors');
    await db.update(vendorId, { active: false });
  }

  /**
   * 외주업체 평가
   */
  async rateVendor(
    vendorId: string,
    scheduleId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    const db = this.getDatabase('vendors');
    const { data: vendor } = await db.findById<Vendor>(vendorId);

    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }

    // 협업 기록에 평가 추가
    const history = vendor.collaborationHistory || [];
    const collaboration = history.find((h) => h.scheduleId === scheduleId);

    if (collaboration) {
      collaboration.satisfaction = rating;
      collaboration.feedback = feedback;
    }

    // 평균 평점 계산
    const ratedCollabs = history.filter((h) => h.satisfaction);
    const avgRating = ratedCollabs.length > 0
      ? ratedCollabs.reduce((sum, h) => sum + (h.satisfaction || 0), 0) / ratedCollabs.length
      : rating;

    await db.update(vendorId, {
      collaborationHistory: history,
      rating: avgRating,
    });
  }

  /**
   * 외주업체 협업 기록 추가
   */
  private async addVendorCollaboration(
    vendorId: string,
    collaboration: VendorCollaboration
  ): Promise<void> {
    const db = this.getDatabase('vendors');
    const { data: vendor } = await db.findById<Vendor>(vendorId);

    if (!vendor) return;

    const history = vendor.collaborationHistory || [];
    history.push(collaboration);

    await db.update(vendorId, { collaborationHistory: history });
  }

  /**
   * 스케줄 통계
   */
  async getScheduleStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    upcoming: number;
    thisMonth: number;
  }> {
    const db = this.getDatabase('shooting_schedules');
    const { data: schedules } = await db.findAll<ShootingSchedule>({});

    const all = schedules || [];
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let upcoming = 0;
    let thisMonth = 0;

    for (const schedule of all) {
      byStatus[schedule.status] = (byStatus[schedule.status] || 0) + 1;
      byType[schedule.type] = (byType[schedule.type] || 0) + 1;

      if (
        schedule.scheduledDate >= now &&
        schedule.status !== ShootingStatus.CANCELLED
      ) {
        upcoming++;
      }

      if (schedule.createdAt >= thisMonthStart) {
        thisMonth++;
      }
    }

    return {
      total: all.length,
      byStatus,
      byType,
      upcoming,
      thisMonth,
    };
  }

  /**
   * 추천 외주업체 찾기
   */
  async findRecommendedVendor(
    type: VendorType,
    budget?: number
  ): Promise<Vendor | null> {
    const vendors = await this.listVendors(type);

    if (vendors.length === 0) return null;

    // 평점 순으로 정렬
    let candidates = [...vendors].sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // 예산 필터
    if (budget) {
      candidates = candidates.filter(
        (v) => !v.averagePrice || v.averagePrice <= budget
      );
    }

    return candidates[0] || null;
  }
}

export default ShootingManagementSubAgent;
