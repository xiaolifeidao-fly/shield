import { AxiosInstance } from 'axios';
import { BaseBusinessApi } from '../../common/base.api';
import { CasePageParams, CasePageResponse, CaseDetail, LoanPlan, CustomerInfo, Case, LoanDetail } from '../../common/entities';
import { UserInfo, BusinessType } from '@eleapi/user/user.api';
import { getCurrentUser, setCurrentUser } from '../../adapundi/api/adapundi.axios';
import log from 'electron-log';
import { getPage } from '@src/business/common/engine.manager';
import { Page } from 'playwright-core';
import { login as simbaLogin } from './login.api';
import { writeCase } from '@src/business/adapundi/api/writeCase.api';

/**
 * Simba Case 接口，扩展自 Case
 * TODO: 根据 Simba 平台实际字段扩展
 */
export interface SimbaCase extends Case {
  /** 订单号 (Order Number) */
  orderNumber?: string;

  /** PTP 状态 (Promise to Pay) */
  ptpStatus?: string | null;

  /** 其他平台活跃贷款数量 */
  otherPlatformActiveLoanCount?: number;

  /** WA 号码 (WhatsApp Number) */
  waNumber?: string | null;

  /** 邮箱 (Email) */
  email?: string | null;

  /** DPD (Days Past Due) - 逾期天数 */
  dpd?: number;

  /** 催收等级 (Collection Level) */
  collectionLevel?: string | null;

  /** 罚金金额 (Penalty Amount) */
  penaltyAmount?: number;

  /** 当前应还金额 (Current Due Amount) */
  currentDueAmount?: number;

  /** 还款金额 (Repayment Amount) */
  repaymentAmount?: number;

  /** 剩余金额 (Remaining Amount) */
  remainingAmount?: number;

  /** 敏感度 (Sensitivity) */
  sensitivity?: string | null;

  /** WA 意向等级 (WA Intention Level) */
  waIntentionLevel?: string | null;

  /** 计划 (Plan) */
  plan?: string | null;

  /** 分配人 (Assigned By) */
  assignedBy?: string | null;

  /** 分配时间 (Assigned At) */
  assignedAt?: string | null;

  /** 最后跟进时间 (Last Followed Up Date) */
  lastFollowedUpDate?: string | null;
}

// TODO: 根据 Simba 实际 URL 结构调整
const SIMBA_BASE_URL = 'https://collection.cairin.id';
const SIMBA_LOGIN_URL = `${SIMBA_BASE_URL}/#/login`;

/**
 * Simba 业务 API 实现
 * TODO: 根据 Simba 平台实际页面结构实现具体方法
 */
export class SimbaBusinessApi extends BaseBusinessApi<SimbaCase> {

  getLoanPlan(customerId: number): Promise<LoanPlan[]> {
    return Promise.resolve([]);
  }

  getCustomerInfo(product: string, caseItem: SimbaCase): Promise<CustomerInfo> {
    const customerInfo: CustomerInfo = {
      fullName: caseItem.fullName || '',
      customerId: caseItem.customerId,
      mobile: caseItem.mobile || '',
      credentialNo: '',
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
      birthday: '',
      ktpOcrAddress: '',
    };
    return Promise.resolve(customerInfo);
  }

