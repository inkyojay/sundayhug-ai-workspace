/**
 * 썬데이허그 AI 에이전트 시스템 - Media Agent
 *
 * 미디어 자산 관리를 담당하는 메인 에이전트입니다.
 * - 촬영 스케줄 관리
 * - 에셋 라이브러리 관리
 * - 이미지/영상 편집
 */

import { BaseAgent, BaseAgentConfig } from '../base/BaseAgent';
import { AgentContext, AgentResult, ApprovalLevel } from '../../types';
import { AgentRegistry } from '../AgentRegistry';
import { ShootingManagementSubAgent } from './sub-agents/ShootingManagementSubAgent';
import { AssetManagementSubAgent } from './sub-agents/AssetManagementSubAgent';
import { EditingSubAgent } from './sub-agents/EditingSubAgent';
import {
  ShootingSchedule,
  ShootingStatus,
  MediaAsset,
  AssetType,
  AssetStatus,
  EditJob,
  EditType,
  EditParameters,
  AssetSearchFilter,
  AssetLibraryStats,
  MediaAgentData,
  ImagePurpose,
} from './types';

/**
 * Media Agent 설정
 */
export interface MediaAgentConfig extends BaseAgentConfig {
  /** 스토리지 경로 */
  storagePath?: string;
  /** 최대 파일 크기 (bytes) */
  maxFileSize?: number;
  /** 이미지 처리 품질 기본값 */
  defaultImageQuality?: number;
  /** 자동 썸네일 생성 여부 */
  autoGenerateThumbnails?: boolean;
}

/**
 * Media Agent 클래스
 */
export class MediaAgent extends BaseAgent {
  private shootingManagement!: ShootingManagementSubAgent;
  private assetManagement!: AssetManagementSubAgent;
  private editing!: EditingSubAgent;

  private storagePath: string;
  private maxFileSize: number;
  private defaultImageQuality: number;
  private autoGenerateThumbnails: boolean;

  constructor(config: MediaAgentConfig) {
    super(config);

    this.storagePath = config.storagePath || '/media/assets';
    this.maxFileSize = config.maxFileSize || 50 * 1024 * 1024; // 50MB
    this.defaultImageQuality = config.defaultImageQuality || 85;
    this.autoGenerateThumbnails = config.autoGenerateThumbnails ?? true;
  }

  // ===========================================================================
  // 추상 메서드 구현
  // ===========================================================================

