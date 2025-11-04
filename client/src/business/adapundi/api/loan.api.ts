import { adapundiInstance } from "./adapundi.axios";

/**
 * 还款计划接口
 */
export interface LoanPlan {
  id: number;
  loanType: string;
  status: string;
  loanSubType: string;
  amount: number;
  interestRate: number;
  duration: string;
  period: number;
  periodsNumber: number;
  periodUnit: string;
  dueAmount: number | null;
  minDueDate: string | null;
  overdueDays: number;
  gracePeriodRate: number;
  collectionLevel: string | null;
  principalAmount: number;
  interestAmount: number;
  defaultAmount: number;
  vatAmount: number;
  shouldRepaymentAmount: number;
  creditQuality: string;
  platform: string;
  rolloverType: string | null;
  esignFlag: boolean;
}

/**
 * 查询还款计划
 * @param customerId 客户ID
 * @returns 还款计划列表
 */
export async function getLoanPlan(customerId: number): Promise<LoanPlan[]> {
  const response = await adapundiInstance.get(
    `/hive-collection-admin/customer/${customerId}/loan-info`
  );
  return response as unknown as LoanPlan[];
}

