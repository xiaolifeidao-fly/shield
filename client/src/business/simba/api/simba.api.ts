import { AxiosInstance } from 'axios';
import { BaseBusinessApi } from '../../common/base.api';
import { CasePageParams, CasePageResponse, CaseDetail, LoanPlan, CustomerInfo, Case, LoanDetail } from '../../common/entities';
import { UserInfo, BusinessType } from '@eleapi/user/user.api';
import { getCurrentUser, setCurrentUser } from '../../adapundi/api/adapundi.axios';
import { getGlobal, setGlobal } from '@utils/store/electron';
import { mysqlStore } from '@utils/store/mysql.store';
import log from 'electron-log';
import { login as simbaLogin } from './login.api';
import { writeCase } from '@src/business/adapundi/api/writeCase.api';

const SIMBA_BASE_URL = 'https://collection.cairin.id';
const SIMBA_API_BASE = `${SIMBA_BASE_URL}/xapi/v1`;

function getFirstSyncKey(username: string): string {
  return `simba_is_first_sync_${username}`;
}

/**
 * Simba Case 接口
 */
export interface SimbaCase extends Case {
  orderNumber?: string;
  ptpStatus?: string | null;
  otherPlatformActiveLoanCount?: number;
  waNumber?: string | null;
  email?: string | null;
  dpd?: number;
  collectionLevel?: string | null;
  penaltyAmount?: number;
  currentDueAmount?: number;
  repaymentAmount?: number;
  remainingAmount?: number;
  sensitivity?: string | null;
  waIntentionLevel?: string | null;
  plan?: string | null;
  assignedBy?: string | null;
  assignedAt?: string | null;
  lastFollowedUpDate?: string | null;
  userName?: string | null; // 催收员名称，如 "Ex-KAT-90+(NC)-AA: KAT002"
  userNo?: string | null;   // 催收员编号，如 "KAT002"
  // fieldJson 字段
  bankName?: string | null;
  collectorName?: string | null;
  productName?: string | null;
  principleAmountOriginal?: string | null;
  interestAmount?: number;
  principleAmountDue?: number;
  interestDue?: number;
  totalAmountDue?: number;
}

interface SimbaCaseInfo {
  caseBaseInfoVO: any;
  caseRepayDataVO: {
    pendingRecallList: any[];
    pendingAllList: any[];
    repayCompletedList: any[];
  };
}

export class SimbaBusinessApi extends BaseBusinessApi<SimbaCase> {
  private cookie: string | null = null;

  // 存储 case info 数据，key 为 caseId
  private caseInfoMap: Map<string, SimbaCaseInfo> = new Map();

  getLoanPlan(customerId: number): Promise<LoanPlan[]> {
    const caseId = String(customerId);
    const caseInfo = this.caseInfoMap.get(caseId);
    if (caseInfo?.caseRepayDataVO?.pendingRecallList) {
      return Promise.resolve(this.buildLoanPlansFromRecallList(caseInfo.caseRepayDataVO.pendingRecallList));
    }
    return Promise.resolve([]);
  }

  /**
   * 从 pendingRecallList 构建 LoanPlan 数组
   */
  buildLoanPlansFromRecallList(pendingRecallList: any[]): LoanPlan[] {
    if (!pendingRecallList || pendingRecallList.length === 0) {
      return [];
    }

    return pendingRecallList.map((item: any) => ({
      id: item.period || 0,
      loanType: 'INSTALLMENT',
      status: item.days > 0 ? 'OVERDUE' : 'NORMAL',
      loanSubType: item.productType || '',
      amount: item.loanAmount || 0,
      interestRate: 0,
      duration: String(item.productName || ''),
      period: item.period || 1,
      periodsNumber: item.period || 1,
      periodUnit: 'MONTH',
      dueAmount: item.amount || null,
      minDueDate: item.repayDate || null,
      overdueDays: item.days || 0,
      gracePeriodRate: 0,
      collectionLevel: null,
      principalAmount: item.outstandingPrincipal || 0,
      interestAmount: item.outstandingInterest || 0,
      defaultAmount: item.outstandingOverduePenalty || 0,
      vatAmount: item.outstandingOperatingTaxExpense || 0,
      shouldRepaymentAmount: item.outstandingTotalAmount || 0,
      creditQuality: '',
      platform: item.bankName || '',
      rolloverType: null,
      esignFlag: false,
    }));
  }