  async getLoanDetail(caseId: string): Promise<LoanDetail | null> {
    if (!caseId) {
      log.warn('Simba 获取贷款详情失败: caseId 为空');
      return null;
    }

    const user = this.getCurrentUser();
    if (!user || !user.username) {
      log.error('Simba 获取贷款详情失败: 未找到当前用户信息');
      return null;
    }

    const resourceId = `${user.username}_simba`;
    const detailUrl = `${SIMBA_BASE_URL}/#/detail/${caseId}`;

    try {
      let page = await getPage(resourceId, detailUrl) as unknown as Page;
      if (!page) {
        throw new Error('无法初始化详情页面');
      }

      const currentUrl = page.url();
      if (currentUrl.includes('#/login') || currentUrl.includes('/login')) {
        const loginResult = await simbaLogin(user, detailUrl);
        if (!loginResult.success) {
          log.error(`Simba 登录失败，无法获取贷款详情: ${loginResult.message || '未知错误'}`);
          return null;
        }

        page = await getPage(resourceId, detailUrl) as unknown as Page;
        if (!page) {
          throw new Error('登录后无法初始化详情页面');
        }
      }

      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {
        log.warn(`Simba 贷款详情页面加载 domcontentloaded 超时: ${caseId}`);
      });

      const loanDetail: LoanDetail = {
        id: 0,
        loanType: '',
        status: '',
        loanSubType: '',
        amount: 0,
        interestRate: 0,
        duration: '',
        period: 0,
        periodsNumber: 0,
        periodUnit: '',
        dueAmount: 0,
        minDueDate: null,
        overdueDays: 0,
        gracePeriodRate: 0,
        collectionLevel: null,
        principalAmount: 0,
        interestAmount: 0,
        defaultAmount: 0,
        vatAmount: 0,
        shouldRepaymentAmount: 0,
        creditQuality: '',
        platform: '',
        rolloverType: null,
        esignFlag: false,
      };

      return loanDetail;
    } catch (error) {
      log.error(`Simba 获取贷款详情异常 caseId=${caseId}`, error);
      return null;
    }
  }

  async getCaseDetail(product: string, caseItem: SimbaCase): Promise<CaseDetail> {
    const caseDetail: CaseDetail = {
      id: caseItem.id,
      caseId: caseItem.caseId || '',
      trigger: caseItem.trigger || null,
      level: caseItem.level || caseItem.collectionLevel || null,
      fullName: caseItem.fullName || '',
      mobile: caseItem.mobile || '',
      customerId: caseItem.customerId,
      overdueDay: caseItem.overdueDay || caseItem.dpd || 0,
      reviewerId: caseItem.reviewerId || null,
      reviewerName: caseItem.reviewerName || null,
      customerTag: caseItem.customerTag || null,
      riskGrade: caseItem.riskGrade || null,
      clearedNumber: caseItem.clearedNumber || 0,
      tags: '',
      channel1: caseItem.channel1 || null,
      channel2: caseItem.channel2 || null,
      gender: null,
      dueDate: caseItem.dueDate || null,
      loanTag: caseItem.loanTag || caseItem.waIntentionLevel || null,
      postLoanPreReminderLevel: caseItem.postLoanPreReminderLevel || null,
      overdueInstitutionLevel: caseItem.overdueInstitutionLevel || null,
      isMinPay: null,
      isInstallmentPay: null,
      minPayBillId: null,
      installmentBillId: null,
      customerClikInfo: null,
      vaList: null,
      tadpoleCount: caseItem.otherPlatformActiveLoanCount !== undefined ? String(caseItem.otherPlatformActiveLoanCount) : '0',
      tadpoleAmount: '0',
      riskScoreAndLevel: caseItem.riskGrade || null,
      amount: caseItem.amount || 0,
      principleAmount: caseItem.principleAmount || 0,
      interestAmount: 0,
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
      loanAmount: null,
    };
    try {
      const loanDetail = await this.getLoanDetail(caseDetail.caseId);
      if (loanDetail && loanDetail.amount > 0) {
        caseDetail.loanAmount = loanDetail.amount;
        if (!caseDetail.principleAmount) {
          caseDetail.principleAmount = loanDetail.principalAmount;
        }
        if (!caseDetail.amount) {
          caseDetail.loanAmount = loanDetail.amount;
        }
      }
    } catch (error) {
      log.warn(`Simba 案件详情补充贷款数据失败 caseId=${caseDetail.caseId}`, error);
    }
    return caseDetail;
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

  async getCasePage(params: CasePageParams): Promise<CasePageResponse<SimbaCase>> {
    const { pageNum = 1, pageSize = 20, type = 'need_follow_up' } = params;

    const user = this.getCurrentUser();
    if (!user || !user.username) {
      throw new Error('未找到当前用户信息');
    }

    const resourceId = `${user.username}_simba`;

    let page;
    try {
      let url: string;
      if (type === 'followed_up_task') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yyyy = yesterday.getFullYear();
        const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const dd = String(yesterday.getDate()).padStart(2, '0');
        const assignAt = `${yyyy}-${mm}-${dd}`;
        url = `${SIMBA_BASE_URL}/#/assign/already-follow-up?assign_at=${assignAt}&page=${pageNum}&pageSize=1000`;
      } else {
        url = `${SIMBA_BASE_URL}/#/assign/need-follow-up?page=${pageNum}&pageSize=1000`;
      }

      log.info(`Simba getCasePage: params=${JSON.stringify(params)}, type=${type}, url=${url}`);

      page = await getPage(resourceId, url) as unknown as Page;
      if (!page) {
        throw new Error('无法初始化页面');
      }

      const currentUrl = page.url();
      if (currentUrl.includes('#/login') || currentUrl.includes('/login') || currentUrl === SIMBA_LOGIN_URL) {
        log.info('检测到需要重新登录，开始执行登录流程');
        const loginResult = await simbaLogin(user, url);
        if (!loginResult.success) {
          throw new Error(`登录失败: ${loginResult.message || '未知错误'}`);
        }
        page = await getPage(resourceId, url) as unknown as Page;
        if (!page) {
          throw new Error('登录后无法重新初始化页面');
        }
      }

      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
        log.warn('页面加载超时');
      });

      let cases: SimbaCase[] = [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cases = await page.evaluate(() => {
          const result: SimbaCase[] = [];
          return result;
        }) as SimbaCase[];
      } catch (error: any) {
        log.error('page.evaluate failed:', error?.message || error);
      }

      const casesArray = Array.isArray(cases) ? cases : [];
      const total = casesArray.length >= pageSize ? casesArray.length * pageNum : casesArray.length;
      const pages = Math.ceil(total / pageSize) || 1;

      const response: CasePageResponse<SimbaCase> = {
        records: casesArray as SimbaCase[],
        total: total,
        size: pageSize,
        current: pageNum,
        orders: [],
        optimizeCountSql: false,
        searchCount: true,
        countId: null,
        maxLimit: null,
        pages: pages,
      };
      return response;
    } catch (error) {
      log.error('getCasePage error:', error);
      throw error;
    }
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
