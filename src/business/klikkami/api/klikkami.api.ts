import { BusinessType, UserInfo } from '@model/user.types';
import { Case, CaseDetail, CasePageParams, CasePageResponse, CustomerInfo, LoanPlan } from '../../common/entities';
import { BaseBusinessApi } from '../../common/base.api';
import { klikkamiInstance, setCurrentUser as setKlikKamiCurrentUser, getCurrentUser as getKlikKamiCurrentUser } from './klikkami.axios';

export interface KlikKamiCaseItem {
  id: string;
  group_id: string;
  operator_id: string;
  user_id: string;
  name: string;
  phone: string;
  id_no: string;
  email: string;
  is_old_user: string;
  apply_count: string;
  total_amount: string;
  instalment_amount: string;
  total_repaid_amount: string;
  max_overdue_days: string;
  collection_status: string;
  last_follow_time: string;
  remark: string;
  phone_remark: string;
  wa_remark: string | null;
  work_status: string;
  created_at: string;
  updated_at: string;
  operator_name: string;
  group_name: string;
  work_status_desc: string;
}

export interface KlikKamiListResponse {
  total: number;
  items: KlikKamiCaseItem[];
}

export interface KlikKamiDetailResponse {
  work: {
    name: string;
    phone: string;
    id_no: string;
    email: string;
    total_amount: string;
    total_repaid_amount: string;
    collection_status: string;
    last_follow_time: string;
    remark: string;
    wa_remark: string | null;
  };
  orders: Array<{
    id: string;
    wid: string;
    user_id: string;
    order_no: string;
    loan_val: string;
    loan_daycount: string;
    current_end_time: string;
    current_repay_amount: string;
    current_instalment_amount: string;
    penalty: string;
    repaid_amount: string;
    current_term: string;
    loan_status: string;
    repaid_time: string | null;
    rollover_amount: string | null;
    overdue_days: string;
    lender: string;
    valid: string;
    created_at: string;
    updated_at: string;
    is_owner: string;
    loan_starttime: string;
    plan: Array<{
      order_no: string;
      term: string;
      repay_end_time: string;
      repay_amount: string;
      status: string;
      repaid_time: string | null;
      repaid_val: string;
      penalty: string;
      overdue_day: string;
    }>;
  }>;
  repayment: any[];
}

function normalizeCurrency(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const normalized = value.replace(/[^0-9.-]/g, '');
  return Number(normalized) || 0;
}

function mapKlikKamiCaseToCase(item: KlikKamiCaseItem): Case & { __raw?: KlikKamiCaseItem } {
  return {
    id: Number(item.id) || 0,
    caseId: item.id || '',
    fullName: item.name || '',
    customerType: null,
    product: 'KLIKKAMI',
    status: item.collection_status || null,
    mobile: item.phone || '',
    trigger: null,
    customerId: Number(item.user_id) || 0,
    groupId: Number(item.group_id) || 0,
    level: item.group_name || null,
    amount: normalizeCurrency(item.total_amount),
    principleAmount: normalizeCurrency(item.total_amount),
    distributedDay: 0,
    overdueDay: Number(item.max_overdue_days) || 0,
    reviewerId: Number(item.operator_id) || null,
    reviewerName: item.operator_name || null,
    createTime: item.created_at || '',
    lastLogCreateTime: item.last_follow_time || null,
    customerTag: null,
    customerSysTag: null,
    teamLeaderName: null,
    lastSevenCount: null,
    riskGrade: null,
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
    phoneRemarkContent: item.phone_remark || null,
    waRemarkContent: item.wa_remark || null,
    dueDate: null,
    todoFlag: false,
    queue: item.work_status || null,
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
    isTadpole: item.is_old_user === '0',
    __raw: item,
  };
}

