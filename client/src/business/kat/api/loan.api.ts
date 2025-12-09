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
 * 查询贷款详情
 * @param cid 案件ID
 * @returns 贷款详情
 */
export async function getLoanDetail(cid: string): Promise<KatLoanDetailResponse[]> {
  const response = await katInstance.get(`/api/applications?cid=${cid}`);
  const katLoans = response as unknown as KatLoanDetailResponse[];
  
  if (!Array.isArray(katLoans)) {
    return [];
  }
  return katLoans;
}

