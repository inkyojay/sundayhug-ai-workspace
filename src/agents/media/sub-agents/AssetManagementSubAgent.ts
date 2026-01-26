/**
 * 썬데이허그 AI 에이전트 시스템 - Asset Management SubAgent
 *
 * 미디어 에셋 라이브러리 관리 담당 서브 에이전트입니다.
 * - 에셋 업로드/관리
 * - 라이브러리 조직화
 * - 태그 및 검색
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult } from '../../../types';
import {
  MediaAsset,
  AssetType,
  AssetStatus,
  AssetSearchFilter,
  AssetLibraryStats,
  AssetMetadata,
  ImagePurpose,
} from '../types';

/**
 * Asset Management SubAgent 설정
 */
export interface AssetManagementSubAgentConfig extends SubAgentConfig {
  /** 스토리지 경로 */
  storagePath?: string;
  /** 최대 파일 크기 */
  maxFileSize?: number;
}

/**
 * Asset Management SubAgent 클래스
 */
export class AssetManagementSubAgent extends SubAgent {
  private storagePath: string;
  private maxFileSize: number;

  constructor(config: AssetManagementSubAgentConfig) {
    super(config);
    this.storagePath = config.storagePath || '/media/assets';
    this.maxFileSize = config.maxFileSize || 50 * 1024 * 1024;
  }

  // ===========================================================================
  // 추상 메서드 구현
  // ===========================================================================