function mapKlikKamiDetailToCaseDetail(detail: KlikKamiDetailResponse, item: KlikKamiCaseItem | undefined, caseItem?: Case): CaseDetail {
  const work = detail.work;
  const overdueDay = Number(item?.max_overdue_days) || caseItem?.overdueDay || 0;
  return {
    id: item?.id || caseItem?.caseId || '',
    caseId: item?.id || caseItem?.caseId || '',
    trigger: null,
    level: item?.group_name || caseItem?.level || null,
    fullName: work?.name || item?.name || caseItem?.fullName || '',
    mobile: work?.phone || item?.phone || caseItem?.mobile || '',
    customerId: Number(item?.id || caseItem?.caseId || 0),
    overdueDay,
    reviewerId: Number(item?.operator_id) || caseItem?.reviewerId || null,
    reviewerName: item?.operator_name || caseItem?.reviewerName || null,
    customerTag: null,
    riskGrade: null,
    clearedNumber: 0,
    tags: work?.remark || '',
    channel1: null,
    channel2: null,
    gender: null,
    dueDate: null,
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
    amount: normalizeCurrency(work?.total_amount),
    principleAmount: normalizeCurrency(work?.total_amount),
    interestAmount: 0,
    punishmentAmount: 0,
    vatAmount: 0,
    distributedDay: 0,
    expireAmount: normalizeCurrency(work?.total_amount),
    expirePrincipleAmount: normalizeCurrency(work?.total_amount),
    expireInterestAmount: 0,
    expirePunishmentAmount: 0,
    expireVatAmount: 0,
    backupMobile: '',
    createTime: item?.created_at || caseItem?.createTime || '',
    whatsUpNum: null,
    loanAmount: null,
    paidAmount: normalizeCurrency(work?.total_repaid_amount),
    loanTime: item?.created_at || caseItem?.createTime || null,
    bankCode: null,
    accountNumber: null,
    productName: 'Klik Kami',
  };
}

function mapKlikKamiDetailToCustomerInfo(detail: KlikKamiDetailResponse, item: KlikKamiCaseItem | undefined, caseItem?: Case): CustomerInfo {
  const work = detail.work;
  return {
    fullName: work?.name || item?.name || caseItem?.fullName || '',
    customerId: Number(item?.user_id || caseItem?.customerId || 0),
    mobile: work?.phone || item?.phone || caseItem?.mobile || '',
    credentialNo: work?.id_no || item?.id_no || '',
    gender: '',
    province: '',
    city: '',
    district: '',
    area: '',
    address: '',
    maritalStatus: '',
    backupMobile: '',
    familyNameInLaw: '',
    childrenNum: null,
    education: '',
    email: work?.email || item?.email || '',
    customerSysTag: null,
    newProvince: null,
    newCity: null,
    newDistrict: null,
    newArea: null,
    lastLoginTime: '',
    channel1: '',
    channel2: '',
    facebookId: '',
    credentialType: '',
    birthday: '',
    ktpOcrAddress: '',
    companyName: null,
    workCity: null,
    officeAddress: null,
    officeNumber: null,
    job: null,
  };
}

function mapKlikKamiDetailToLoanPlan(detail: KlikKamiDetailResponse): LoanPlan[] {
  const plans: LoanPlan[] = [];
  const orders = detail.orders || [];
  for (const order of orders) {
    const planList = order.plan || [];
    for (const plan of planList) {
      plans.push({
        id: Number(order.id) || 0,
        loanType: order.loan_status || '',
        status: plan.status || '',
        loanSubType: order.lender || '',
        amount: normalizeCurrency(order.loan_val),
        interestRate: 0,
        duration: order.loan_daycount || '',
        period: Number(plan.term) || 0,
        periodsNumber: Number(order.current_term) || 0,
        periodUnit: 'day',
        dueAmount: normalizeCurrency(plan.repay_amount),
        minDueDate: plan.repay_end_time || null,
        overdueDays: Number(plan.overdue_day) || 0,
        gracePeriodRate: 0,
        collectionLevel: null,
        principalAmount: normalizeCurrency(order.loan_val),
        interestAmount: 0,
        defaultAmount: normalizeCurrency(plan.penalty),
        vatAmount: 0,
        shouldRepaymentAmount: normalizeCurrency(plan.repay_amount),
        creditQuality: '',
        platform: 'Klik Kami',
        rolloverType: null,
        esignFlag: false,
      });
    }
  }
  return plans;
}

export class KlikKamiBusinessApi extends BaseBusinessApi<Case> {
  getAxiosInstance() {
    return klikkamiInstance;
  }

  setCurrentUser(userInfo: UserInfo | null): void {
    setKlikKamiCurrentUser(userInfo);
  }

  getCurrentUser(): UserInfo | null {
    return getKlikKamiCurrentUser();
  }

