import { katInstance } from "./kat.axios";
import { LoanPlan, LoanDetail } from "../../common/entities";

/**
 * 导出公共实体类型（保持向后兼容）
 */
export type { LoanPlan };

/**
 * KAT 贷款详情响应
 */
interface KatLoanDetailResponse {
  account_number?: string;
  aid?: string;
  apply_time?: string;
  bank_code?: string;
  disburse_time?: string;
  due_at?: string;
  interest: string;
  late_fee: string;
  lid?: string;
  overdue_days: number;
  principal: string;
  remittance_amount?: string;
  repaid: string;
  unpaid: string;
}

/**
 * 将 KAT 贷款详情转换为通用 LoanPlan 格式
 */
function mapKatLoanDetailToLoanPlan(katLoan: KatLoanDetailResponse): LoanPlan {
  return {
    id: parseInt(katLoan.lid || '0') || 0,
    loanType: 'NORMAL',
    status: 'ACTIVE',
    loanSubType: '',
    amount: parseFloat(katLoan.remittance_amount || '0'),
    interestRate: 0,
    duration: '0',
    period: 0,
    periodsNumber: 1,
    periodUnit: 'MONTH',
    dueAmount: parseFloat(katLoan.unpaid || '0'),
    minDueDate: katLoan.due_at || null,
    overdueDays: katLoan.overdue_days,
    gracePeriodRate: 0,
    collectionLevel: null,
    principalAmount: parseFloat(katLoan.principal || '0'),
    interestAmount: parseFloat(katLoan.interest || '0'),
    defaultAmount: parseFloat(katLoan.late_fee || '0'),
    vatAmount: 0,
    shouldRepaymentAmount: parseFloat(katLoan.unpaid || '0'),
    creditQuality: '',
    platform: 'KAT',
    rolloverType: null,
    esignFlag: false,
  };
}

/**
 * 查询还款计划
 * @param cid 案件ID
 * @returns 还款计划列表
 */
export async function getLoanPlan(cid: string): Promise<LoanPlan[]> {
  const response = await katInstance.get(`/api/applications?cid=${cid}`);
  const katLoans = response as unknown as KatLoanDetailResponse[];
  
  if (!Array.isArray(katLoans)) {
    return [];
  }
  
  return katLoans.map(mapKatLoanDetailToLoanPlan);
}

/**
 * 查询贷款详情
 * @param cid 案件ID
 * @returns 贷款详情
 */
export async function getLoanDetail(cid: string): Promise<LoanDetail | null> {
  const response = await katInstance.get(`/api/applications?cid=${cid}`);
  const katLoans = response as unknown as KatLoanDetailResponse[];
  
  if (!Array.isArray(katLoans) || katLoans.length === 0) {
    return null;
  }
  
  const katLoan = katLoans[0];
  
  return {
    id: parseInt(katLoan.lid || '0') || 0,
    loanType: 'NORMAL',
    status: 'ACTIVE',
    loanSubType: '',
    amount: parseFloat(katLoan.remittance_amount || '0'),
    interestRate: 0,
    duration: '0',
    period: 0,
    periodsNumber: 1,
    periodUnit: 'MONTH',
    dueAmount: parseFloat(katLoan.unpaid || '0'),
    minDueDate: katLoan.due_at || null,
    overdueDays: katLoan.overdue_days,
    gracePeriodRate: 0,
    collectionLevel: null,
    principalAmount: parseFloat(katLoan.principal || '0'),
    interestAmount: parseFloat(katLoan.interest || '0'),
    defaultAmount: parseFloat(katLoan.late_fee || '0'),
    vatAmount: 0,
    shouldRepaymentAmount: parseFloat(katLoan.unpaid || '0'),
    creditQuality: '',
    platform: 'KAT',
    rolloverType: null,
    esignFlag: false,
  };
}