  protected async initialize(): Promise<void> {
    this.logger.info('Media Agent initializing...');

    // 서브 에이전트 초기화
    this.shootingManagement = new ShootingManagementSubAgent({
      agentId: `${this.agentId}-shooting`,
      agentName: '촬영관리 서브에이전트',
      parentAgent: {
        agentId: this.agentId,
        agentName: this.agentName,
        sendMessage: this.handleSubAgentMessage.bind(this),
        requestApproval: this.requestApprovalFromParent.bind(this),
      },
    });

    this.assetManagement = new AssetManagementSubAgent({
      agentId: `${this.agentId}-asset`,
      agentName: '에셋관리 서브에이전트',
      parentAgent: {
        agentId: this.agentId,
        agentName: this.agentName,
        sendMessage: this.handleSubAgentMessage.bind(this),
        requestApproval: this.requestApprovalFromParent.bind(this),
      },
      storagePath: this.storagePath,
      maxFileSize: this.maxFileSize,
    });

    this.editing = new EditingSubAgent({
      agentId: `${this.agentId}-editing`,
      agentName: '편집 서브에이전트',
      parentAgent: {
        agentId: this.agentId,
        agentName: this.agentName,
        sendMessage: this.handleSubAgentMessage.bind(this),
        requestApproval: this.requestApprovalFromParent.bind(this),
      },
      defaultQuality: this.defaultImageQuality,
      autoGenerateThumbnails: this.autoGenerateThumbnails,
    });

    // AgentRegistry에 등록
    AgentRegistry.getInstance().register(this);

    this.logger.info('Media Agent initialized with sub-agents');
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = context.data?.taskType as string;

    this.logger.info('Media Agent processing task...', { taskType });

    try {
      let result: unknown;

      switch (taskType) {
        // 촬영 관리 태스크
        case 'schedule_shooting':
          result = await this.scheduleShootingSession(context.data);
          break;
        case 'manage_vendors':
          result = await this.manageVendors(context.data);
          break;
        case 'complete_shooting':
          result = await this.completeShootingSession(
            context.data?.scheduleId as string,
            context.data?.result as Record<string, unknown>
          );
          break;

        // 에셋 관리 태스크
        case 'upload_asset':
          result = await this.uploadAsset(context.data);
          break;
        case 'search_assets':
          result = await this.searchAssets(context.data?.filter as AssetSearchFilter);
          break;
        case 'organize_library':
          result = await this.organizeLibrary(context.data);
          break;

        // 편집 태스크
        case 'edit_image':
          result = await this.editImage(context.data);
          break;
        case 'edit_video':
          result = await this.editVideo(context.data);
          break;
        case 'batch_edit':
          result = await this.batchEdit(context.data);
          break;

        // 통합 태스크
        case 'prepare_product_images':
          result = await this.prepareProductImages(context.data);
          break;
        case 'generate_channel_assets':
          result = await this.generateChannelAssets(context.data);
          break;
        case 'get_library_stats':
          result = await this.getLibraryStats();
          break;

        default:
          result = await this.getLibraryStats();
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('Media Agent cleanup...');
    AgentRegistry.getInstance().unregister(this.agentId);
  }

  // ===========================================================================
  // 서브 에이전트 통신
  // ===========================================================================

  private async handleSubAgentMessage(message: {
    type: string;
    data: unknown;
  }): Promise<void> {
    this.logger.debug('Message from sub-agent', { type: message.type });
    // 서브 에이전트 메시지 처리
  }

  private async requestApprovalFromParent(request: {
    type: string;
    description: string;
    data: unknown;
  }): Promise<boolean> {
    // 승인 레벨에 따른 처리
    this.logger.info('Approval request from sub-agent', { type: request.type });
    return true;
  }

  // ===========================================================================
  // 촬영 관리 메서드
  // ===========================================================================

  /**
   * 촬영 세션 스케줄링
   */
  async scheduleShootingSession(data?: Record<string, unknown>): Promise<ShootingSchedule> {
    this.logger.info('Scheduling shooting session...');

    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        ...data,
        taskType: 'schedule_shooting',
      },
    };

    const result = await this.shootingManagement.execute(context);
    return result.data as ShootingSchedule;
  }

