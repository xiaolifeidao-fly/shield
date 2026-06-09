import { AxiosInstance } from 'axios';
import { BaseBusinessApi } from '../../common/base.api';
import { Case, CaseDetail, CasePageParams, CasePageResponse, CustomerInfo, LoanPlan } from '../../common/entities';
import { BusinessType, UserInfo } from '@model/user.types';
import { getCurrentUser, setCurrentUser, ukuInstance } from './uku.axios';
import { writeCase } from '@src/business/adapundi/api/writeCase.api';
import log from '@src/utils/logger';
import { updateUserAuthCookie } from '@src/utils/store/mysql-store';
import { login as ukuLogin } from './login.api';

interface UkuColCaseItem {
  id: string;
  orderId?: string;
  orderNo?: string;
  customerId?: string;
  customerName?: string;
  customerIdCardNo?: string;
  customerCellPhone?: string;
  orderStatus?: string;
  caseStatus?: string;
  product?: string;
  appId?: string;
  businessId?: string;
  channel?: string;
  approvedPrincipal?: number;
  approvedAmount?: number;
  totalAmount?: number;
  approvedPeriod?: number;
  approvedDate?: string;
  dueDate?: string;
  lateDate?: string;
  lateDay?: number;
  allotDate?: string;
  followDate?: string;
  orgId?: number;
  groupId?: number;
  groupName?: string;
  collectorId?: number;
  collectorName?: string;
  allotorId?: number;
  allotorName?: string;
  promiseStatus?: string;
  updateTime?: string;
  createTime?: string;
  remark?: string;
  isLostContact?: string;
  totalTerm?: number;
  termLength?: number;
  currentTerm?: string;
  scheduleId?: string;
  orgName?: string;
  collectionNumber?: number;
  mainCaseId?: number;
  sortCaseId?: number;
}

interface UkuCaseGroup {
  customerIdCardNo?: string;
  customerName?: string;
  mainCaseId?: number;
  colCaseList?: UkuColCaseItem[];
}

interface UkuListResponse {
  page?: number;
  total?: number;
  records?: number;
  rows?: UkuCaseGroup[];
}

interface UkuCaseDetailResponse {
  detailMap?: Record<string, any>;
  colCaseVo?: UkuColCaseItem;
  repayData?: Record<string, any>;
  customerCaseVO?: Record<string, any>;
  supportPartialPay?: boolean;
}

type UkuCase = Case & {
  orderNo?: string;
  idNo?: string;
  approvedAmount?: number;
  approvedPrincipal?: number;
  totalTerm?: number;
  currentTerm?: string;
  scheduleId?: string;
  orgName?: string;
  __raw?: UkuColCaseItem;
  __detail?: UkuCaseDetailResponse;
};

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toSafeInteger(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isSafeInteger(num) ? num : fallback;
}

function toDateString(value: string | null | undefined): string {
  return value || '';
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return 0;
}

function getDetailMap(detail?: UkuCaseDetailResponse): Record<string, any> {
  return detail?.detailMap || {};
}

function getRepayData(detail?: UkuCaseDetailResponse): Record<string, any> {
  return detail?.repayData || detail?.detailMap?.repayData || {};
}

function getBaseFeeModel(detail?: UkuCaseDetailResponse): Record<string, any> {
  return getRepayData(detail).baseFeeModel || {};
}

function getPayloadCustomerId(caseItem: UkuCase, detail?: UkuCaseDetailResponse): number {
  const raw = detail?.colCaseVo || caseItem.__raw;
  return (raw?.customerId || detail?.detailMap?.customerId || caseItem.customerId) as unknown as number;
}