  async getCasePage(params: CasePageParams): Promise<CasePageResponse<Case>> {
    const page = params.pageNum ?? 1;
    const limit = params.pageSize ?? 100;
    const { pageNum, pageSize, enableDeduplication, enableResume, ...restParams } = params as any;
    const requestData = {
      page,
      limit,
      real_name: '',
      phone: '',
      id_no: '',
      operator_id: '',
      group_id: '',
      work_status: 'in_progress',
      collect_result: null,
      last_follow_time: [],
      repaid_time: [],
      sort: 'id-desc',
      ...restParams,
    } as any;

    const logPayload = { ...requestData };
    logPayload.password = undefined;
    logPayload.authCookie = undefined;
    const logger = (await import('@src/utils/logger')).default;
    logger.info(`[KlikKami] list request page=${page} limit=${limit} params=${JSON.stringify(requestData)}`);
    const ret = await klikkamiInstance.post<KlikKamiListResponse>('/indonesia_admin/collection/collection_work_v2', requestData);
    const response = ret as unknown as KlikKamiListResponse;

    logger.info(`[KlikKami] list response total=${response.total || 0} items=${response.items?.length || 0}`);
    return {
      records: (response.items || []).map(mapKlikKamiCaseToCase),
      total: response.total || 0,
      size: limit,
      current: page,
      orders: [],
      optimizeCountSql: false,
      searchCount: true,
      countId: null,
      maxLimit: null,
      pages: Math.ceil((response.total || 0) / limit),
    };
  }

  async getCaseDetails(product: string, caseItem: Case): Promise<CaseDetail[]> {
    const raw = (caseItem as any).__raw as KlikKamiCaseItem | undefined;
    const wid = raw?.id || caseItem.caseId;
    const logger = (await import('@src/utils/logger')).default;
    logger.info(`[KlikKami] detail request wid=${wid}`);
    const ret = await klikkamiInstance.post<KlikKamiDetailResponse>('/indonesia_admin/collection/collection_orders_v2', {
      wid,
    });
    const detail = ret as unknown as KlikKamiDetailResponse;
    logger.info(`[KlikKami] detail response wid=${wid} orders=${detail.orders?.length || 0}`);
    if (detail?.work) {
      const workLog = {
        name: detail.work.name,
        phone: detail.work.phone,
        id_no: detail.work.id_no,
        total_amount: detail.work.total_amount,
        total_repaid_amount: detail.work.total_repaid_amount,
        collection_status: detail.work.collection_status,
        last_follow_time: detail.work.last_follow_time,
        remark: detail.work.remark,
      };
      logger.info(`[KlikKami] detail work wid=${wid} data=${JSON.stringify(workLog)}`);
    }
    if (detail?.orders?.length) {
      const orderLog = detail.orders.map((o) => ({
        id: o.id,
        wid: o.wid,
        order_no: o.order_no,
        loan_val: o.loan_val,
        loan_daycount: o.loan_daycount,
        current_repay_amount: o.current_repay_amount,
        current_instalment_amount: o.current_instalment_amount,
        penalty: o.penalty,
        repaid_amount: o.repaid_amount,
        overdue_days: o.overdue_days,
        loan_status: o.loan_status,
      }));
      logger.info(`[KlikKami] detail orders wid=${wid} data=${JSON.stringify(orderLog)}`);
    }
    return [mapKlikKamiDetailToCaseDetail(detail, raw, caseItem)];
  }

  async getCustomerInfo(product: string, caseItem: Case): Promise<CustomerInfo> {
    const raw = (caseItem as any).__raw as KlikKamiCaseItem | undefined;
    const wid = raw?.id || caseItem.caseId;
    const ret = await klikkamiInstance.post<KlikKamiDetailResponse>('/indonesia_admin/collection/collection_orders_v2', {
      wid,
    });
    const detail = ret as unknown as KlikKamiDetailResponse;
    return mapKlikKamiDetailToCustomerInfo(detail, raw, caseItem);
  }

  async getLoanPlan(customerId: number): Promise<LoanPlan[]> {
    const ret = await klikkamiInstance.post<KlikKamiDetailResponse>('/indonesia_admin/collection/collection_orders_v2', {
      wid: String(customerId),
    });
    const detail = ret as unknown as KlikKamiDetailResponse;
    return mapKlikKamiDetailToLoanPlan(detail);
  }

  async decryptPhone(): Promise<string | undefined> {
    return undefined;
  }

  async writeCase(
    caseDetail: CaseDetail,
    loanPlan: LoanPlan[],
    customerInfo: CustomerInfo,
    businessType: BusinessType | undefined
  ): Promise<void> {
    const { writeCase } = await import('@src/business/adapundi/api/writeCase.api');
    await writeCase(caseDetail, loanPlan, customerInfo, businessType);
  }

  // 由 getLoanPlan 处理还款计划
}