  /**
   * 촬영 세션 완료 처리
   */
  async completeShootingSession(
    scheduleId: string,
    resultData: Record<string, unknown>
  ): Promise<ShootingSchedule> {
    this.logger.info('Completing shooting session...', { scheduleId });

    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        taskType: 'complete_shooting',
        scheduleId,
        ...resultData,
      },
    };

    const result = await this.shootingManagement.execute(context);

    // 촬영 완료 후 에셋 등록
    if (resultData.assetPaths && Array.isArray(resultData.assetPaths)) {
      for (const path of resultData.assetPaths) {
        await this.uploadAsset({
          filePath: path,
          shootingScheduleId: scheduleId,
          productIds: resultData.productIds as string[],
        });
      }
    }

    return result.data as ShootingSchedule;
  }

  /**
   * 외주업체 관리
   */
  async manageVendors(data?: Record<string, unknown>): Promise<unknown> {
    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        ...data,
        taskType: 'manage_vendors',
      },
    };

    const result = await this.shootingManagement.execute(context);
    return result.data;
  }

  /**
   * 다가오는 촬영 스케줄 조회
   */
  async getUpcomingSchedules(days: number = 7): Promise<ShootingSchedule[]> {
    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        taskType: 'get_upcoming_schedules',
        days,
      },
    };

    const result = await this.shootingManagement.execute(context);
    return result.data as ShootingSchedule[];
  }

  // ===========================================================================
  // 에셋 관리 메서드
  // ===========================================================================

  /**
   * 에셋 업로드
   */
  async uploadAsset(data?: Record<string, unknown>): Promise<MediaAsset> {
    this.logger.info('Uploading asset...');

    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        ...data,
        taskType: 'upload',
      },
    };

    const result = await this.assetManagement.execute(context);
    const asset = result.data as MediaAsset;

    // 자동 썸네일 생성
    if (this.autoGenerateThumbnails && asset.type === AssetType.IMAGE) {
      await this.generateThumbnail(asset.id);
    }

    return asset;
  }

  /**
   * 에셋 검색
   */
  async searchAssets(filter?: AssetSearchFilter): Promise<MediaAsset[]> {
    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        taskType: 'search',
        filter,
      },
    };

    const result = await this.assetManagement.execute(context);
    return result.data as MediaAsset[];
  }

  /**
   * 상품별 에셋 조회
   */
  async getProductAssets(productId: string): Promise<MediaAsset[]> {
    return this.searchAssets({ productId });
  }

  /**
   * 라이브러리 정리
   */
  async organizeLibrary(data?: Record<string, unknown>): Promise<{
    organized: number;
    archived: number;
    deleted: number;
  }> {
    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        ...data,
        taskType: 'organize',
      },
    };

    const result = await this.assetManagement.execute(context);
    return result.data as { organized: number; archived: number; deleted: number };
  }

  /**
   * 에셋 상태 업데이트
   */
  async updateAssetStatus(assetId: string, status: AssetStatus): Promise<void> {
    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        taskType: 'update_status',
        assetId,
        status,
      },
    };

    await this.assetManagement.execute(context);
  }

  /**
   * 라이브러리 통계 조회
   */
  async getLibraryStats(): Promise<AssetLibraryStats> {
    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        taskType: 'get_stats',
      },
    };

    const result = await this.assetManagement.execute(context);
    return result.data as AssetLibraryStats;
  }

  // ===========================================================================
  // 편집 메서드
  // ===========================================================================

  /**
   * 이미지 편집
   */
  async editImage(data?: Record<string, unknown>): Promise<EditJob> {
    const assetId = data?.assetId as string;
    const editType = data?.editType as EditType;
    const parameters = data?.parameters as EditParameters;

    this.logger.info('Editing image...', { assetId, editType });

    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        taskType: 'edit_image',
        assetId,
        editType,
        parameters,
      },
    };

    const result = await this.editing.execute(context);
    return result.data as EditJob;
  }

  /**
   * 영상 편집
   */
  async editVideo(data?: Record<string, unknown>): Promise<EditJob> {
    const assetId = data?.assetId as string;
    const editType = data?.editType as EditType;
    const parameters = data?.parameters as EditParameters;

    this.logger.info('Editing video...', { assetId, editType });

    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        taskType: 'edit_video',
        assetId,
        editType,
        parameters,
      },
    };

    const result = await this.editing.execute(context);
    return result.data as EditJob;
  }

  /**
   * 배치 편집
   */
  async batchEdit(data?: Record<string, unknown>): Promise<{
    total: number;
    completed: number;
    failed: number;
    jobs: EditJob[];
  }> {
    this.logger.info('Starting batch edit...');

    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        ...data,
        taskType: 'batch_edit',
      },
    };

    const result = await this.editing.execute(context);
    return result.data as {
      total: number;
      completed: number;
      failed: number;
      jobs: EditJob[];
    };
  }

  /**
   * 썸네일 생성
   */
  async generateThumbnail(assetId: string): Promise<MediaAsset> {
    const context: AgentContext = {
      taskId: `task-${Date.now()}`,
      timestamp: new Date(),
      data: {
        taskType: 'generate_thumbnail',
        assetId,
      },
    };

    const result = await this.editing.execute(context);
    return result.data as MediaAsset;
  }

  /**
   * 리사이징
   */
  async resizeImage(
    assetId: string,
    width: number,
    height?: number
  ): Promise<EditJob> {
    return this.editImage({
      assetId,
      editType: EditType.RESIZE,
      parameters: {
        targetWidth: width,
        targetHeight: height,
      },
    });
  }

  // ===========================================================================
  // 통합 워크플로우 메서드
  // ===========================================================================

  /**
   * 상품 이미지 준비 (상세페이지용)
   */
  async prepareProductImages(data?: Record<string, unknown>): Promise<{
    mainImage: MediaAsset;
    detailImages: MediaAsset[];
    thumbnails: MediaAsset[];
  }> {
    const productId = data?.productId as string;
    const sourceAssetIds = data?.sourceAssetIds as string[];

    this.logger.info('Preparing product images...', { productId });

    // 1. 소스 에셋 조회
    const assets = await this.searchAssets({
      productId,
      type: AssetType.IMAGE,
    });

    const targetAssets = sourceAssetIds
      ? assets.filter((a) => sourceAssetIds.includes(a.id))
      : assets;

    if (targetAssets.length === 0) {
      throw new Error(`No assets found for product: ${productId}`);
    }

    // 2. 메인 이미지 선정 (첫 번째)
    const mainAsset = targetAssets[0];

    // 3. 채널별 리사이징
    const detailImages: MediaAsset[] = [];
    const thumbnails: MediaAsset[] = [];

    for (const asset of targetAssets) {
      // 상세페이지용 리사이징
      const detailJob = await this.resizeImage(asset.id, 860, 860);
      if (detailJob.resultAssetId) {
        const detailAsset = (await this.searchAssets({ productId }))[0];
        detailImages.push(detailAsset);
      }

      // 썸네일 생성
      const thumbnailAsset = await this.generateThumbnail(asset.id);
      thumbnails.push(thumbnailAsset);
    }

    return {
      mainImage: mainAsset,
      detailImages,
      thumbnails,
    };
  }

  /**
   * 채널별 에셋 생성
   */
  async generateChannelAssets(data?: Record<string, unknown>): Promise<{
    channel: string;
    assets: MediaAsset[];
  }[]> {
    const sourceAssetId = data?.sourceAssetId as string;
    const channels = data?.channels as string[] || ['naver', 'coupang', 'instagram'];

    this.logger.info('Generating channel assets...', { sourceAssetId, channels });

    // 채널별 규격
    const channelSpecs: Record<
      string,
      { width: number; height: number; purposes: ImagePurpose[] }
    > = {
      naver: { width: 860, height: 860, purposes: [ImagePurpose.DETAIL_MAIN] },
      coupang: { width: 500, height: 500, purposes: [ImagePurpose.THUMBNAIL] },
      instagram: { width: 1080, height: 1080, purposes: [ImagePurpose.SNS_FEED] },
      instagram_story: { width: 1080, height: 1920, purposes: [ImagePurpose.SNS_STORY] },
      kakao: { width: 400, height: 400, purposes: [ImagePurpose.AD] },
    };

    const results: { channel: string; assets: MediaAsset[] }[] = [];

    for (const channel of channels) {
      const spec = channelSpecs[channel];
      if (!spec) continue;

      const job = await this.resizeImage(sourceAssetId, spec.width, spec.height);

      if (job.resultAssetId) {
        // 결과 에셋 조회 및 용도 태깅
        await this.assetManagement.execute({
          taskId: `task-${Date.now()}`,
          timestamp: new Date(),
          data: {
            taskType: 'update_purposes',
            assetId: job.resultAssetId,
            purposes: spec.purposes,
          },
        });

        const assets = await this.searchAssets({ purpose: spec.purposes[0] });
        results.push({ channel, assets });
      }
    }

    return results;
  }

  /**
   * 촬영부터 에셋 등록까지 전체 워크플로우
   */
  async executeFullMediaWorkflow(data: {
    productId: string;
    productName: string;
    shootingType: string;
    concept: string;
  }): Promise<MediaAgentData> {
    this.logger.info('Executing full media workflow...', { productId: data.productId });

    // 1. 촬영 스케줄 생성
    const schedule = await this.scheduleShootingSession({
      productIds: [data.productId],
      type: data.shootingType,
      concept: data.concept,
      title: `${data.productName} 촬영`,
    });

    // 2. 라이브러리 통계 조회
    const stats = await this.getLibraryStats();

    return {
      schedules: [schedule],
      libraryStats: stats,
    };
  }

  // ===========================================================================
  // 헬퍼 메서드
  // ===========================================================================

  private createSuccessResult(data: unknown, startTime: number): AgentResult {
    return {
      success: true,
      data,
      processingTime: Date.now() - startTime,
    };
  }
}

export default MediaAgent;