function mapUkuItemToCase(item: UkuColCaseItem, username?: string): UkuCase {
  const id = toSafeInteger(item.id || item.mainCaseId || item.orderId);
  const customerId = toSafeInteger(item.customerId, id);
  const overdueDay = toNumber(item.lateDay);
  const totalAmount = toNumber(item.totalAmount);
  const approvedPrincipal = toNumber(item.approvedPrincipal);
  const approvedAmount = toNumber(item.approvedAmount);

  return {
    id,
    caseId: item.orderNo || item.id || String(id),
    fullName: item.customerName || '',
    customerType: null,
    product: item.product || 'UKU',
    status: item.promiseStatus || item.caseStatus || item.orderStatus || null,
    mobile: item.customerCellPhone || '',
    trigger: item.promiseStatus || null,
    customerId,
    groupId: toNumber(item.groupId),
    level: item.groupName || null,
    amount: totalAmount,
    principleAmount: approvedPrincipal || approvedAmount,
    distributedDay: 0,
    overdueDay,
    reviewerId: item.collectorId ?? null,
    reviewerName: item.collectorName || username || null,
    createTime: toDateString(item.createTime || item.allotDate || item.updateTime),
    lastLogCreateTime: item.followDate || null,
    customerTag: item.caseStatus || null,
    customerSysTag: item.isLostContact || null,
    teamLeaderName: item.allotorName || null,
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
    channel1: item.channel || null,
    channel2: item.appId || null,
    phoneRemarkContent: null,
    waRemarkContent: null,
    dueDate: item.dueDate || null,
    todoFlag: false,
    queue: item.orderStatus || null,
    smsEventStatus: null,
    latestSmsSendSuccessTime: null,
    loanTag: item.remark || null,
    vipLevel: null,
    postLoanPreReminderLevel: null,
    overdueInstitutionLevel: null,
    applyPlatform: null,
    installPlatform: null,
    lastLoginPlatform: null,
    allowDownloadCollectionLetter: false,
    waitCall: false,
    inCollectionDays: overdueDay,
    isTadpole: false,
    orderNo: item.orderNo,
    idNo: item.customerIdCardNo,
    approvedAmount,
    approvedPrincipal,
    totalTerm: item.totalTerm,
    currentTerm: item.currentTerm,
    scheduleId: item.scheduleId,
    orgName: item.orgName,
    __raw: item,
  };
}

function mapUkuCaseToCaseDetail(caseItem: UkuCase, detail?: UkuCaseDetailResponse): CaseDetail {
  const detailMap = getDetailMap(detail);
  const raw = detail?.colCaseVo || caseItem.__raw;
  const baseFeeModel = getBaseFeeModel(detail);
  const repayData = getRepayData(detail);
  const principalAmount = pickNumber(baseFeeModel.principal, detailMap.principal, raw?.approvedPrincipal, caseItem.principleAmount);
  const interestAmount = pickNumber(baseFeeModel.interest, detailMap.interest);
  const punishmentAmount = pickNumber(baseFeeModel.lateFee, detailMap.lateFee, baseFeeModel.latePenaltyFee, detailMap.latePenaltyFee);
  const vatAmount = pickNumber(baseFeeModel.vatFee, detailMap.vatFee);
  const explicitTotalAmount = pickNumber(repayData.totalAmount, detailMap.totalAmount, raw?.totalAmount, caseItem.amount);
  const expireAmount = explicitTotalAmount || principalAmount + interestAmount + punishmentAmount + vatAmount;
  const loanAmount = pickNumber(raw?.approvedPrincipal, raw?.approvedAmount, detailMap.principal, principalAmount);
  const approvedAmount = toNumber(raw?.approvedAmount);

  return {
    id: raw?.id || String(caseItem.id),
    caseId: raw?.orderNo || caseItem.caseId,
    orderNo: raw?.orderNo || caseItem.orderNo,
    trigger: caseItem.trigger,
    email: pickString(detailMap.email),
    idNo: raw?.customerIdCardNo || caseItem.idNo || pickString(detailMap.idCardNo),
    level: raw?.groupName || caseItem.level || pickString(detailMap.level) || null,
    fullName: pickString(detailMap.idCardName, raw?.customerName, caseItem.fullName) || '',
    mobile: pickString(detailMap.cellPhone, raw?.customerCellPhone, caseItem.mobile) || '',
    customerId: getPayloadCustomerId(caseItem, detail),
    overdueDay: pickNumber(detailMap.lateDay, raw?.lateDay, caseItem.overdueDay),
    terms: pickNumber(detailMap.totalTerm, raw?.totalTerm) || undefined,
    reviewerId: raw?.collectorId ?? caseItem.reviewerId,
    reviewerName: raw?.collectorName || caseItem.reviewerName,
    customerTag: raw?.caseStatus || caseItem.customerTag,
    riskGrade: pickString(detailMap.riskLabel) || null,
    clearedNumber: 0,
    tags: pickString(detailMap.specialMark, raw?.remark) || '',
    channel1: raw?.channel || caseItem.channel1,
    channel2: raw?.appId || caseItem.channel2,
    gender: pickString(detailMap.gender) || null,
    dueDate: pickString(detailMap.dueDate, raw?.dueDate, caseItem.dueDate) || null,
    loanTag: pickString(detailMap.loanTag, raw?.promiseStatus, caseItem.loanTag) || null,
    postLoanPreReminderLevel: null,
    overdueInstitutionLevel: pickString(detailMap.level) || null,
    isMinPay: null,
    isInstallmentPay: null,
    minPayBillId: null,
    installmentBillId: null,
    customerClikInfo: null,
    vaList: null,
    tadpoleCount: '0',
    tadpoleAmount: '0',
    riskScoreAndLevel: null,
    amount: expireAmount,
    principleAmount: principalAmount,
    interestAmount,
    punishmentAmount,
    vatAmount,
    distributedDay: 0,
    expireAmount,
    expirePrincipleAmount: principalAmount,
    expireInterestAmount: interestAmount,
    expirePunishmentAmount: punishmentAmount,
    expireVatAmount: vatAmount,
    penaltyInterest: pickNumber(detailMap.lateInterestsFee),
    otherFee: pickNumber(detailMap.managementFee, detailMap.serviceFee, detailMap.auditFee, detailMap.oneTimeFee),
    overdueInterest: pickNumber(detailMap.overdueFee),
    backupMobile: pickString(detailMap.obligatePhone) || '',
    createTime: raw?.createTime || caseItem.createTime,
    whatsUpNum: pickString(detailMap.cellPhone, raw?.customerCellPhone, caseItem.mobile) || null,
    loanAmount: loanAmount || approvedAmount || null,
    paidAmount: 0,
    loanTime: pickString(detailMap.approvedDate, raw?.approvedDate) || null,
    bankCode: pickString(detailMap.bankCode, detailMap.bankName) || null,
    accountNumber: pickString(detailMap.accountNumber) || null,
    productName: pickString(detailMap.productName, raw?.product, caseItem.product) || null,
    officeIndustry: pickString(detailMap.industryInvolved) || null,
  };
}

