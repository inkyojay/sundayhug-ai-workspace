/**
 * 썬데이허그 AI 에이전트 시스템 - Editing SubAgent
 *
 * 이미지/영상 편집 담당 서브 에이전트입니다.
 * - 이미지 리사이징/크롭
 * - 색보정 및 리터칭
 * - 워터마크/썸네일 생성
 * - 간단한 영상 편집
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult } from '../../../types';
import {
  MediaAsset,
  AssetType,
  AssetStatus,
  EditJob,
  EditType,
  EditParameters,
  BatchEditRequest,
  ChannelImageSpec,
  ImagePurpose,
} from '../types';

/**
 * Editing SubAgent 설정
 */
export interface EditingSubAgentConfig extends SubAgentConfig {
  /** 기본 이미지 품질 */
  defaultQuality?: number;
  /** 자동 썸네일 생성 여부 */
  autoGenerateThumbnails?: boolean;
}

/**
 * Editing SubAgent 클래스
 */
export class EditingSubAgent extends SubAgent {
  private defaultQuality: number;
  private autoGenerateThumbnails: boolean;

  constructor(config: EditingSubAgentConfig) {
    super(config);
    this.defaultQuality = config.defaultQuality || 85;
    this.autoGenerateThumbnails = config.autoGenerateThumbnails ?? true;
  }

  // ===========================================================================
  // 추상 메서드 구현
  // ===========================================================================