  getCustomerInfo(product: string, caseItem: SimbaCase): Promise<CustomerInfo> {
    const caseId = String(caseItem.id);
    const caseInfo = this.caseInfoMap.get(caseId);
    const baseInfo = caseInfo?.caseBaseInfoVO || {};

    const customerInfo: CustomerInfo = {
      fullName: baseInfo.accountName || caseItem.fullName || '',
      customerId: caseItem.customerId,
      mobile: caseItem.mobile || '',
      credentialNo: baseInfo.personId || '',
      gender: baseInfo.gender === '0' ? 'FEMALE' : baseInfo.gender === '1' ? 'MALE' : '',
      province: '',
      city: '',
      district: '',
      area: '',
      address: baseInfo.homeAddress || '',
      maritalStatus: baseInfo.married || '',
      backupMobile: '',
      familyNameInLaw: '',
      childrenNum: null,
      education: baseInfo.education || '',
      email: caseItem.email || '',
      customerSysTag: caseItem.customerSysTag || null,
      newProvince: null,
      newCity: null,
      newDistrict: null,
      newArea: null,
      lastLoginTime: caseItem.lastLoginTime || '',
      channel1: caseItem.channel1 || '',
      channel2: caseItem.channel2 || '',
      facebookId: '',
      credentialType: '',
      birthday: baseInfo.birthday || '',
      ktpOcrAddress: '',
    };
    return Promise.resolve(customerInfo);
  }

  async getLoanDetail(caseId: string): Promise<LoanDetail | null> {
    return null;
  }

  async getCaseDetail(product: string, caseItem: SimbaCase): Promise<CaseDetail> {
    const caseId = String(caseItem.id);
    // 如果还没有获取过 info，先获取
    if (!this.caseInfoMap.has(caseId)) {
      await this.fetchCaseInfo(caseItem.id);
    }

    const caseInfo = this.caseInfoMap.get(caseId);
    const baseInfo = caseInfo?.caseBaseInfoVO || {};

    return {
      id: caseItem.id,
      caseId: caseItem.caseId || '',
      trigger: caseItem.trigger || null,
      level: caseItem.level || caseItem.collectionLevel || null,
      fullName: baseInfo.accountName || caseItem.fullName || '',
      mobile: caseItem.mobile || '',
      customerId: caseItem.customerId,
      overdueDay: caseItem.overdueDay || caseItem.dpd || 0,
      reviewerId: null,
      reviewerName: caseItem.userNo || caseItem.assignedBy || null,
      customerTag: caseItem.customerTag || null,
      riskGrade: caseItem.riskGrade || null,
      clearedNumber: caseItem.clearedNumber || 0,
      tags: '',
      channel1: caseItem.channel1 || null,
      channel2: caseItem.channel2 || null,
      gender: baseInfo.gender === '0' ? 'FEMALE' : baseInfo.gender === '1' ? 'MALE' : null,
      dueDate: baseInfo.dueDate || caseItem.dueDate || null,
      loanTag: caseItem.loanTag || caseItem.waIntentionLevel || null,
      postLoanPreReminderLevel: caseItem.postLoanPreReminderLevel || null,
      overdueInstitutionLevel: caseItem.overdueInstitutionLevel || null,
      isMinPay: null,
      isInstallmentPay: null,
      minPayBillId: null,
      installmentBillId: null,
      customerClikInfo: null,
      vaList: null,
      tadpoleCount: '0',
      tadpoleAmount: '0',
      riskScoreAndLevel: caseItem.riskGrade || null,
      amount: caseItem.amount || 0,
      principleAmount: caseItem.principleAmount || 0,
      interestAmount: caseItem.interestAmount || 0,
      punishmentAmount: caseItem.penaltyAmount || 0,
      vatAmount: 0,
      distributedDay: caseItem.distributedDay || 0,
      expireAmount: caseItem.amount || 0,
      expirePrincipleAmount: caseItem.principleAmount || 0,
      expireInterestAmount: 0,
      expirePunishmentAmount: caseItem.penaltyAmount || 0,
      expireVatAmount: 0,
      backupMobile: '',
      createTime: caseItem.createTime || new Date().toISOString(),
      whatsUpNum: caseItem.waNumber || null,
      loanAmount: baseInfo.loanAmount || null,
    };
  }

