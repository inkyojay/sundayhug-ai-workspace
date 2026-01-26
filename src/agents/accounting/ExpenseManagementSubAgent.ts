/**
 * 비용관리 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 지출분류, 카드내역정리를 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
  DateRange,
} from '../../types';
import {
  ExpenseItem,
  ExpenseCategory,
  CardTransaction,
  ExpenseSummary,
  ExpenseManagementTaskPayload,
  ExpenseManagementResult,
} from './types';

/**
 * 비용관리 서브에이전트 클래스
 */
export class ExpenseManagementSubAgent extends SubAgent {
  /** 가맹점-카테고리 매핑 */
  private merchantCategoryMap: Map<string, ExpenseCategory> = new Map([
    ['쿠팡', ExpenseCategory.PLATFORM_FEE],
    ['네이버', ExpenseCategory.PLATFORM_FEE],
    ['CJ대한통운', ExpenseCategory.SHIPPING],
    ['한진택배', ExpenseCategory.SHIPPING],
    ['페이스북', ExpenseCategory.MARKETING],
    ['구글', ExpenseCategory.MARKETING],
    ['카카오', ExpenseCategory.MARKETING],
    ['이마트', ExpenseCategory.MATERIAL],
    ['코스트코', ExpenseCategory.MATERIAL],
    ['다이소', ExpenseCategory.PACKAGING],
    ['박스월드', ExpenseCategory.PACKAGING],
    ['KT', ExpenseCategory.UTILITY],
    ['SKT', ExpenseCategory.UTILITY],
    ['한국전력', ExpenseCategory.UTILITY],
  ]);

  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Expense Management SubAgent...');
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
  protected async run(context: AgentContext): Promise<AgentResult<ExpenseManagementResult>> {
    const startTime = Date.now();
    const payload = context.data as ExpenseManagementTaskPayload;

    this.logger.info('Running Expense Management SubAgent', {
      action: payload.action,
      period: payload.period,
    });

    try {
      let result: ExpenseManagementResult;

      switch (payload.action) {
        case 'classify':
          result = await this.classifyExpenses(payload.period!);
          break;

        case 'import_cards':
          result = await this.importCardTransactions(payload.cardTransactions || []);
          break;

        case 'generate_summary':
          result = await this.generateExpenseSummary(payload.period!);
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Expense Management failed', error as Error);
      throw error;
    }
  }

  /**
   * 비용 분류
   */
  private async classifyExpenses(period: DateRange): Promise<ExpenseManagementResult> {
    const db = this.getDatabase('card_transactions');
    const transactionsResult = await db.findByCondition<CardTransaction>({
      status: 'pending',
    });

    const transactions = transactionsResult.data || [];
    const classifiedTransactions: CardTransaction[] = [];

    for (const transaction of transactions) {
      const category = this.classifyTransaction(transaction);
      transaction.expenseCategory = category;
      transaction.status = 'classified';
      classifiedTransactions.push(transaction);

      await db.update(transaction.id, transaction);
    }

    this.logger.info(`Classified ${classifiedTransactions.length} transactions`);

    return {
      classifiedTransactions,
    };
  }

  /**
   * 거래 분류
   */
  private classifyTransaction(transaction: CardTransaction): ExpenseCategory {
    // 가맹점명으로 분류 시도
    for (const [keyword, category] of this.merchantCategoryMap) {
      if (transaction.merchantName.includes(keyword)) {
        return category;
      }
    }

    // 가맹점 카테고리로 분류 시도
    if (transaction.merchantCategory) {
      const categoryMap: Record<string, ExpenseCategory> = {
        '택배/운송': ExpenseCategory.SHIPPING,
        '광고/마케팅': ExpenseCategory.MARKETING,
        '사무용품': ExpenseCategory.OFFICE,
        '식료품': ExpenseCategory.MATERIAL,
        '전기/가스': ExpenseCategory.UTILITY,
        '보험': ExpenseCategory.INSURANCE,
        '법률/회계': ExpenseCategory.PROFESSIONAL,
      };

      if (categoryMap[transaction.merchantCategory]) {
        return categoryMap[transaction.merchantCategory];
      }
    }

    // 기본값
    return ExpenseCategory.OTHER;
  }

  /**
   * 카드 거래 가져오기
   */
  private async importCardTransactions(
    transactions: CardTransaction[]
  ): Promise<ExpenseManagementResult> {
    const db = this.getDatabase('card_transactions');
    const classifiedTransactions: CardTransaction[] = [];

    for (const transaction of transactions) {
      // 자동 분류
      const category = this.classifyTransaction(transaction);
      transaction.expenseCategory = category;
      transaction.status = 'classified';

      await db.create(transaction);
      classifiedTransactions.push(transaction);
    }

    this.logger.info(`Imported ${classifiedTransactions.length} card transactions`);

    return {
      classifiedTransactions,
    };
  }

  /**
   * 비용 요약 생성
   */
  private async generateExpenseSummary(period: DateRange): Promise<ExpenseManagementResult> {
    const db = this.getDatabase('expenses');
    const expensesResult = await db.findByCondition<ExpenseItem>({});

    const expenses = expensesResult.data || [];

    // 필터링: 기간 내 비용만
    const filteredExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.expenseDate);
      return expDate >= period.start && expDate <= period.end;
    });

    // 카테고리별 합계 계산
    const byCategory: Record<ExpenseCategory, number> = {
      [ExpenseCategory.MATERIAL]: 0,
      [ExpenseCategory.PACKAGING]: 0,
      [ExpenseCategory.SHIPPING]: 0,
      [ExpenseCategory.MARKETING]: 0,
      [ExpenseCategory.PLATFORM_FEE]: 0,
      [ExpenseCategory.LABOR]: 0,
      [ExpenseCategory.RENT]: 0,
      [ExpenseCategory.UTILITY]: 0,
      [ExpenseCategory.TAX]: 0,
      [ExpenseCategory.INSURANCE]: 0,
      [ExpenseCategory.EQUIPMENT]: 0,
      [ExpenseCategory.OFFICE]: 0,
      [ExpenseCategory.PROFESSIONAL]: 0,
      [ExpenseCategory.OTHER]: 0,
    };

    let totalExpense = 0;
    let totalVat = 0;

    for (const expense of filteredExpenses) {
      byCategory[expense.category] += expense.amount;
      totalExpense += expense.amount;
      totalVat += expense.vatAmount || 0;
    }

    const summary: ExpenseSummary = {
      period,
      byCategory,
      totalExpense,
      totalVat,
    };

    this.logger.info('Generated expense summary', {
      totalExpense,
      categories: Object.entries(byCategory)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${k}: ${v}`),
    });

    return {
      expenses: filteredExpenses,
      summary,
    };
  }

  /**
   * 비용 항목 생성
   */
  async createExpenseItem(
    category: ExpenseCategory,
    name: string,
    amount: number,
    options?: Partial<ExpenseItem>
  ): Promise<ExpenseItem> {
    const now = new Date();
    const expense: ExpenseItem = {
      id: `expense-${now.getTime()}`,
      category,
      name,
      amount,
      vatIncluded: options?.vatIncluded ?? true,
      vatAmount: options?.vatIncluded ? Math.round(amount / 11) : options?.vatAmount,
      expenseDate: options?.expenseDate || now,
      approvalStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      ...options,
    };

    const db = this.getDatabase('expenses');
    await db.create(expense);

    this.logger.info('Created expense item', { id: expense.id, category, amount });

    return expense;
  }
}

export default ExpenseManagementSubAgent;