  protected async initialize(): Promise<void> {
    this.logger.info('Editing SubAgent initializing...');
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = context.data?.taskType as string;

    try {
      let result: unknown;

      switch (taskType) {
        case 'edit_image':
          result = await this.editImage(context.data);
          break;
        case 'edit_video':
          result = await this.editVideo(context.data);
          break;
        case 'batch_edit':
          result = await this.batchEdit(context.data);
          break;
        case 'generate_thumbnail':
          result = await this.generateThumbnail(context.data?.assetId as string);
          break;
        case 'resize':
          result = await this.resizeImage(context.data);
          break;
        case 'crop':
          result = await this.cropImage(context.data);
          break;
        case 'add_watermark':
          result = await this.addWatermark(context.data);
          break;
        case 'remove_background':
          result = await this.removeBackground(context.data?.assetId as string);
          break;
        case 'generate_channel_variants':
          result = await this.generateChannelVariants(context.data);
          break;
        default:
          result = await this.getEditJobStats();
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('Editing SubAgent cleanup...');
  }

  // ===========================================================================
  // 비즈니스 로직 메서드
  // ===========================================================================

  /**
   * 이미지 편집
   */
  async editImage(data?: Record<string, unknown>): Promise<EditJob> {
    const assetId = data?.assetId as string;
    const editType = data?.editType as EditType;
    const parameters = data?.parameters as EditParameters;

    this.logger.info('Editing image...', { assetId, editType });

    // 원본 에셋 조회
    const asset = await this.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    if (asset.type !== AssetType.IMAGE && asset.type !== AssetType.GIF) {
      throw new Error(`Invalid asset type for image editing: ${asset.type}`);
    }

    // 편집 작업 생성
    const job = await this.createEditJob(assetId, editType, parameters);

    // 편집 실행
    try {
      const resultAsset = await this.executeImageEdit(asset, editType, parameters);

      // 작업 완료
      await this.completeEditJob(job.id, resultAsset.id);

      return { ...job, status: 'completed', resultAssetId: resultAsset.id };
    } catch (error) {
      await this.failEditJob(job.id, (error as Error).message);
      throw error;
    }
  }

  /**
   * 영상 편집
   */
  async editVideo(data?: Record<string, unknown>): Promise<EditJob> {
    const assetId = data?.assetId as string;
    const editType = data?.editType as EditType;
    const parameters = data?.parameters as EditParameters;

    this.logger.info('Editing video...', { assetId, editType });

    // 원본 에셋 조회
    const asset = await this.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    if (asset.type !== AssetType.VIDEO) {
      throw new Error(`Invalid asset type for video editing: ${asset.type}`);
    }

    // 편집 작업 생성
    const job = await this.createEditJob(assetId, editType, parameters);

    // 편집 실행
    try {
      const resultAsset = await this.executeVideoEdit(asset, editType, parameters);

      await this.completeEditJob(job.id, resultAsset.id);

      return { ...job, status: 'completed', resultAssetId: resultAsset.id };
    } catch (error) {
      await this.failEditJob(job.id, (error as Error).message);
      throw error;
    }
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
    const assetIds = data?.assetIds as string[];
    const editType = data?.editType as EditType;
    const parameters = data?.parameters as EditParameters;

    this.logger.info('Starting batch edit...', { count: assetIds.length, editType });

    const jobs: EditJob[] = [];
    let completed = 0;
    let failed = 0;

    for (const assetId of assetIds) {
      try {
        const job = await this.editImage({
          assetId,
          editType,
          parameters,
        });
        jobs.push(job);
        if (job.status === 'completed') completed++;
        else failed++;
      } catch (error) {
        failed++;
        this.logger.error('Batch edit failed for asset', { assetId, error });
      }
    }

    return {
      total: assetIds.length,
      completed,
      failed,
      jobs,
    };
  }

  /**
   * 썸네일 생성
   */
  async generateThumbnail(assetId: string): Promise<MediaAsset> {
    this.logger.info('Generating thumbnail...', { assetId });

    const asset = await this.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    // 썸네일 크기 결정
    const thumbnailSize = { width: 200, height: 200 };

    // 이미지인 경우 리사이징
    if (asset.type === AssetType.IMAGE) {
      const resultAsset = await this.executeImageEdit(asset, EditType.RESIZE, {
        targetWidth: thumbnailSize.width,
        targetHeight: thumbnailSize.height,
        quality: 80,
      });

      // 원본에 썸네일 URL 연결
      const assetDb = this.getDatabase('media_assets');
      await assetDb.update(assetId, {
        thumbnailUrl: resultAsset.url,
      });

      return resultAsset;
    }

    // 영상인 경우 프레임 추출
    if (asset.type === AssetType.VIDEO) {
      const resultAsset = await this.executeVideoEdit(asset, EditType.THUMBNAIL, {
        thumbnailTime: 0,
        targetWidth: thumbnailSize.width,
        targetHeight: thumbnailSize.height,
      });

      const assetDb = this.getDatabase('media_assets');
      await assetDb.update(assetId, {
        thumbnailUrl: resultAsset.url,
      });

      return resultAsset;
    }

    throw new Error(`Cannot generate thumbnail for asset type: ${asset.type}`);
  }

  /**
   * 이미지 리사이징
   */
  async resizeImage(data?: Record<string, unknown>): Promise<EditJob> {
    const assetId = data?.assetId as string;
    const width = data?.width as number;
    const height = data?.height as number;
    const maintainAspectRatio = data?.maintainAspectRatio !== false;

    return this.editImage({
      assetId,
      editType: EditType.RESIZE,
      parameters: {
        targetWidth: width,
        targetHeight: maintainAspectRatio ? undefined : height,
        quality: this.defaultQuality,
      },
    });
  }

  /**
   * 이미지 크롭
   */
  async cropImage(data?: Record<string, unknown>): Promise<EditJob> {
    const assetId = data?.assetId as string;
    const cropArea = data?.cropArea as {
      x: number;
      y: number;
      width: number;
      height: number;
    };

    return this.editImage({
      assetId,
      editType: EditType.CROP,
      parameters: {
        cropArea,
        quality: this.defaultQuality,
      },
    });
  }

  /**
   * 워터마크 추가
   */
  async addWatermark(data?: Record<string, unknown>): Promise<EditJob> {
    const assetId = data?.assetId as string;
    const watermarkConfig = data?.watermark as EditParameters['watermark'];

    // 기본 워터마크 설정
    const defaultWatermark: EditParameters['watermark'] = {
      text: '썬데이허그',
      position: 'bottomRight',
      opacity: 0.3,
    };

    return this.editImage({
      assetId,
      editType: EditType.WATERMARK,
      parameters: {
        watermark: { ...defaultWatermark, ...watermarkConfig },
        quality: this.defaultQuality,
      },
    });
  }

  /**
   * 배경 제거
   */
  async removeBackground(assetId: string): Promise<EditJob> {
    return this.editImage({
      assetId,
      editType: EditType.BACKGROUND_REMOVAL,
      parameters: {
        outputFormat: 'png',
        quality: 100,
      },
    });
  }

  /**
   * 채널별 이미지 변형 생성
   */
  async generateChannelVariants(data?: Record<string, unknown>): Promise<{
    channel: string;
    asset: MediaAsset;
  }[]> {
    const assetId = data?.assetId as string;
    const channels = data?.channels as string[] || ['naver', 'coupang', 'instagram'];

    this.logger.info('Generating channel variants...', { assetId, channels });

    const channelSpecs: Record<string, ChannelImageSpec> = {
      naver: {
        channel: 'naver',
        purpose: ImagePurpose.DETAIL_MAIN,
        width: 860,
        height: 860,
        maxFileSize: 10 * 1024 * 1024,
        allowedFormats: ['jpg', 'png'],
      },
      coupang: {
        channel: 'coupang',
        purpose: ImagePurpose.THUMBNAIL,
        width: 500,
        height: 500,
        maxFileSize: 5 * 1024 * 1024,
        allowedFormats: ['jpg', 'png'],
      },
      instagram: {
        channel: 'instagram',
        purpose: ImagePurpose.SNS_FEED,
        width: 1080,
        height: 1080,
        maxFileSize: 8 * 1024 * 1024,
        allowedFormats: ['jpg'],
      },
      instagram_story: {
        channel: 'instagram_story',
        purpose: ImagePurpose.SNS_STORY,
        width: 1080,
        height: 1920,
        maxFileSize: 8 * 1024 * 1024,
        allowedFormats: ['jpg'],
      },
      kakao: {
        channel: 'kakao',
        purpose: ImagePurpose.AD,
        width: 400,
        height: 400,
        maxFileSize: 2 * 1024 * 1024,
        allowedFormats: ['jpg', 'png'],
      },
    };

    const results: { channel: string; asset: MediaAsset }[] = [];

    for (const channel of channels) {
      const spec = channelSpecs[channel];
      if (!spec) continue;

      try {
        const job = await this.resizeImage({
          assetId,
          width: spec.width,
          height: spec.height,
        });

        if (job.resultAssetId) {
          const asset = await this.getAsset(job.resultAssetId);
          if (asset) {
            // 용도 태그 추가
            const assetDb = this.getDatabase('media_assets');
            await assetDb.update(asset.id, {
              purposes: [spec.purpose],
              tags: [...asset.tags, channel],
            });

            results.push({ channel, asset });
          }
        }
      } catch (error) {
        this.logger.error('Failed to generate variant', { channel, error });
      }
    }

    return results;
  }

  // ===========================================================================
  // 헬퍼 메서드
  // ===========================================================================

  /**
   * 에셋 조회
   */
  private async getAsset(assetId: string): Promise<MediaAsset | null> {
    const db = this.getDatabase('media_assets');
    const { data: asset } = await db.findById<MediaAsset>(assetId);
    return asset || null;
  }

  /**
   * 편집 작업 생성
   */
  private async createEditJob(
    sourceAssetId: string,
    editType: EditType,
    parameters: EditParameters
  ): Promise<EditJob> {
    const job: EditJob = {
      id: `edit-${Date.now()}`,
      sourceAssetId,
      editType,
      parameters,
      status: 'pending',
      createdAt: new Date(),
    };

    const db = this.getDatabase('edit_jobs');
    await db.create(job);

    return job;
  }

  /**
   * 편집 작업 완료 처리
   */
  private async completeEditJob(jobId: string, resultAssetId: string): Promise<void> {
    const db = this.getDatabase('edit_jobs');
    await db.update(jobId, {
      status: 'completed',
      resultAssetId,
      completedAt: new Date(),
    });
  }

  /**
   * 편집 작업 실패 처리
   */
  private async failEditJob(jobId: string, errorMessage: string): Promise<void> {
    const db = this.getDatabase('edit_jobs');
    await db.update(jobId, {
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    });
  }

  /**
   * 이미지 편집 실행
   */
  private async executeImageEdit(
    sourceAsset: MediaAsset,
    editType: EditType,
    parameters: EditParameters
  ): Promise<MediaAsset> {
    // 실제 구현 시 이미지 처리 라이브러리 사용 (sharp, jimp 등)
    // 여기서는 결과 에셋 생성만 시뮬레이션

    const timestamp = Date.now();
    const extension = this.getOutputExtension(parameters.outputFormat || 'jpg');

    const resultAsset: MediaAsset = {
      id: `asset-${timestamp}`,
      filename: `${sourceAsset.filename.split('.')[0]}_${editType}_${timestamp}.${extension}`,
      type: sourceAsset.type,
      status: AssetStatus.APPROVED,
      url: `/media/assets/processed/${timestamp}_${editType}.${extension}`,
      fileSize: sourceAsset.fileSize,
      width: parameters.targetWidth || sourceAsset.width,
      height: parameters.targetHeight || sourceAsset.height,
      mimeType: `image/${extension}`,
      productIds: sourceAsset.productIds,
      tags: [...sourceAsset.tags, editType],
      version: 1,
      originalAssetId: sourceAsset.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = this.getDatabase('media_assets');
    await db.create(resultAsset);

    return resultAsset;
  }

  /**
   * 영상 편집 실행
   */
  private async executeVideoEdit(
    sourceAsset: MediaAsset,
    editType: EditType,
    parameters: EditParameters
  ): Promise<MediaAsset> {
    // 실제 구현 시 ffmpeg 등 사용
    // 여기서는 결과 에셋 생성만 시뮬레이션

    const timestamp = Date.now();
    const isImage = editType === EditType.THUMBNAIL;
    const extension = isImage ? 'jpg' : 'mp4';
    const assetType = isImage ? AssetType.IMAGE : AssetType.VIDEO;

    const resultAsset: MediaAsset = {
      id: `asset-${timestamp}`,
      filename: `${sourceAsset.filename.split('.')[0]}_${editType}_${timestamp}.${extension}`,
      type: assetType,
      status: AssetStatus.APPROVED,
      url: `/media/assets/processed/${timestamp}_${editType}.${extension}`,
      fileSize: sourceAsset.fileSize,
      width: parameters.targetWidth,
      height: parameters.targetHeight,
      duration: isImage ? undefined : sourceAsset.duration,
      mimeType: isImage ? 'image/jpeg' : 'video/mp4',
      productIds: sourceAsset.productIds,
      tags: [...sourceAsset.tags, editType],
      version: 1,
      originalAssetId: sourceAsset.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = this.getDatabase('media_assets');
    await db.create(resultAsset);

    return resultAsset;
  }

  /**
   * 출력 확장자 결정
   */
  private getOutputExtension(format: string): string {
    const formats: Record<string, string> = {
      jpeg: 'jpg',
      jpg: 'jpg',
      png: 'png',
      gif: 'gif',
      webp: 'webp',
    };
    return formats[format.toLowerCase()] || 'jpg';
  }

  /**
   * 편집 작업 통계
   */
  async getEditJobStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    averageProcessingTime: number;
  }> {
    const db = this.getDatabase('edit_jobs');
    const { data: jobs } = await db.findAll<EditJob>({});

    const all = jobs || [];
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalProcessingTime = 0;
    let completedCount = 0;

    for (const job of all) {
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;
      byType[job.editType] = (byType[job.editType] || 0) + 1;

      if (job.status === 'completed' && job.completedAt) {
        totalProcessingTime +=
          job.completedAt.getTime() - job.createdAt.getTime();
        completedCount++;
      }
    }

    return {
      total: all.length,
      byStatus,
      byType,
      averageProcessingTime:
        completedCount > 0 ? totalProcessingTime / completedCount : 0,
    };
  }

  /**
   * 색보정 적용
   */
  async applyColorCorrection(
    assetId: string,
    adjustments: EditParameters['colorAdjustments']
  ): Promise<EditJob> {
    return this.editImage({
      assetId,
      editType: EditType.COLOR_CORRECTION,
      parameters: {
        colorAdjustments: adjustments,
        quality: this.defaultQuality,
      },
    });
  }

  /**
   * 영상 트리밍
   */
  async trimVideo(
    assetId: string,
    startTime: number,
    endTime: number
  ): Promise<EditJob> {
    return this.editVideo({
      assetId,
      editType: EditType.TRIM,
      parameters: {
        trim: { startTime, endTime },
      },
    });
  }

  /**
   * 자막 추가
   */
  async addSubtitles(
    assetId: string,
    subtitles: { text: string; startTime: number; endTime: number }[]
  ): Promise<EditJob> {
    return this.editVideo({
      assetId,
      editType: EditType.SUBTITLE,
      parameters: {
        subtitles,
      },
    });
  }
}

export default EditingSubAgent;
