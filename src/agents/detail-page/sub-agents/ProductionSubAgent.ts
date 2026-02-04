/**
 * 썬데이허그 AI 에이전트 시스템 - Production SubAgent
 *
 * 상세페이지 제작 담당 서브 에이전트입니다.
 * - 카피 작성
 * - 레이아웃 생성
 * - 이미지 배치
 */

import { SubAgent, SubAgentConfig } from '../../base/SubAgent';
import { AgentContext, AgentResult, SalesChannel } from '../../../types';
import {
  DetailPage,
  DetailPageStatus,
  DetailPageType,
  DetailPagePlan,
  PageSection,
  SectionType,
  SectionContent,
  CopyRequest,
  CopyResult,
  LayoutTemplate,
  ImagePlacement,
  SEOInfo,
} from '../types';

/**
 * Production SubAgent 클래스
 */
export class ProductionSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  protected async initialize(): Promise<void> {
    this.logger.info('Production SubAgent initializing...');
  }

  protected async run(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const taskType = context.data?.taskType as string;

    try {
      let result: unknown;

      switch (taskType) {
        case 'create_page':
          result = await this.createPage(context.data);
          break;
        case 'write_copy':
          result = await this.writeCopy(context.data);
          break;
        case 'generate_layout':
          result = await this.generateLayout(context.data);
          break;
        case 'place_images':
          result = await this.placeImages(context.data);
          break;
        case 'optimize_seo':
          result = await this.optimizeSEO(context.data?.pageId as string);
          break;
        default:
          result = await this.createPage(context.data);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.info('Production SubAgent cleanup...');
  }

  // ===========================================================================
  // 비즈니스 로직 메서드
  // ===========================================================================

  /**
   * 상세페이지 생성
   */
  async createPage(data?: Record<string, unknown>): Promise<DetailPage> {
    const productId = data?.productId as string;
    const productName = data?.productName as string;
    const plan = data?.plan as DetailPagePlan;
    const channels = data?.channels as SalesChannel[] || [SalesChannel.NAVER];

    this.logger.info('Creating detail page...', { productId, productName });

    // 1. 레이아웃 선택/생성
    const layout = await this.selectLayout(plan);

    // 2. 섹션별 콘텐츠 생성
    const sections = await this.createSections(plan, layout);

    // 3. SEO 정보 생성
    const seo = await this.generateSEO(productName, plan);

    const page: DetailPage = {
      id: `page-${Date.now()}`,
      productId,
      productName,
      status: DetailPageStatus.DRAFT,
      type: DetailPageType.STANDARD,
      version: 1,
      sections,
      channels,
      seo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 저장
    const db = this.getDatabase('detail_pages');
    await db.create(page);

    return page;
  }

  /**
   * 레이아웃 선택
   */
  private async selectLayout(plan: DetailPagePlan): Promise<LayoutTemplate> {
    const db = this.getDatabase('layout_templates');
    const { data: templates } = await db.findAll<LayoutTemplate>({});

    // 기본 템플릿 반환
    return {
      id: 'default-template',
      name: '기본 템플릿',
      description: '썬데이허그 표준 상세페이지 템플릿',
      type: DetailPageType.STANDARD,
      sections: plan.recommendedStructure,
      previewUrl: '',
      suitableCategories: [],
    };
  }

  /**
   * 섹션 생성
   */
  private async createSections(
    plan: DetailPagePlan,
    layout: LayoutTemplate
  ): Promise<PageSection[]> {
    const sections: PageSection[] = [];

    for (let i = 0; i < layout.sections.length; i++) {
      const sectionType = layout.sections[i];
      const content = await this.createSectionContent(sectionType, plan);

      sections.push({
        id: `section-${sectionType}-${i}`,
        type: sectionType,
        title: this.getSectionTitle(sectionType),
        content,
        order: i,
        visible: true,
      });
    }

    return sections;
  }

  /**
   * 섹션 콘텐츠 생성
   */
  private async createSectionContent(
    sectionType: SectionType,
    plan: DetailPagePlan
  ): Promise<SectionContent> {
    const copyRequest: CopyRequest = {
      sectionType,
      productInfo: plan.productAnalysis,
      targetInfo: plan.targetAnalysis,
      toneAndManner: plan.toneAndManner,
    };

    const copy = await this.generateCopy(copyRequest);

    return {
      headline: copy.headline,
      subheadline: copy.subheadline,
      body: copy.body,
      images: [],
      listItems: sectionType === SectionType.FEATURES
        ? plan.productAnalysis.mainFeatures.map(f => ({ title: f }))
        : undefined,
    };
  }

  /**
   * 섹션 제목 가져오기
   */
  private getSectionTitle(sectionType: SectionType): string {
    const titles: Record<SectionType, string> = {
      [SectionType.HERO]: '',
      [SectionType.PRODUCT_INFO]: '제품 소개',
      [SectionType.FEATURES]: '이런 점이 특별해요',
      [SectionType.USAGE]: '이렇게 사용하세요',
      [SectionType.SPECIFICATIONS]: '상세 스펙',
      [SectionType.REVIEWS]: '실제 사용 후기',
      [SectionType.FAQ]: '자주 묻는 질문',
      [SectionType.WARRANTY]: '품질 보증',
      [SectionType.SHIPPING]: '배송 안내',
      [SectionType.CTA]: '',
    };
    return titles[sectionType] || '';
  }

  /**
   * 카피 작성
   */
  async writeCopy(data?: Record<string, unknown>): Promise<CopyResult> {
    const request = data as unknown as CopyRequest;
    return this.generateCopy(request);
  }

  /**
   * 카피 생성
   */
  private async generateCopy(request: CopyRequest): Promise<CopyResult> {
    const { sectionType, productInfo, targetInfo, toneAndManner } = request;

    // 실제 구현 시 LLM 사용
    const copyTemplates: Record<SectionType, () => CopyResult> = {
      [SectionType.HERO]: () => ({
        headline: productInfo.usp,
        subheadline: `${targetInfo.persona}를 위한 선택`,
        body: '',
      }),
      [SectionType.PRODUCT_INFO]: () => ({
        headline: '아기와 엄마를 생각한 디자인',
        body: `${productInfo.mainFeatures.join(', ')}으로 더욱 편안한 육아 생활을 경험하세요.`,
      }),
      [SectionType.FEATURES]: () => ({
        headline: '썬데이허그만의 특별함',
        body: productInfo.strengths.map(s => `✓ ${s}`).join('\n'),
      }),
      [SectionType.USAGE]: () => ({
        headline: '간편한 사용법',
        body: '누구나 쉽게 사용할 수 있어요.',
      }),
      [SectionType.SPECIFICATIONS]: () => ({
        headline: '상세 정보',
        body: '',
      }),
      [SectionType.REVIEWS]: () => ({
        headline: '실제 사용 후기',
        subheadline: '이미 많은 엄마들이 선택했어요',
        body: '',
      }),
      [SectionType.FAQ]: () => ({
        headline: '자주 묻는 질문',
        body: '',
      }),
      [SectionType.WARRANTY]: () => ({
        headline: '안심 품질 보증',
        body: '썬데이허그는 품질에 자신있습니다.',
      }),
      [SectionType.SHIPPING]: () => ({
        headline: '배송 안내',
        body: '평일 오후 2시 이전 주문 시 당일 출고',
      }),
      [SectionType.CTA]: () => ({
        headline: '지금 바로 만나보세요',
        body: '',
        buttons: [{ text: '장바구니 담기', url: '#', style: 'primary' as const }],
      }),
    };

    const generator = copyTemplates[sectionType];
    return generator ? generator() : { headline: '', body: '' };
  }

  /**
   * 레이아웃 생성
   */
  async generateLayout(data?: Record<string, unknown>): Promise<LayoutTemplate> {
    const pageType = data?.pageType as DetailPageType || DetailPageType.STANDARD;
    const category = data?.category as string;

    this.logger.info('Generating layout...', { pageType, category });

    // 카테고리별 최적화된 레이아웃
    const sectionConfigs: Record<string, SectionType[]> = {
      default: [
        SectionType.HERO,
        SectionType.FEATURES,
        SectionType.PRODUCT_INFO,
        SectionType.USAGE,
        SectionType.REVIEWS,
        SectionType.FAQ,
        SectionType.SHIPPING,
        SectionType.CTA,
      ],
      electronics: [
        SectionType.HERO,
        SectionType.PRODUCT_INFO,
        SectionType.FEATURES,
        SectionType.SPECIFICATIONS,
        SectionType.USAGE,
        SectionType.WARRANTY,
        SectionType.REVIEWS,
        SectionType.FAQ,
        SectionType.SHIPPING,
        SectionType.CTA,
      ],
    };

    const sections = sectionConfigs[category] || sectionConfigs.default;

    return {
      id: `layout-${Date.now()}`,
      name: `${category || 'Standard'} Layout`,
      description: `${category || '기본'} 카테고리용 레이아웃`,
      type: pageType,
      sections,
      previewUrl: '',
      suitableCategories: category ? [category] : [],
    };
  }

  /**
   * 이미지 배치
   */
  async placeImages(data?: Record<string, unknown>): Promise<ImagePlacement[]> {
    const pageId = data?.pageId as string;
    const imageAssets = data?.imageAssets as string[];

    this.logger.info('Placing images...', { pageId });

    const db = this.getDatabase('detail_pages');
    const { data: page } = await db.findById<DetailPage>(pageId);

    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const placements: ImagePlacement[] = [];

    for (const section of page.sections) {
      const placement: ImagePlacement = {
        sectionId: section.id,
        requiredImageCount: this.getRequiredImageCount(section.type),
        imageSize: this.getImageSize(section.type),
        imageType: this.getImageType(section.type),
      };
      placements.push(placement);
    }

    return placements;
  }

  /**
   * 섹션별 필요 이미지 수
   */
  private getRequiredImageCount(sectionType: SectionType): number {
    const counts: Record<SectionType, number> = {
      [SectionType.HERO]: 1,
      [SectionType.PRODUCT_INFO]: 3,
      [SectionType.FEATURES]: 4,
      [SectionType.USAGE]: 3,
      [SectionType.SPECIFICATIONS]: 1,
      [SectionType.REVIEWS]: 0,
      [SectionType.FAQ]: 0,
      [SectionType.WARRANTY]: 1,
      [SectionType.SHIPPING]: 0,
      [SectionType.CTA]: 1,
    };
    return counts[sectionType] || 0;
  }

  /**
   * 섹션별 이미지 크기
   */
  private getImageSize(sectionType: SectionType): { width: number; height: number } {
    if (sectionType === SectionType.HERO) {
      return { width: 1200, height: 600 };
    }
    return { width: 800, height: 600 };
  }

  /**
   * 섹션별 이미지 타입
   */
  private getImageType(
    sectionType: SectionType
  ): 'product' | 'lifestyle' | 'infographic' | 'icon' {
    const types: Record<SectionType, 'product' | 'lifestyle' | 'infographic' | 'icon'> = {
      [SectionType.HERO]: 'lifestyle',
      [SectionType.PRODUCT_INFO]: 'product',
      [SectionType.FEATURES]: 'infographic',
      [SectionType.USAGE]: 'lifestyle',
      [SectionType.SPECIFICATIONS]: 'product',
      [SectionType.REVIEWS]: 'lifestyle',
      [SectionType.FAQ]: 'icon',
      [SectionType.WARRANTY]: 'icon',
      [SectionType.SHIPPING]: 'icon',
      [SectionType.CTA]: 'product',
    };
    return types[sectionType] || 'product';
  }

  /**
   * SEO 최적화
   */
  async optimizeSEO(pageId: string): Promise<SEOInfo> {
    this.logger.info('Optimizing SEO...', { pageId });

    const db = this.getDatabase('detail_pages');
    const { data: page } = await db.findById<DetailPage>(pageId);

    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const seo = await this.generateSEO(page.productName, null);

    await db.update(pageId, {
      seo,
      updatedAt: new Date(),
    });

    return seo;
  }

  /**
   * SEO 정보 생성
   */
  private async generateSEO(
    productName: string,
    plan: DetailPagePlan | null
  ): Promise<SEOInfo> {
    const keywords = [
      productName,
      '아기용품',
      '육아',
      '썬데이허그',
      ...(plan?.productAnalysis.mainFeatures || []),
    ];

    return {
      metaTitle: `${productName} | 썬데이허그`,
      metaDescription: `${productName} - 아기와 엄마를 위한 썬데이허그의 안전한 선택. ${plan?.productAnalysis.usp || ''}`,
      keywords,
    };
  }

  /**
   * 상세페이지 상태 업데이트
   */
  async updatePageStatus(pageId: string, status: DetailPageStatus): Promise<void> {
    const db = this.getDatabase('detail_pages');
    await db.update(pageId, {
      status,
      updatedAt: new Date(),
      ...(status === DetailPageStatus.PUBLISHED ? { publishedAt: new Date() } : {}),
    });
  }
}

export default ProductionSubAgent;