function mapUkuCaseToCustomerInfo(caseItem: UkuCase, detail?: UkuCaseDetailResponse): CustomerInfo {
  const detailMap = getDetailMap(detail);
  const raw = detail?.colCaseVo || caseItem.__raw;
  return {
    fullName: pickString(detailMap.idCardName, raw?.customerName, caseItem.fullName) || '',
    customerId: getPayloadCustomerId(caseItem, detail),
    mobile: pickString(detailMap.cellPhone, raw?.customerCellPhone, caseItem.mobile) || '',
    credentialNo: raw?.customerIdCardNo || caseItem.idNo || pickString(detailMap.idCardNo) || '',
    gender: pickString(detailMap.gender) || '',
    province: '',
    city: pickString(detailMap.city) || '',
    district: '',
    area: '',
    address: pickString(detailMap.permanentAddress, detailMap.currentDetailAddress, detailMap.currentAddress, detailMap.idCardAddress) || '',
    maritalStatus: pickString(detailMap.maritalStatus) || '',
    backupMobile: pickString(detailMap.obligatePhone) || '',
    familyNameInLaw: '',
    childrenNum: Number.isFinite(Number(detailMap.childNum)) ? Number(detailMap.childNum) : null,
    education: pickString(detailMap.education) || '',
    email: pickString(detailMap.email) || '',
    customerSysTag: raw?.isLostContact || null,
    newProvince: null,
    newCity: null,
    newDistrict: null,
    newArea: null,
    lastLoginTime: '',
    channel1: raw?.channel || '',
    channel2: raw?.appId || '',
    facebookId: pickString(detailMap.facebookAccount) || '',
    credentialType: '',
    birthday: pickString(detailMap.idCardBirthday) || '',
    ktpOcrAddress: pickString(detailMap.idCardAddress) || '',
    companyName: pickString(detailMap.companyName) || null,
    workCity: pickString(detailMap.city) || null,
    officeAddress: pickString(detailMap.companyAddress) || null,
    officeNumber: pickString(detailMap.companyPhone) || null,
    job: pickString(detailMap.positionType) || null,
  };
}

