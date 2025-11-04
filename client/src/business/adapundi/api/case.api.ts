import { adapundiInstance } from "./adapundi.axios";
/**
 * 案例信息接口
 */
export interface Case {
  id: number;
  caseId: string;
  fullName: string;
  customerType: string | null;
  product: string | null;
  status: string | null;
  mobile: string;
  trigger: string | null;
  customerId: number;
  groupId: number;
  level: string | null;
  amount: number;
  principleAmount: number;
  distributedDay: number;
  overdueDay: number;
  reviewerId: number | null;
  reviewerName: string | null;
  createTime: string;
  lastLogCreateTime: string | null;
  customerTag: string | null;
  customerSysTag: string | null;
  teamLeaderName: string | null;
  lastSevenCount: number | null;
  riskGrade: string | null;
  clearedNumber: number;
  outCallTaskConfigId: number;
  outCallTaskName: string | null;
  outCallTaskStrategyId: number | null;
  outCallTaskCode: string | null;
  outCallTaskStatus: string | null;
  predictOutCallTaskId: number | null;
  lastLoginTime: string | null;
  channel1: string | null;
  channel2: string | null;
  phoneRemarkContent: string | null;
  waRemarkContent: string | null;
  dueDate: string | null;
  todoFlag: boolean;
  queue: string | null;
  smsEventStatus: string | null;
  latestSmsSendSuccessTime: string | null;
  loanTag: string | null;
  vipLevel: string | null;
  postLoanPreReminderLevel: string | null;
  overdueInstitutionLevel: string | null;
  applyPlatform: string | null;
  installPlatform: string | null;
  lastLoginPlatform: string | null;
  allowDownloadCollectionLetter: boolean;
  waitCall: boolean;
  inCollectionDays: number;
  isTadpole: boolean;
}

/**
 * 分页查询参数
 */
export interface CasePageParams {
  pageNum?: number; // 页码，默认1
  pageSize?: number; // 每页大小，默认20
  product?: string; // 产品类型，如 "AP"
  [key: string]: any; // 允许其他查询参数
}

/**
 * 分页响应数据
 */
export interface CasePageResponse {
  records: Case[];
  total: number;
  size: number;
  current: number;
  orders: any[];
  optimizeCountSql: boolean;
  searchCount: boolean;
  countId: string | null;
  maxLimit: number | null;
  pages: number;
}

/**
 * 案件详情接口
 */
export interface CaseDetail {
  id: number;
  caseId: string;
  trigger: string | null;
  level: string | null;
  fullName: string;
  mobile: string;
  customerId: number;
  overdueDay: number;
  reviewerId: number | null;
  reviewerName: string | null;
  customerTag: string | null;
  riskGrade: string | null;
  clearedNumber: number;
  tags: string;
  channel1: string | null;
  channel2: string | null;
  gender: string | null;
  dueDate: string | null;
  loanTag: string | null;
  postLoanPreReminderLevel: string | null;
  overdueInstitutionLevel: string | null;
  isMinPay: boolean | null;
  isInstallmentPay: boolean | null;
  minPayBillId: number | null;
  installmentBillId: number | null;
  customerClikInfo: any | null;
  vaList: any | null;
  tadpoleCount: string;
  tadpoleAmount: string;
  riskScoreAndLevel: string | null;
  amount: number;
  principleAmount: number;
  interestAmount: number;
  punishmentAmount: number;
  vatAmount: number;
  distributedDay: number;
  expireAmount: number;
  expirePrincipleAmount: number;
  expireInterestAmount: number;
  expirePunishmentAmount: number;
  expireVatAmount: number;
  backupMobile: string;
  createTime: string;
}

/**
 * 获取案例分页列表
 * @param params 查询参数
 * @returns 分页响应数据
 */
export async function getCasePage(params: CasePageParams = {}): Promise<CasePageResponse> {
  const { pageNum = 1, pageSize = 20, ...restParams } = params;
  const response = await adapundiInstance.get("/hive-collection-admin/cases/page", {
    params: {
      pageNum,
      pageSize,
      ...restParams,
    },
  });
  return response as unknown as CasePageResponse;
}

/**
 * 获取案件详情
 * @param product 产品类型，如 "AP"
 * @param id 案件ID
 * @returns 案件详情数据
 */
export async function getCaseDetail(product: string, id: number): Promise<CaseDetail> {
  const response = await adapundiInstance.get(
    `/hive-collection-admin/cases/${product}/${id}/detail`
  );
  return response as unknown as CaseDetail;
}
