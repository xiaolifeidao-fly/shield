import { katInstance } from "./kat.axios";
import { Case, CasePageParams, CasePageResponse, CaseDetail } from "../../common/entities";

/**
 * 导出公共实体类型（保持向后兼容）
 */
export type { Case, CasePageParams, CasePageResponse, CaseDetail };

/**
 * KAT 特定的案例响应结构
 */
interface KatCasePageResponse {
  data: any[];
  page: number;
  page_size: number;
  total_count: number;
  total_page: number;
  total_unpaid: number;
}

/**
 * KAT 案例详情响应
 */
export interface KatCaseDetailResponse {
  app_name?: string;
  birthday?: string;
  cid: string;
  collector?: string;
  company_name?: string;
  customer_name: string;
  cycle_name?: string;
  department?: number;
  due_amount: string;
  due_at?: string;
  early_repayment?: string;
  extension_days?: number;
  follow_up_date?: string | null;
  gender?: string;
  has_first_loan?: number;
  home_address?: string;
  industry?: number;
  job_email?: string;
  job_payroll_cycle?: number;
  job_type?: string;
  label_name?: string | null;
  last_bombing_time?: string;
  late_fee: string;
  live_city?: string;
  loan_success_times?: string;
  mobile_no: string;
  office_address?: string;
  office_number?: string;
  overdue_days: number;
  pay_day?: number;
  ptp_amount?: string;
  ptp_due_date?: string | null;
  reg_number?: string;
  repaid: string;
  residence_duration?: number;
  residence_status?: number;
  uid: string;
  unpaid: string;
  use_coupon?: number;
  user_detail?: {
    ektp_url?: string;
    face_url?: string | null;
    profile_self_url?: string;
  };
  user_name?: string;
  work_city?: string;
}


/**
 * 将 KAT 案例数据转换为通用 Case 格式
 */
function mapKatCaseToCase(katCase: any): Case {
  return {
    id: parseInt(katCase.cid) || 0,
    caseId: katCase.cid || '',
    fullName: katCase.customer_name || '',
    customerType: null,
    product: 'KAT', // KAT 固定产品类型
    status: katCase.status?.toString() || null,
    mobile: katCase.mobile_no || '',
    trigger: null,
    customerId: parseInt(katCase.uid) || 0,
    groupId: katCase.cycle_id || 0,
    level: null,
    amount: parseFloat(katCase.unpaid || '0'),
    principleAmount: 0,
    distributedDay: 0,
    overdueDay: katCase.overdue_days || 0,
    reviewerId: null,
    reviewerName: katCase.collector || null,
    createTime: katCase.entry_date || '',
    lastLogCreateTime: null,
    customerTag: null,
    customerSysTag: null,
    teamLeaderName: null,
    lastSevenCount: null,
    riskGrade: katCase.robot_result || null,
    clearedNumber: 0,
    outCallTaskConfigId: 0,
    outCallTaskName: null,
    outCallTaskStrategyId: null,
    outCallTaskCode: null,
    outCallTaskStatus: null,
    predictOutCallTaskId: null,
    lastLoginTime: null,
    channel1: null,
    channel2: null,
    phoneRemarkContent: null,
    waRemarkContent: null,
    dueDate: null,
    todoFlag: false,
    queue: null,
    smsEventStatus: null,
    latestSmsSendSuccessTime: null,
    loanTag: null,
    vipLevel: null,
    postLoanPreReminderLevel: null,
    overdueInstitutionLevel: null,
    applyPlatform: null,
    installPlatform: null,
    lastLoginPlatform: null,
    allowDownloadCollectionLetter: false,
    waitCall: false,
    inCollectionDays: 0,
    isTadpole: katCase.is_first_loan === 1,
  };
}

/**
 * 将 KAT 案例详情转换为通用 CaseDetail 格式
 */
function mapKatCaseDetailToCaseDetail(katDetail: KatCaseDetailResponse): CaseDetail {
  return {
    id: katDetail.cid,
    caseId: katDetail.cid,
    trigger: null,
    level: katDetail.cycle_name || null,
    fullName: katDetail.customer_name,
    mobile: katDetail.mobile_no,
    customerId: Number(katDetail.uid) || 0,
    overdueDay: katDetail.overdue_days,
    reviewerId: null,
    reviewerName: katDetail.collector || null,
    customerTag: null,
    riskGrade: null,
    clearedNumber: 0,
    tags: '',
    channel1: null,
    channel2: null,
    gender: katDetail.gender || null,
    dueDate: katDetail.due_at || null,
    loanTag: null,
    postLoanPreReminderLevel: null,
    overdueInstitutionLevel: null,
    isMinPay: null,
    isInstallmentPay: null,
    minPayBillId: null,
    installmentBillId: null,
    customerClikInfo: null,
    vaList: null,
    tadpoleCount: '0',
    tadpoleAmount: '0',
    riskScoreAndLevel: null,
    amount: parseFloat(katDetail.unpaid || '0'),
    principleAmount: 0,
    interestAmount: 0,
    punishmentAmount: parseFloat(katDetail.late_fee || '0'),
    vatAmount: 0,
    distributedDay: 0,
    expireAmount: parseFloat(katDetail.due_amount || '0'),
    expirePrincipleAmount: 0,
    expireInterestAmount: 0,
    expirePunishmentAmount: 0,
    expireVatAmount: 0,
    backupMobile: '',
    createTime: '',
    whatsUpNum: null,
    loanAmount: null,
    paidAmount: 0,
    loanTime: null,
    bankCode: null,
    accountNumber: null,
  };
}

/**
 * 获取案例分页列表
 * @param params 查询参数
 * @returns 分页响应数据
 */
export async function getCasePage(params: CasePageParams = {}): Promise<CasePageResponse> {
  const { pageNum = 1, pageSize = 100, ...restParams } = params;
  
  // 构建 KAT API 的请求参数
  const requestData = {
    type: params.type,
    order: "",
    page: pageNum,
    page_size: pageSize,
    search: {
      cid: "",
      uid: "",
      customer_name: null,
      phone: "",
      app_name: null,
      overdue_days: "",
      is_installment: null,
      is_first_loan: null,
      robot_result: "",
      merchant_name: null,
      last_phone_status: null,
      staff_id: "",
      ...restParams,
    }
  };

  const response = await katInstance.post("/api/team/collections", requestData);
  const katResponse = response as unknown as KatCasePageResponse;

  // 转换为通用格式
  return {
    records: katResponse.data.map(mapKatCaseToCase),
    total: katResponse.total_count,
    size: katResponse.page_size,
    current: katResponse.page,
    orders: [],
    optimizeCountSql: true,
    searchCount: true,
    countId: null,
    maxLimit: null,
    pages: katResponse.total_page,
  };
}

/**
 * 获取案件详情
 * @param product 产品类型（KAT 中不使用，保持接口一致）
 * @param cid 案件ID
 * @returns 案件详情数据
 */
export async function getCaseDetail(product: string, cid: string): Promise<CaseDetail> {
  const response = await katInstance.get(`/api/detail?cid=${cid}`);
  const katDetail = response as unknown as KatCaseDetailResponse;
  return mapKatCaseDetailToCaseDetail(katDetail);
}

