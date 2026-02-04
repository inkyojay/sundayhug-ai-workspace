/**
 * 배송관리 서브에이전트
 * LANE 1 - Core Operations
 *
 * 역할: 송장등록, 배송추적, 배송완료 처리를 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult, SalesChannel } from '../../../types';
import {
  TrackingNumberRequest,
  TrackingNumberResult,
  ShippingTrackingInfo,
  ShippingStatus,
  ShippingEvent,
  CourierInfo,
} from '../types';

/**
 * 지원 택배사 목록
 */
const SUPPORTED_COURIERS: CourierInfo[] = [
  { code: 'cj', name: 'CJ대한통운', apiSupported: true, trackingUrlTemplate: 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo={trackingNumber}' },
  { code: 'hanjin', name: '한진택배', apiSupported: true, trackingUrlTemplate: 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2={trackingNumber}' },
  { code: 'lotte', name: '롯데택배', apiSupported: true },
  { code: 'logen', name: '로젠택배', apiSupported: true },
  { code: 'post', name: '우체국택배', apiSupported: true },
  { code: 'epost', name: 'EMS', apiSupported: true },
  { code: 'kdexp', name: '경동택배', apiSupported: true },
  { code: 'cupost', name: 'CU편의점택배', apiSupported: false },
  { code: 'gspost', name: 'GS편의점택배', apiSupported: false },
];

/**
 * ShippingManagerSubAgent 클래스
 * 배송 관련 작업을 담당하는 서브에이전트
 */
export class ShippingManagerSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('ShippingManagerSubAgent initializing...');
    // 택배사 API 연결 확인 등
  }

  /**
   * 정리
   */
  protected async cleanup(): Promise<void> {
    this.logger.info('ShippingManagerSubAgent cleanup...');
    await this.cleanupSubAgent();
  }

  /**
   * 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = this.getCurrentTask()?.type;

    switch (taskType) {
      case 'register_tracking':
        const trackingRequest = context.data as TrackingNumberRequest;
        const trackingResult = await this.registerTrackingNumber(trackingRequest);
        return this.createSuccessResult(trackingResult, startTime);

      case 'update_shipping_status':
        const updateResults = await this.updateAllShippingStatuses();
        return this.createSuccessResult(updateResults, startTime, {
          processed: updateResults.length,
        });

      case 'get_tracking_info':
        const { orderId, trackingNumber, courierCode } = context.data as {
          orderId: string;
          trackingNumber: string;
          courierCode: string;
        };
        const trackingInfo = await this.getTrackingInfo(orderId, trackingNumber, courierCode);
        return this.createSuccessResult(trackingInfo, startTime);

      default:
        // 기본: 배송 상태 업데이트
        const results = await this.updateAllShippingStatuses();
        return this.createSuccessResult(results, startTime);
    }
  }

  /**
   * 송장 등록
   */
  async registerTrackingNumber(request: TrackingNumberRequest): Promise<TrackingNumberResult> {
    this.logger.info('Registering tracking number...', {
      orderId: request.orderId,
      courier: request.courierCode,
      trackingNumber: request.trackingNumber,
    });

    try {
      // 택배사 유효성 검증
      const courier = SUPPORTED_COURIERS.find((c) => c.code === request.courierCode);
      if (!courier) {
        return {
          orderId: request.orderId,
          success: false,
          error: `지원하지 않는 택배사입니다: ${request.courierCode}`,
        };
      }

      // 운송장 번호 형식 검증
      if (!this.validateTrackingNumber(request.trackingNumber, request.courierCode)) {
        return {
          orderId: request.orderId,
          success: false,
          error: '운송장 번호 형식이 올바르지 않습니다.',
        };
      }

      // 채널별 API로 송장 등록
      const registrationResult = await this.registerToChannel(request);

      if (!registrationResult.success) {
        return registrationResult;
      }

      // DB에 배송 정보 저장
      const db = this.getDatabase('shipments');
      await db.create({
        order_id: request.orderId,
        channel_order_id: request.channelOrderId,
        channel: request.channel,
        courier_code: request.courierCode,
        courier_name: courier.name,
        tracking_number: request.trackingNumber,
        status: ShippingStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      });

      this.logger.info('Tracking number registered successfully', {
        orderId: request.orderId,
      });

      return {
        orderId: request.orderId,
        success: true,
        registeredAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to register tracking number', error as Error);
      return {
        orderId: request.orderId,
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 운송장 번호 형식 검증
   */
  private validateTrackingNumber(trackingNumber: string, courierCode: string): boolean {
    // 택배사별 운송장 번호 형식 검증
    const cleanNumber = trackingNumber.replace(/[^0-9]/g, '');

    switch (courierCode) {
      case 'cj':
        // CJ대한통운: 10~12자리
        return cleanNumber.length >= 10 && cleanNumber.length <= 12;
      case 'hanjin':
        // 한진택배: 10~12자리
        return cleanNumber.length >= 10 && cleanNumber.length <= 12;
      case 'lotte':
        // 롯데택배: 12자리
        return cleanNumber.length === 12;
      case 'logen':
        // 로젠택배: 11자리
        return cleanNumber.length === 11;
      case 'post':
        // 우체국: 13자리
        return cleanNumber.length === 13;
      default:
        // 기본: 10자리 이상
        return cleanNumber.length >= 10;
    }
  }

  /**
   * 채널에 송장 등록
   */
  private async registerToChannel(request: TrackingNumberRequest): Promise<TrackingNumberResult> {
    switch (request.channel) {
      case SalesChannel.COUPANG:
        return await this.registerToCoupang(request);
      case SalesChannel.NAVER:
        return await this.registerToNaver(request);
      case SalesChannel.CAFE24:
        return await this.registerToCafe24(request);
      default:
        return { orderId: request.orderId, success: true, registeredAt: new Date() };
    }
  }

  /**
   * 쿠팡에 송장 등록
   */
  private async registerToCoupang(request: TrackingNumberRequest): Promise<TrackingNumberResult> {
    // TODO: 실제 쿠팡 API 연동
    this.logger.info('Registering tracking to Coupang...', { orderId: request.orderId });
    await this.sleep(300);
    return { orderId: request.orderId, success: true, registeredAt: new Date() };
  }

  /**
   * 네이버에 송장 등록
   */
  private async registerToNaver(request: TrackingNumberRequest): Promise<TrackingNumberResult> {
    // TODO: 실제 네이버 API 연동
    this.logger.info('Registering tracking to Naver...', { orderId: request.orderId });
    await this.sleep(300);
    return { orderId: request.orderId, success: true, registeredAt: new Date() };
  }

  /**
   * Cafe24에 송장 등록
   */
  private async registerToCafe24(request: TrackingNumberRequest): Promise<TrackingNumberResult> {
    // TODO: 실제 Cafe24 API 연동
    this.logger.info('Registering tracking to Cafe24...', { orderId: request.orderId });
    await this.sleep(300);
    return { orderId: request.orderId, success: true, registeredAt: new Date() };
  }

  /**
   * 모든 배송 상태 업데이트
   */
  async updateAllShippingStatuses(): Promise<ShippingTrackingInfo[]> {
    this.logger.info('Updating all shipping statuses...');

    const db = this.getDatabase('shipments');

    // 진행 중인 배송 건 조회
    const result = await db.findMany<{
      id: string;
      order_id: string;
      tracking_number: string;
      courier_code: string;
      status: ShippingStatus;
    }>({
      status: { $in: [ShippingStatus.PENDING, ShippingStatus.IN_TRANSIT, ShippingStatus.OUT_FOR_DELIVERY] },
    });

    if (result.error || !result.data) {
      this.logger.warn('No shipments to update or error occurred');
      return [];
    }

    const trackingInfos: ShippingTrackingInfo[] = [];

    for (const shipment of result.data) {
      try {
        const trackingInfo = await this.getTrackingInfo(
          shipment.order_id,
          shipment.tracking_number,
          shipment.courier_code
        );

        if (trackingInfo.status !== shipment.status) {
          // 상태 업데이트
          await db.update(
            { order_id: shipment.order_id },
            {
              status: trackingInfo.status,
              updated_at: new Date(),
              actual_delivery: trackingInfo.actualDelivery,
            }
          );

          this.logger.info('Shipping status updated', {
            orderId: shipment.order_id,
            oldStatus: shipment.status,
            newStatus: trackingInfo.status,
          });
        }

        trackingInfos.push(trackingInfo);
      } catch (error) {
        this.logger.error('Failed to update tracking info', error as Error, {
          orderId: shipment.order_id,
        });
      }
    }

    return trackingInfos;
  }

  /**
   * 배송 추적 정보 조회
   */
  async getTrackingInfo(
    orderId: string,
    trackingNumber: string,
    courierCode: string
  ): Promise<ShippingTrackingInfo> {
    const courier = SUPPORTED_COURIERS.find((c) => c.code === courierCode);

    if (!courier?.apiSupported) {
      // API 미지원 택배사
      return {
        orderId,
        trackingNumber,
        courierCode,
        courierName: courier?.name || courierCode,
        status: ShippingStatus.IN_TRANSIT,
        events: [],
        updatedAt: new Date(),
      };
    }

    // TODO: 실제 택배사 API 연동
    // 현재는 시뮬레이션 데이터 반환
    const events = this.generateSimulatedEvents(trackingNumber);
    const currentStatus = events.length > 0 ? events[events.length - 1].status : ShippingStatus.PENDING;

    return {
      orderId,
      trackingNumber,
      courierCode,
      courierName: courier.name,
      status: currentStatus,
      events,
      actualDelivery: currentStatus === ShippingStatus.DELIVERED ? new Date() : undefined,
      updatedAt: new Date(),
    };
  }

  /**
   * 시뮬레이션 배송 이벤트 생성
   */
  private generateSimulatedEvents(trackingNumber: string): ShippingEvent[] {
    // 운송장 번호의 해시값으로 시뮬레이션 진행도 결정
    const hash = trackingNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const progressLevel = hash % 5;

    const events: ShippingEvent[] = [];
    const baseTime = new Date();

    if (progressLevel >= 1) {
      events.push({
        timestamp: new Date(baseTime.getTime() - 3 * 24 * 60 * 60 * 1000),
        status: ShippingStatus.PICKED_UP,
        location: '서울 물류센터',
        description: '상품을 인수하였습니다.',
      });
    }

    if (progressLevel >= 2) {
      events.push({
        timestamp: new Date(baseTime.getTime() - 2 * 24 * 60 * 60 * 1000),
        status: ShippingStatus.IN_TRANSIT,
        location: '대전 Hub',
        description: '상품이 이동 중입니다.',
      });
    }

    if (progressLevel >= 3) {
      events.push({
        timestamp: new Date(baseTime.getTime() - 1 * 24 * 60 * 60 * 1000),
        status: ShippingStatus.OUT_FOR_DELIVERY,
        location: '배송지 인근 터미널',
        description: '배송 출발하였습니다.',
      });
    }

    if (progressLevel >= 4) {
      events.push({
        timestamp: new Date(baseTime.getTime() - 2 * 60 * 60 * 1000),
        status: ShippingStatus.DELIVERED,
        location: '배송지',
        description: '배송 완료되었습니다.',
      });
    }

    return events;
  }

  /**
   * 택배사 목록 조회
   */
  getCouriers(): CourierInfo[] {
    return [...SUPPORTED_COURIERS];
  }

  /**
   * 현재 진행 상황 조회
   */
  protected async getCurrentProgress() {
    return {
      percentage: 50,
      currentStep: 'tracking',
      message: '배송 상태 업데이트 중...',
    };
  }
}

export default ShippingManagerSubAgent;
