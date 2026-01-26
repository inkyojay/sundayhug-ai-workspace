/**
 * 세무 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 세금계산서관리, 부가세자료, 기장데이터를 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
  ApprovalLevel,
  DateRange,
} from '../../types';
import {
  TaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceItem,
  VatReportData,
  BookkeepingData,
  AccountEntry,
  TaxTaskPayload,
  TaxResult,
} from './types';

/**
 * 세무 서브에이전트 클래스
 */
export class TaxSubAgent extends SubAgent {
  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Tax SubAgent...');
  }

  /**
   * 정리
   */
  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<TaxResult>> {
    const startTime = Date.now();
    const payload = context.data as TaxTaskPayload;

    this.logger.info('Running Tax SubAgent', {
      action: payload.action,
      period: payload.period,
    });

    try {
      let result: TaxResult;

      switch (payload.action) {
        case 'import_invoices':
          result = await this.importTaxInvoices(payload.taxInvoices || []);
          break;

        case 'generate_vat_report':
          result = await this.generateVatReport(payload.period!);
          break;

        case 'prepare_bookkeeping':
          result = await this.prepareBookkeepingData(payload.period!, payload.options);
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Tax management failed', error as Error);
      throw error;
    }
  }

  /**
   * 세금계산서 가져오기
   */
  private async importTaxInvoices(invoices: TaxInvoice[]): Promise<TaxResult> {
    const db = this.getDatabase('tax_invoices');
    const processedInvoices: TaxInvoice[] = [];

    for (const invoice of invoices) {
      // 중복 체크
      const existingResult = await db.findByCondition<TaxInvoice>({
        invoiceNumber: invoice.invoiceNumber,
      });

      if (existingResult.data && existingResult.data.length > 0) {
        this.logger.warn(`Duplicate tax invoice: ${invoice.invoiceNumber}`);
        continue;
      }

      // 상태 설정
      invoice.status = invoice.direction === 'issued'
        ? TaxInvoiceStatus.ISSUED
        : TaxInvoiceStatus.RECEIVED;

      await db.create(invoice);
      processedInvoices.push(invoice);
    }

    this.logger.info(`Imported ${processedInvoices.length} tax invoices`);

    return {
      processedInvoices,
    };
  }

  /**
   * 부가세 신고 자료 생성
   */
  private async generateVatReport(period: DateRange): Promise<TaxResult> {
    const db = this.getDatabase('tax_invoices');
    const invoicesResult = await db.findByCondition<TaxInvoice>({});
    const invoices = invoicesResult.data || [];

    // 기간 내 세금계산서 필터링
    const periodInvoices = invoices.filter(inv => {
      const issueDate = new Date(inv.issueDate);
      return issueDate >= period.start && issueDate <= period.end;
    });

    // 매출/매입 분류
    const salesInvoices = periodInvoices.filter(inv => inv.direction === 'issued');
    const purchaseInvoices = periodInvoices.filter(inv => inv.direction === 'received');

    // 분기 계산
    const startMonth = period.start.getMonth();
    const quarter = Math.floor(startMonth / 3) + 1 as 1 | 2 | 3 | 4;

    const vatReportData: VatReportData = {
      period: {
        year: period.start.getFullYear(),
        quarter,
      },
      salesTaxInvoices: {
        count: salesInvoices.length,
        supplyAmount: salesInvoices.reduce((sum, inv) => sum + inv.supplyAmount, 0),
        taxAmount: salesInvoices.reduce((sum, inv) => sum + inv.taxAmount, 0),
      },
      purchaseTaxInvoices: {
        count: purchaseInvoices.length,
        supplyAmount: purchaseInvoices.reduce((sum, inv) => sum + inv.supplyAmount, 0),
        taxAmount: purchaseInvoices.reduce((sum, inv) => sum + inv.taxAmount, 0),
      },
      cardSales: {
        amount: 0, // 별도 연동 필요
        taxAmount: 0,
      },
      cashReceiptSales: {
        amount: 0, // 별도 연동 필요
        taxAmount: 0,
      },
      payableOrRefundable: 0,
      generatedAt: new Date(),
    };

    // 납부/환급 세액 계산
    vatReportData.payableOrRefundable =
      vatReportData.salesTaxInvoices.taxAmount -
      vatReportData.purchaseTaxInvoices.taxAmount;

    this.logger.info('Generated VAT report data', {
      salesCount: vatReportData.salesTaxInvoices.count,
      purchaseCount: vatReportData.purchaseTaxInvoices.count,
      payable: vatReportData.payableOrRefundable,
    });

    return {
      vatReportData,
      processedInvoices: periodInvoices,
    };
  }

  /**
   * 기장 데이터 준비
   */
  private async prepareBookkeepingData(
    period: DateRange,
    options?: TaxTaskPayload['options']
  ): Promise<TaxResult> {
    // 세금계산서 조회
    const taxDb = this.getDatabase('tax_invoices');
    const invoicesResult = await taxDb.findByCondition<TaxInvoice>({});
    const invoices = invoicesResult.data || [];

    const periodInvoices = invoices.filter(inv => {
      const issueDate = new Date(inv.issueDate);
      return issueDate >= period.start && issueDate <= period.end;
    });

    // 분개 데이터 생성
    const salesEntries: AccountEntry[] = [];
    const purchaseEntries: AccountEntry[] = [];

    for (const invoice of periodInvoices) {
      if (invoice.direction === 'issued') {
        // 매출 분개
        salesEntries.push({
          id: `entry-${invoice.id}-1`,
          date: new Date(invoice.issueDate),
          accountCode: '108',
          accountName: '매출채권',
          debitAmount: invoice.totalAmount,
          creditAmount: 0,
          description: `매출 - ${invoice.buyer.companyName}`,
          evidenceType: 'tax_invoice',
          evidenceId: invoice.id,
        });
        salesEntries.push({
          id: `entry-${invoice.id}-2`,
          date: new Date(invoice.issueDate),
          accountCode: '401',
          accountName: '매출',
          debitAmount: 0,
          creditAmount: invoice.supplyAmount,
          description: `매출 - ${invoice.buyer.companyName}`,
          evidenceType: 'tax_invoice',
          evidenceId: invoice.id,
        });
        salesEntries.push({
          id: `entry-${invoice.id}-3`,
          date: new Date(invoice.issueDate),
          accountCode: '255',
          accountName: '부가세예수금',
          debitAmount: 0,
          creditAmount: invoice.taxAmount,
          description: `부가세 - ${invoice.buyer.companyName}`,
          evidenceType: 'tax_invoice',
          evidenceId: invoice.id,
        });
      } else {
        // 매입 분개
        purchaseEntries.push({
          id: `entry-${invoice.id}-1`,
          date: new Date(invoice.issueDate),
          accountCode: '501',
          accountName: '매입',
          debitAmount: invoice.supplyAmount,
          creditAmount: 0,
          description: `매입 - ${invoice.supplier.companyName}`,
          evidenceType: 'tax_invoice',
          evidenceId: invoice.id,
        });
        purchaseEntries.push({
          id: `entry-${invoice.id}-2`,
          date: new Date(invoice.issueDate),
          accountCode: '135',
          accountName: '부가세대급금',
          debitAmount: invoice.taxAmount,
          creditAmount: 0,
          description: `부가세 - ${invoice.supplier.companyName}`,
          evidenceType: 'tax_invoice',
          evidenceId: invoice.id,
        });
        purchaseEntries.push({
          id: `entry-${invoice.id}-3`,
          date: new Date(invoice.issueDate),
          accountCode: '251',
          accountName: '매입채무',
          debitAmount: 0,
          creditAmount: invoice.totalAmount,
          description: `매입채무 - ${invoice.supplier.companyName}`,
          evidenceType: 'tax_invoice',
          evidenceId: invoice.id,
        });
      }
    }

    const bookkeepingData: BookkeepingData = {
      period,
      salesEntries,
      purchaseEntries,
      status: 'draft',
    };

    // 자동 전송 옵션
    if (options?.autoSubmit) {
      // 승인 요청
      const approved = await this.requestApprovalFromParent(
        '기장 데이터 회계사무소 전송 승인',
        `${period.start.toISOString().slice(0, 7)} 기장 데이터를 회계사무소로 전송합니다.`,
        { entriesCount: salesEntries.length + purchaseEntries.length }
      );

      if (approved) {
        bookkeepingData.status = 'submitted';
        bookkeepingData.submittedAt = new Date();
        this.logger.info('Bookkeeping data submitted to accounting firm');
      }
    }

    this.logger.info('Prepared bookkeeping data', {
      salesEntries: salesEntries.length,
      purchaseEntries: purchaseEntries.length,
    });

    return {
      bookkeepingData,
      processedInvoices: periodInvoices,
    };
  }

  /**
   * 세금계산서 생성
   */
  async createTaxInvoice(
    direction: 'issued' | 'received',
    supplier: TaxInvoice['supplier'],
    buyer: TaxInvoice['buyer'],
    items: TaxInvoiceItem[],
    options?: Partial<TaxInvoice>
  ): Promise<TaxInvoice> {
    const now = new Date();

    const supplyAmount = items.reduce((sum, item) => sum + item.supplyAmount, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);

    const invoice: TaxInvoice = {
      id: `invoice-${now.getTime()}`,
      invoiceNumber: this.generateInvoiceNumber(),
      direction,
      status: direction === 'issued' ? TaxInvoiceStatus.ISSUED : TaxInvoiceStatus.RECEIVED,
      supplier,
      buyer,
      issueDate: options?.issueDate || now,
      supplyAmount,
      taxAmount,
      totalAmount: supplyAmount + taxAmount,
      items,
      createdAt: now,
      updatedAt: now,
      ...options,
    };

    const db = this.getDatabase('tax_invoices');
    await db.create(invoice);

    this.logger.info('Created tax invoice', {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
    });

    return invoice;
  }

  /**
   * 세금계산서 번호 생성
   */
  private generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    return `${year}${month}${day}-${random}`;
  }
}

export default TaxSubAgent;