export class UkuBusinessApi extends BaseBusinessApi<UkuCase> {
  private authCookie: string | null = null;

  getAxiosInstance(): AxiosInstance {
    return ukuInstance;
  }

  setCurrentUser(userInfo: UserInfo | null): void {
    setCurrentUser(userInfo);
  }

  getCurrentUser(): UserInfo | null {
    return getCurrentUser();
  }

  private async ensureLogin(): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('未找到当前用户信息');
    }

    if (this.authCookie) {
      user.authCookie = this.authCookie;
      setCurrentUser(user);
      return;
    }

    if (user.authCookie) {
      this.authCookie = user.authCookie;
      return;
    }

    const loginResult = await ukuLogin(user);
    if (!loginResult.success || !loginResult.cookie) {
      throw new Error(`UKU 登录失败: ${loginResult.message || '未获取到 Cookie'}`);
    }

    this.authCookie = loginResult.cookie;
    const updatedUser = { ...user, authCookie: loginResult.cookie };
    setCurrentUser(updatedUser);
    await updateUserAuthCookie(user.username, loginResult.cookie);
    log.info(`[UKU] auth cookie saved for ${user.username}`);
  }

  async getCasePage(params: CasePageParams): Promise<CasePageResponse<UkuCase>> {
    await this.ensureLogin();
    const page = params.pageNum ?? 1;
    const rows = params.pageSize ?? 20;
    const { pageNum, pageSize, enableDeduplication, enableResume, ...restParams } = params as any;
    const requestParams: Record<string, any> = {
      page,
      rows,
      queue: 'COLLECTION',
      assistSearch: 'false',
      minLateDay: '',
      maxLateDay: '',
      minDueDate: '',
      maxDueDate: '',
      minAllotDate: '',
      maxAllotDate: '',
      minLateDate: '',
      maxLateDate: '',
      minFollowDate: '',
      maxFollowDate: '',
      minApprovedPrincipal: '',
      maxApprovedPrincipal: '',
      minCreateDate: '',
      maxCreateDate: '',
      minCollectionNum: '',
      maxCollectionNum: '',
      ...restParams,
    };
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(requestParams)) {
      if (value !== undefined && value !== null) {
        body.append(key, String(value));
      }
    }

    log.info(`[UKU] list request page=${page} rows=${rows}`);
    const response = await ukuInstance.post<UkuListResponse>('/colCase/listColCase-new', body);
    const data = response as unknown as UkuListResponse;
    const records = (data.rows || []).flatMap((group) => group.colCaseList || []);
    const username = this.getCurrentUser()?.username;
    const totalRecords = toNumber(data.records ?? records.length);
    const totalPages = toNumber(data.total ?? Math.ceil(totalRecords / rows));
    log.info(`[UKU] list response page=${data.page || page} totalRecords=${totalRecords} rows=${records.length}`);

    return {
      records: records.map((item) => mapUkuItemToCase(item, username)),
      total: totalRecords,
      size: rows,
      current: page,
      orders: [],
      optimizeCountSql: false,
      searchCount: true,
      countId: null,
      maxLimit: null,
      pages: totalPages,
    };
  }

  async getCaseDetails(product: string, caseItem: UkuCase): Promise<CaseDetail[]> {
    const mainCaseId = caseItem.__raw?.mainCaseId || caseItem.__raw?.id || caseItem.id;
    try {
      const response = await ukuInstance.get<UkuCaseDetailResponse>(`/caseDetail/skipToCaseDetail-new/${mainCaseId}`);
      const detail = response as unknown as UkuCaseDetailResponse;
      caseItem.__detail = detail;
      return [mapUkuCaseToCaseDetail(caseItem, detail)];
    } catch (error) {
      log.warn(`[UKU] get case detail failed mainCaseId=${mainCaseId}, fallback to list data`, error);
      return [mapUkuCaseToCaseDetail(caseItem)];
    }
  }

  async getCustomerInfo(product: string, caseItem: UkuCase): Promise<CustomerInfo> {
    return mapUkuCaseToCustomerInfo(caseItem, caseItem.__detail);
  }

  async getLoanPlan(customerId: number): Promise<LoanPlan[]> {
    return [];
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
    await writeCase(caseDetail, loanPlan, customerInfo, businessType, getCurrentUser());
  }
}