  protected async initialize(): Promise<void> {
    this.logger.info('Asset Management SubAgent initializing...');
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = context.data?.taskType as string;

    try {
      let result: unknown;

      switch (taskType) {
        case 'upload':
          result = await this.uploadAsset(context.data);
          break;
        case 'search':
          result = await this.searchAssets(context.data?.filter as AssetSearchFilter);
          break;
        case 'get_by_id':
          result = await this.getAssetById(context.data?.assetId as string);
          break;
        case 'update':
          result = await this.updateAsset(
            context.data?.assetId as string,
            context.data
          );
          break;
        case 'update_status':
          result = await this.updateAssetStatus(
            context.data?.assetId as string,
            context.data?.status as AssetStatus
          );
          break;
        case 'update_purposes':
          result = await this.updateAssetPurposes(
            context.data?.assetId as string,
            context.data?.purposes as ImagePurpose[]
          );
          break;
        case 'organize':
          result = await this.organizeLibrary(context.data);
          break;
        case 'add_tags':
          result = await this.addTags(
            context.data?.assetId as string,
            context.data?.tags as string[]
          );
          break;
        case 'get_stats':
          result = await this.getLibraryStats();
          break;
        case 'archive':
          result = await this.archiveAssets(context.data?.assetIds as string[]);
          break;
        case 'delete':
          result = await this.deleteAsset(context.data?.assetId as string);
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
    this.logger.info('Asset Management SubAgent cleanup...');
  }

  // ===========================================================================
  // 비즈니스 로직 메서드
  // ===========================================================================

  /**
   * 에셋 업로드
   */
  async uploadAsset(data?: Record<string, unknown>): Promise<MediaAsset> {
    const filePath = data?.filePath as string;
    const filename = data?.filename as string || this.extractFilename(filePath);

    this.logger.info('Uploading asset...', { filename });

    // 파일 정보 추출 (실제 구현 시 파일 시스템에서)
    const fileInfo = await this.extractFileInfo(filePath);

    // 에셋 타입 결정
    const assetType = this.determineAssetType(fileInfo.mimeType);

    const asset: MediaAsset = {
      id: `asset-${Date.now()}`,
      filename,
      type: assetType,
      status: AssetStatus.RAW,
      url: this.generateAssetUrl(filename),
      fileSize: fileInfo.size,
      width: fileInfo.width,
      height: fileInfo.height,
      duration: fileInfo.duration,
      mimeType: fileInfo.mimeType,
      productIds: data?.productIds as string[],
      shootingScheduleId: data?.shootingScheduleId as string,
      tags: data?.tags as string[] || [],
      purposes: data?.purposes as ImagePurpose[],
      metadata: fileInfo.metadata,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 저장
    const db = this.getDatabase('media_assets');
    await db.create(asset);

    return asset;
  }

  /**
   * 파일명 추출
   */
  private extractFilename(filePath: string): string {
    return filePath.split('/').pop() || `file-${Date.now()}`;
  }

  /**
   * 파일 정보 추출
   */
  private async extractFileInfo(filePath: string): Promise<{
    size: number;
    width?: number;
    height?: number;
    duration?: number;
    mimeType: string;
    metadata?: AssetMetadata;
  }> {
    // 실제 구현 시 파일 시스템 및 이미지 라이브러리 사용
    // 여기서는 기본값 반환
    const extension = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      svg: 'image/svg+xml',
    };

    return {
      size: 0,
      width: 1920,
      height: 1080,
      mimeType: mimeTypes[extension || 'jpg'] || 'application/octet-stream',
    };
  }

  /**
   * 에셋 타입 결정
   */
  private determineAssetType(mimeType: string): AssetType {
    if (mimeType.startsWith('image/')) {
      if (mimeType === 'image/gif') return AssetType.GIF;
      if (mimeType === 'image/svg+xml') return AssetType.VECTOR;
      return AssetType.IMAGE;
    }
    if (mimeType.startsWith('video/')) return AssetType.VIDEO;
    return AssetType.DOCUMENT;
  }

  /**
   * 에셋 URL 생성
   */
  private generateAssetUrl(filename: string): string {
    return `${this.storagePath}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${filename}`;
  }

  /**
   * 에셋 검색
   */
  async searchAssets(filter?: AssetSearchFilter): Promise<MediaAsset[]> {
    const db = this.getDatabase('media_assets');
    const { data: assets } = await db.findAll<MediaAsset>({});

    if (!assets) return [];

    let results = [...assets];

    // 필터 적용
    if (filter) {
      if (filter.type) {
        results = results.filter((a) => a.type === filter.type);
      }
      if (filter.status) {
        results = results.filter((a) => a.status === filter.status);
      }
      if (filter.productId) {
        results = results.filter((a) =>
          a.productIds?.includes(filter.productId!)
        );
      }
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter((a) =>
          filter.tags!.some((tag) => a.tags.includes(tag))
        );
      }
      if (filter.purpose) {
        results = results.filter((a) =>
          a.purposes?.includes(filter.purpose!)
        );
      }
      if (filter.dateFrom) {
        results = results.filter((a) => a.createdAt >= filter.dateFrom!);
      }
      if (filter.dateTo) {
        results = results.filter((a) => a.createdAt <= filter.dateTo!);
      }
      if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase();
        results = results.filter(
          (a) =>
            a.filename.toLowerCase().includes(keyword) ||
            a.tags.some((t) => t.toLowerCase().includes(keyword))
        );
      }
    }

    // 최신순 정렬
    return results.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * ID로 에셋 조회
   */
  async getAssetById(assetId: string): Promise<MediaAsset | null> {
    const db = this.getDatabase('media_assets');
    const { data: asset } = await db.findById<MediaAsset>(assetId);
    return asset || null;
  }

  /**
   * 에셋 정보 수정
   */
  async updateAsset(
    assetId: string,
    data?: Record<string, unknown>
  ): Promise<MediaAsset> {
    const db = this.getDatabase('media_assets');
    const { data: asset } = await db.findById<MediaAsset>(assetId);

    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const updates: Partial<MediaAsset> = {
      updatedAt: new Date(),
    };

    if (data?.filename) updates.filename = data.filename as string;
    if (data?.tags) updates.tags = data.tags as string[];
    if (data?.purposes) updates.purposes = data.purposes as ImagePurpose[];
    if (data?.productIds) updates.productIds = data.productIds as string[];

    await db.update(assetId, updates);

    return { ...asset, ...updates };
  }

  /**
   * 에셋 상태 업데이트
   */
  async updateAssetStatus(assetId: string, status: AssetStatus): Promise<void> {
    const db = this.getDatabase('media_assets');
    await db.update(assetId, {
      status,
      updatedAt: new Date(),
    });
  }

  /**
   * 에셋 용도 업데이트
   */
  async updateAssetPurposes(
    assetId: string,
    purposes: ImagePurpose[]
  ): Promise<void> {
    const db = this.getDatabase('media_assets');
    await db.update(assetId, {
      purposes,
      updatedAt: new Date(),
    });
  }

  /**
   * 태그 추가
   */
  async addTags(assetId: string, newTags: string[]): Promise<MediaAsset> {
    const db = this.getDatabase('media_assets');
    const { data: asset } = await db.findById<MediaAsset>(assetId);

    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const uniqueTags = [...new Set([...asset.tags, ...newTags])];

    await db.update(assetId, {
      tags: uniqueTags,
      updatedAt: new Date(),
    });

    return { ...asset, tags: uniqueTags };
  }

  /**
   * 라이브러리 정리
   */
  async organizeLibrary(data?: Record<string, unknown>): Promise<{
    organized: number;
    archived: number;
    deleted: number;
  }> {
    this.logger.info('Organizing library...');

    const db = this.getDatabase('media_assets');
    const { data: assets } = await db.findAll<MediaAsset>({});

    if (!assets) {
      return { organized: 0, archived: 0, deleted: 0 };
    }

    let organized = 0;
    let archived = 0;
    let deleted = 0;

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    for (const asset of assets) {
      // 자동 태그 추가
      if (asset.tags.length === 0) {
        const autoTags = this.generateAutoTags(asset);
        if (autoTags.length > 0) {
          await this.addTags(asset.id, autoTags);
          organized++;
        }
      }

      // 오래된 미사용 에셋 아카이브
      if (
        asset.status === AssetStatus.RAW &&
        asset.createdAt < sixMonthsAgo
      ) {
        await this.updateAssetStatus(asset.id, AssetStatus.ARCHIVED);
        archived++;
      }

      // 만료된 에셋 정리
      if (asset.expiresAt && asset.expiresAt < now) {
        if (data?.deleteExpired) {
          await this.deleteAsset(asset.id);
          deleted++;
        } else {
          await this.updateAssetStatus(asset.id, AssetStatus.ARCHIVED);
          archived++;
        }
      }
    }

    return { organized, archived, deleted };
  }

  /**
   * 자동 태그 생성
   */
  private generateAutoTags(asset: MediaAsset): string[] {
    const tags: string[] = [];

    // 타입 기반 태그
    tags.push(asset.type);

    // 용도 기반 태그
    if (asset.purposes) {
      asset.purposes.forEach((purpose) => {
        tags.push(purpose);
      });
    }

    // 상품 관련 태그
    if (asset.productIds && asset.productIds.length > 0) {
      tags.push('product_image');
    }

    // 촬영 관련 태그
    if (asset.shootingScheduleId) {
      tags.push('studio_shot');
    }

    return tags;
  }

  /**
   * 에셋 아카이브
   */
  async archiveAssets(assetIds: string[]): Promise<void> {
    for (const assetId of assetIds) {
      await this.updateAssetStatus(assetId, AssetStatus.ARCHIVED);
    }
  }

  /**
   * 에셋 삭제
   */
  async deleteAsset(assetId: string): Promise<void> {
    this.logger.info('Deleting asset...', { assetId });

    const db = this.getDatabase('media_assets');

    // 실제 파일 삭제 로직 (구현 필요)
    // await this.deleteFile(asset.url);

    await db.delete(assetId);
  }

  /**
   * 라이브러리 통계
   */
  async getLibraryStats(): Promise<AssetLibraryStats> {
    const db = this.getDatabase('media_assets');
    const { data: assets } = await db.findAll<MediaAsset>({});

    const all = assets || [];
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const byType: Record<AssetType, number> = {
      [AssetType.IMAGE]: 0,
      [AssetType.VIDEO]: 0,
      [AssetType.GIF]: 0,
      [AssetType.VECTOR]: 0,
      [AssetType.DOCUMENT]: 0,
    };

    const byStatus: Record<AssetStatus, number> = {
      [AssetStatus.RAW]: 0,
      [AssetStatus.EDITING]: 0,
      [AssetStatus.REVIEW]: 0,
      [AssetStatus.APPROVED]: 0,
      [AssetStatus.PUBLISHED]: 0,
      [AssetStatus.ARCHIVED]: 0,
    };

    let totalStorageUsed = 0;
    let thisMonthUploads = 0;
    const tagCounts: Record<string, number> = {};

    for (const asset of all) {
      byType[asset.type] = (byType[asset.type] || 0) + 1;
      byStatus[asset.status] = (byStatus[asset.status] || 0) + 1;
      totalStorageUsed += asset.fileSize;

      if (asset.createdAt >= thisMonthStart) {
        thisMonthUploads++;
      }

      for (const tag of asset.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    // 상위 10개 태그
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      totalAssets: all.length,
      byType,
      byStatus,
      totalStorageUsed,
      thisMonthUploads,
      topTags,
    };
  }

  /**
   * 상품별 에셋 그룹화
   */
  async getAssetsByProduct(): Promise<Record<string, MediaAsset[]>> {
    const { data: assets } = await this.getDatabase('media_assets').findAll<MediaAsset>({});

    const grouped: Record<string, MediaAsset[]> = {};

    for (const asset of assets || []) {
      if (asset.productIds) {
        for (const productId of asset.productIds) {
          if (!grouped[productId]) {
            grouped[productId] = [];
          }
          grouped[productId].push(asset);
        }
      }
    }

    return grouped;
  }

  /**
   * 중복 에셋 찾기
   */
  async findDuplicates(): Promise<{ groups: MediaAsset[][] }> {
    const { data: assets } = await this.getDatabase('media_assets').findAll<MediaAsset>({});

    if (!assets) return { groups: [] };

    // 파일명과 크기로 중복 판별 (실제 구현 시 해시 사용)
    const duplicateMap: Record<string, MediaAsset[]> = {};

    for (const asset of assets) {
      const key = `${asset.filename}_${asset.fileSize}`;
      if (!duplicateMap[key]) {
        duplicateMap[key] = [];
      }
      duplicateMap[key].push(asset);
    }

    const groups = Object.values(duplicateMap).filter((g) => g.length > 1);

    return { groups };
  }
}

export default AssetManagementSubAgent;