  getAxiosInstance(): AxiosInstance | null {
    return null;
  }

  setCurrentUser(userInfo: UserInfo | null): void {
    setCurrentUser(userInfo as UserInfo);
  }

  getCurrentUser(): UserInfo | null {
    return getCurrentUser();
  }

  private async ensureLogin(): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('未找到当前用户信息');
    }

    const username = user.username;

    // 如果实例中已有 cookie，直接返回
    if (this.cookie) {
      return true;
    }

    // 尝试从持久化存储中读取 cookie
    const savedCookie = getGlobal(`simba_cookie_${username}`);
    if (savedCookie) {
      this.cookie = String(savedCookie);
      log.info(`Simba 从存储中读取 cookie: ${this.cookie}`);
      return true;
    }

    // 执行登录获取 cookie
    const loginResult = await simbaLogin(user, SIMBA_BASE_URL);
    if (!loginResult.success) {
      throw new Error(`登录失败: ${loginResult.message}`);
    }

    // 从登录结果获取 cookie 并持久化保存
    this.cookie = loginResult.cookie || '';
    setGlobal(`simba_cookie_${username}`, this.cookie);
    log.info(`Simba 获取到 cookie: ${this.cookie}`);
    return true;
  }

  /**
   * 获取案件详情信息（info 接口）
   */
  async fetchCaseInfo(caseId: number): Promise<SimbaCaseInfo> {
    await this.ensureLogin();

    const response = await fetch(`${SIMBA_API_BASE}/cases/info?caseId=${caseId}`, {
      method: 'GET',
      headers: {
        'Cookie': this.cookie || '',
      },
    });

    const data = await response.json() as any;
    log.info(`Simba fetchCaseInfo caseId=${caseId} response status=${data.status}`);

    const caseInfo: SimbaCaseInfo = {
      caseBaseInfoVO: data.data?.caseBaseInfoVO || {},
      caseRepayDataVO: {
        pendingRecallList: data.data?.caseRepayDataVO?.pendingRecallList || [],
        pendingAllList: data.data?.caseRepayDataVO?.pendingAllList || [],
        repayCompletedList: data.data?.caseRepayDataVO?.repayCompletedList || [],
      },
    };

    this.caseInfoMap.set(String(caseId), caseInfo);
    return caseInfo;
  }

  /**
   * 获取同步类型（直接从 MySQL 读取，不走缓存）
   * false: 首次同步（全量）
   * true: 增量同步
   */
  private async getIsFirstSync(): Promise<boolean> {
    const user = this.getCurrentUser();
    const username = user?.username || 'default';
    const key = getFirstSyncKey(username);
    const value = await mysqlStore.get(key);
    return value === true || value === 'true';
  }

  private setIsFirstSync(value: boolean): void {
    const user = this.getCurrentUser();
    const username = user?.username || 'default';
    setGlobal(getFirstSyncKey(username), value);
  }

  async getCasePage(params: CasePageParams): Promise<CasePageResponse<SimbaCase>> {
    const { pageNum = 1 } = params;
    const pageSize = 100; // 默认 100

    const user = this.getCurrentUser();
    if (!user || !user.username) {
      throw new Error('未找到当前用户信息');
    }

    // 确保已登录
    await this.ensureLogin();

    // 判断同步类型
    const isFirstSync = await this.getIsFirstSync();
    log.info(`Simba getCasePage isFirstSync=${isFirstSync}`);

    const requestBody: any = {
      action: 3,
      limit: pageSize,
      page: pageNum,
      searchKeyParam: {},
    };

    // 如果不是首次同步，添加增量时间范围
    if (!isFirstSync) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      requestBody.divisionTimeStart = `${formatDate(today)} 00:00:00`;
      requestBody.divisionTimeEnd = `${formatDate(tomorrow)} 23:59:58`;
    }

    try {
      const requestUrl = `${SIMBA_API_BASE}/cases/list`;
      log.info(`Simba getCasePage requestUrl=${requestUrl}, requestBody=${JSON.stringify(requestBody)}`);
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.cookie || '',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json() as any;
      const previewRecords = (data.data?.list || []).slice(0, 3);
      log.info(`Simba getCasePage requestUrl=${requestUrl}, requestBody=${JSON.stringify(requestBody)}, total=${data.data?.total}, previewRecords=${JSON.stringify(previewRecords)}`);

      // 解析响应数据
      const records: SimbaCase[] = (data.data?.list || []).map((item: any) => {
        const fieldJson = item.fieldJson || {};
        return {
          id: item.id,
          caseId: String(item.id),
          fullName: fieldJson.customerName || item.name || '',
          product: fieldJson.productType || null,
          mobile: fieldJson.mobileNo || item.mobile || '',
          customerId: item.id,
          // amount 是总债务 (oTotalAmount)
          amount: parseFloat(fieldJson.oTotalAmount) || item.amount || 0,
          // principleAmount 是贷款本金
          principleAmount: parseFloat(fieldJson.actualLoanAmount) || 0,
          overdueDay: item.overdueDays || 0,
          dpd: item.overdueDays || 0,
          createTime: item.createTime ? new Date(item.createTime).toISOString() : new Date().toISOString(),
          email: fieldJson.email || null,
          // 罚金
          penaltyAmount: parseFloat(fieldJson.oPenalty) || 0,
          // 当前应还金额
          currentDueAmount: parseFloat(fieldJson.dueAmount) || 0,
          // 剩余债务
          remainingAmount: parseFloat(fieldJson.remainDebt) || parseFloat(fieldJson.remainLimit) || 0,
          bankName: fieldJson.bankName || null,
          // 其他字段
          customerSysTag: null,
          channel1: fieldJson.channel || '',
          channel2: '',
          level: null,
          trigger: null,
          collectorName: item.teamName || null,
          collectionLevel: item.bucket || null,
          waIntentionLevel: null,
          sensitivity: null,
          productName: fieldJson.productType || null,
          principleAmountOriginal: fieldJson.oPrincipal || null,
          // 利息 = oInterest
          interestAmount: parseFloat(fieldJson.interest) || parseFloat(fieldJson.oInterest) || 0,
          principleAmountDue: parseFloat(fieldJson.monthlyPrincipal) || 0,
          interestDue: parseFloat(fieldJson.monthlyInterest) || 0,
          totalAmountDue: parseFloat(fieldJson.dueAmount) || 0,
          distributedDay: 0,
          assignedBy: item.userNo || null,
          assignedAt: item.entrustStartTime ? new Date(item.entrustStartTime).toISOString() : null,
          lastFollowedUpDate: item.lastFollowTime ? new Date(item.lastFollowTime).toISOString() : null,
          userName: item.userName || null,
          userNo: item.userNo || null,
          waNumber: null,
          otherPlatformActiveLoanCount: null,
          ptpStatus: null,
        } as unknown as SimbaCase;
      }) || [];

      const total = data.data?.total || records.length;

      return {
        records,
        total,
        size: pageSize,
        current: pageNum,
        orders: [],
        optimizeCountSql: false,
        searchCount: true,
        countId: null,
        maxLimit: null,
        pages: Math.ceil(total / pageSize) || 1,
      };
    } catch (error) {
      log.error('Simba getCasePage error:', error);
      throw error;
    }
  }

  /**
   * 标记首次同步完成
   */
  markFirstSyncComplete(): void {
    this.setIsFirstSync(false);
    log.info('Simba 首次同步完成，已标记 isFirstSync=true');
  }

  async decryptPhone?(params: any): Promise<string | undefined> {
    return undefined;
  }

  async writeCase(
    caseDetail: CaseDetail,
    loanPlan: LoanPlan[],
    customerInfo: CustomerInfo,
    businessType: BusinessType | undefined
  ): Promise<void> {
    await writeCase(caseDetail, loanPlan, customerInfo, businessType);
  }
}
