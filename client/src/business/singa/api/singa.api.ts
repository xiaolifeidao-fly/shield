import { AxiosInstance } from 'axios';
import { BaseBusinessApi } from '../../common/base.api';
import { CasePageParams, CasePageResponse, CaseDetail, LoanPlan, CustomerInfo, Case } from '../../common/entities';
import { UserInfo, BusinessType } from '@eleapi/user/user.api';
import { getCurrentUser, setCurrentUser, writeCaseInstance } from '../../adapundi/api/adapundi.axios';
import { EngineInstance } from '@src/engine/engine.instance';
import log from 'electron-log';
import { getPage } from '@src/business/common/engine.manager';
import { Page } from 'playwright-core';
import { login as singaLogin } from './login.api';
import { writeCase } from '@src/business/adapundi/api/writeCase.api';

/**
 * Singa Case 接口，扩展自 Case
 * 包含 Singa 平台特有的字段
 */
export interface SingaCase extends Case {
  /** 订单号 (Order Number) */
  orderNumber?: string;
  
  /** PTP 状态 (Promise to Pay) */
  ptpStatus?: 'PTP' | 'NO PTP' | 'BP' | null;
  
  /** PRI 分数 (Performance Risk Indicator) */
  priScore?: number | null;
  
  /** 是否为扩展订单 (Extended Order) */
  isExtendedOrder?: boolean;
  
  /** 分期序号 (Installment Sequence) */
  installmentSequence?: number;
  
  /** 职业 (Occupation) */
  occupation?: string | null;
  
  /** 其他平台活跃贷款数量 (Other Platform Active Loan Count) */
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
  
  /** RWP - Remaining Working Principal (剩余工作本金) */
  rwp?: number;
  
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

/**
 * Singa 业务 API 实现
 * TODO: 实现具体的 API 方法
 */
export class SingaBusinessApi extends BaseBusinessApi<SingaCase> {

  getLoanPlan(customerId: number): Promise<LoanPlan[]> {
    return Promise.resolve([]);
  }

  getCustomerInfo(product: string, caseItem : SingaCase): Promise<CustomerInfo> {
    // 将 SingaCase 转换为 CustomerInfo
    const customerInfo: CustomerInfo = {
      fullName: caseItem.fullName || '',
      customerId: caseItem.customerId,
      mobile: caseItem.mobile || '',
      credentialNo: '', // SingaCase 中没有此字段
      gender: '', // SingaCase 中没有此字段
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

  getCaseDetail(product: string, caseItem : SingaCase): Promise<CaseDetail> {
    // 将 SingaCase 转换为 CaseDetail
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
      reviewerName: caseItem.reviewerName || caseItem.assignedBy || null,
      customerTag: caseItem.customerTag || null,
      riskGrade: caseItem.riskGrade || (caseItem.priScore !== null && caseItem.priScore !== undefined ? String(caseItem.priScore) : null),
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
      tadpoleAmount: '0', // SingaCase 中没有此字段
      riskScoreAndLevel: caseItem.priScore !== null && caseItem.priScore !== undefined 
        ? `${caseItem.priScore}${caseItem.riskGrade ? '/' + caseItem.riskGrade : ''}` 
        : null,
      amount: caseItem.amount || 0,
      principleAmount: caseItem.principleAmount || 0,
      interestAmount: 0, // SingaCase 中没有此字段，需要计算或默认为 0
      punishmentAmount: caseItem.penaltyAmount || 0,
      vatAmount: 0, // SingaCase 中没有此字段
      distributedDay: caseItem.distributedDay || 0,
      expireAmount: caseItem.amount || 0, // 使用 amount 作为过期金额
      expirePrincipleAmount: caseItem.principleAmount || 0,
      expireInterestAmount: 0,
      expirePunishmentAmount: caseItem.penaltyAmount || 0,
      expireVatAmount: 0,
      backupMobile: '',
      createTime: caseItem.createTime || new Date().toISOString(),
    };
    return Promise.resolve(caseDetail);
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

  /**
   * 解析金额字符串（如 "Rp. 1.084.424"）为数字
   */
  private parseAmount(amountStr: string | null | undefined): number {
    if (!amountStr) return 0;
    // 移除 "Rp.", 空格和千位分隔符 "."
    const cleaned = amountStr.replace(/Rp\./gi, '').replace(/\s+/g, '').replace(/\./g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 解析数字字符串
   */
  private parseNumber(str: string | null | undefined, defaultValue: number = 0): number {
    if (!str) return defaultValue;
    const num = parseInt(str.trim(), 10);
    return isNaN(num) ? defaultValue : num;
  }

  async getCasePage(params: CasePageParams): Promise<CasePageResponse<SingaCase>> {
    const { pageNum = 1, pageSize = 20 } = params;
    
    const user = this.getCurrentUser();
    if (!user || !user.username) {
      throw new Error('未找到当前用户信息');
    }

    // resourceId = username + businessType
    const resourceId = `${user.username}_${user.businessType || 'singa'}`;
    const engine = new EngineInstance(resourceId, true);

    let page;
    try {
      // 初始化页面
      const url = 'https://col.singa.id/loan-collection/assign/need-follow-up?page=' + pageNum;
      page = await getPage(resourceId, url) as unknown as Page;
      if (!page) {
        throw new Error('无法初始化页面');
      }

      // 检查是否需要重新登录
      // 如果当前 URL 包含登录页面，说明需要重新登录
      const currentUrl = page.url();
      const loginUrl = 'https://col.singa.id/login';
      if (currentUrl.includes('/login') || currentUrl === loginUrl) {
        log.info('检测到需要重新登录，开始执行登录流程');
        const loginResult = await singaLogin(user, url);
        if (!loginResult.success) {
          throw new Error(`登录失败: ${loginResult.message || '未知错误'}`);
        }
        // 登录成功后，重新获取 case 列表页面
        page = await getPage(resourceId, url) as unknown as Page;
        if (!page) {
          throw new Error('登录后无法重新初始化页面');
        }
      }

      // 等待界面加载完成
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
        log.warn('页面加载超时');
      });

      // 解析表格数据
      // 注意：page.evaluate 中的代码在浏览器环境中执行
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cases: any = await page.evaluate(() => {
        // @ts-expect-error - document 在浏览器环境中存在
        const rows = Array.from(document.querySelectorAll('tbody tr[class^="assign-"]'));
        const result: any[] = [];

        // 辅助函数：解析金额字符串（如 "Rp. 1.084.424"）
        const parseAmount = (text: string | null | undefined): number => {
          if (!text) return 0;
          const cleaned = text.replace(/Rp\./gi, '').replace(/\s+/g, '').replace(/\./g, '');
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        };

        // 辅助函数：解析数字
        const parseNumber = (text: string | null | undefined, defaultValue: number = 0): number => {
          if (!text) return defaultValue;
          const num = parseInt(text.trim(), 10);
          return isNaN(num) ? defaultValue : num;
        };

        // 辅助函数：解析日期字符串（如 "23 Oct 2025 12:09"）
        const parseDate = (dateStr: string | null | undefined): string | null => {
          if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '') return null;
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          } catch (e) {
            // 解析失败返回 null
          }
          return null;
        };

        rows.forEach((row: any) => {
          try {
            // 从 class 中提取 ID（如 "assign-60183905"）
            const classList = row.className;
            const idMatch = classList.match(/assign-(\d+)/);
            if (!idMatch) return;

            const id = parseInt(idMatch[1], 10);
            if (isNaN(id)) return;

            // 解析各个字段
            const orderNumberEl = row.querySelector('.orderNumber');
            const caseId = orderNumberEl?.textContent?.trim() || '';

            const borrowerNameEl = row.querySelector('.borrowerName');
            const fullName = borrowerNameEl?.textContent?.trim() || '';

            const borrowerPhoneEl = row.querySelector('.borrowerPhone');
            const mobile = borrowerPhoneEl?.textContent?.trim() || '';

            const borrowerWaEl = row.querySelector('.borrowerWa');
            const borrowerEmailEl = row.querySelector('.borrowerEmail');
            const productEl = row.querySelector('.product');
            const installmentEl = row.querySelector('.installment');
            const collectionLevelEl = row.querySelector('.collectionLevel');
            
            // 查找逾期天数（在带有 text-danger 的 span 中，或者直接查找数字）
            let overdueDay = 0;
            const overdueDayEl = Array.from(row.querySelectorAll('td')).find((td: any) => {
              const textDangerEl = td.querySelector('.text-danger');
              if (textDangerEl) {
                const text = textDangerEl.textContent?.trim() || '';
                const num = parseInt(text, 10);
                if (!isNaN(num) && num >= 0) {
                  overdueDay = num;
                  return true;
                }
              }
              // 也检查 td 本身是否包含数字和 text-danger
              const text = (td as any).textContent?.trim() || '';
              const num = parseInt(text, 10);
              if (!isNaN(num) && num >= 0 && td.querySelector('.text-danger')) {
                overdueDay = num;
                return true;
              }
              return false;
            });

            // 查找所有金额字段（包含 "Rp." 的文本）
            const amountCells = Array.from(row.querySelectorAll('td')).filter((td: any) => {
              return td.textContent?.includes('Rp.');
            });
            
            // 解析金额：从页面中提取所有金额
            const amounts: number[] = [];
            amountCells.forEach((cell: any) => {
              const text = cell.textContent?.trim() || '';
              // 匹配所有 Rp. 后面的数字（可能包含千位分隔符 .）
              const matches = text.match(/Rp\.\s*([\d.]+)/g);
              if (matches) {
                matches.forEach((match: string) => {
                  const numStr = match.replace(/Rp\.\s*/gi, '').replace(/\./g, '');
                  const num = parseFloat(numStr);
                  if (!isNaN(num) && num > 0) {
                    amounts.push(num);
                  }
                });
              }
            });
            
            // 根据 JSON 数据示例，通常有多个金额字段
            // 从页面结构看，可能有：principleAmount, amount (总金额) 等
            let principleAmount = 0;
            let amount = 0;
            if (amounts.length > 0) {
              // 通常第一个较小的金额是本金额，最后一个较大的金额是总金额
              amounts.sort((a, b) => a - b);
              if (amounts.length >= 2) {
                principleAmount = amounts[0];
                amount = amounts[amounts.length - 1];
              } else {
                amount = amounts[0];
                principleAmount = amounts[0];
              }
            }

            // 从 data-id 获取 customerId（如果有）
            // 根据 JSON 数据，customerId 通常等于 id
            let customerId = id;
            const dataIdEl = row.querySelector('[data-id]');
            if (dataIdEl) {
              const dataId = parseInt(dataIdEl.getAttribute('data-id') || '0', 10);
              if (!isNaN(dataId) && dataId > 0) {
                customerId = dataId;
              }
            }

            // 从 href 中提取 caseId
            const detailLink = row.querySelector('a[href*="/detail/"]');
            let extractedCaseId = caseId;
            if (detailLink) {
              const href = detailLink.href;
              const match = href.match(/\/detail\/([^\/]+)/);
              if (match) {
                extractedCaseId = match[1];
              }
            }

            // 尝试从 data-title 或其他属性中提取更多信息
            const waRemarkLink = row.querySelector('.open-wa-remark-modal');
            const waRemarkContent = waRemarkLink?.getAttribute('data-title') || null;

            // 获取所有 td 元素，用于提取更多字段
            const cells = Array.from(row.querySelectorAll('td'));

            // 提取 PRI 分数（从 badge 中）
            let priScore: number | null = null;
            const priBadge = row.querySelector('td .badge.bg-danger, td .badge.bg-warning, td .badge.bg-success');
            if (priBadge) {
              const priText = priBadge.textContent?.trim() || '';
              const priNum = parseNumber(priText);
              if (priNum > 0) {
                priScore = priNum;
              }
            }

            // 提取 PTP 状态
            const ptpBadges = Array.from(row.querySelectorAll('td .badge'));
            let ptpStatus: string | null = null;
            ptpBadges.forEach((badge: any) => {
              const text = badge.textContent?.trim() || '';
              if (text.includes('PTP') || text.includes('NO PTP') || text.includes('BP')) {
                ptpStatus = text;
              }
            });

            // 提取 Borrower Type（从 badge 中查找包含 New/Existing 的）
            let customerType: string | null = null;
            ptpBadges.forEach((badge: any) => {
              const text = badge.textContent?.trim() || '';
              if (text.includes('New') || text.includes('Existing') || text.includes('No risk')) {
                customerType = text;
              }
            });

            // 提取 WA Intention
            let loanTag: string | null = null;
            ptpBadges.forEach((badge: any) => {
              const text = badge.textContent?.trim() || '';
              if (text.includes('WA') || text.includes('Willing') || text.includes('Unwilling') || text.includes('Delivered')) {
                loanTag = text;
              }
            });

            // 提取 Plan
            const planEl = cells.find((cell: any) => {
              const text = cell.textContent?.trim() || '';
              return text.includes('Apps Notif') || text.includes('Plan');
            }) as any;
            const trigger = planEl?.textContent?.trim() || null;

            // 提取 Assigned By（审核人）- 查找包含人名但非日期的单元格
            let reviewerName: string | null = null;
            cells.forEach((cell: any) => {
              const text = cell.textContent?.trim() || '';
              // 查找包含人名的单元格（排除金额、日期、数字等）
              if (text && !text.includes('Rp.') && !text.match(/\d+\s+\w+\s+\d{4}/) && 
                  !text.match(/^\d+$/) && text.length > 2 && text.length < 50 && 
                  !text.includes('-') && !text.includes('Oct') && !text.includes('Nov')) {
                // 可能是人名
                if (!reviewerName && text !== '-' && text !== 'No') {
                  reviewerName = text;
                }
              }
            });

            // 提取 Assigned At 和 Last Followed
            let assignedAt: string | null = null;
            let lastLogCreateTime: string | null = null;
            cells.forEach((cell: any) => {
              const text = cell.textContent?.trim() || '';
              // 查找日期格式（如 "23 Oct 2025 12:09"）
              if (text.match(/\d+\s+\w+\s+\d{4}\s+\d{2}:\d{2}/)) {
                if (!assignedAt) {
                  assignedAt = parseDate(text);
                } else if (!lastLogCreateTime) {
                  lastLogCreateTime = parseDate(text);
                }
              } else if (text === '-') {
                // 空的日期
                if (!lastLogCreateTime) {
                  lastLogCreateTime = null;
                }
              }
            });

            // 提取其他平台贷款数量（OPL）
            const oplEl = row.querySelector('.other-platform-active-loan-count');
            const oplCount = parseNumber(oplEl?.textContent, 0);

            // 提取 Occupation
            const jobNameEl = row.querySelector('.jobName');
            const occupation = jobNameEl?.textContent?.trim() || null;

            // 提取 isExtendedOrder
            const isExtendedOrderEl = row.querySelector('.isExtendedOrder');
            const isExtendedOrderText = isExtendedOrderEl?.textContent?.trim() || '';
            const isExtendedOrder = isExtendedOrderText.toLowerCase().includes('yes');

            // 提取 installmentSequence
            const installmentSequence = parseNumber(installmentEl?.textContent, 0);

            // 提取 WA Number
            const waNumber = borrowerWaEl?.textContent?.trim() || null;

            // 提取 Email
            const email = borrowerEmailEl?.textContent?.trim() || null;

            // 提取 Sensitivity（从 badge 中查找包含 "risk" 的）
            let sensitivity: string | null = null;
            ptpBadges.forEach((badge: any) => {
              const text = badge.textContent?.trim() || '';
              if (text.includes('risk') || text.includes('No risk')) {
                sensitivity = text;
              }
            });

            // 提取 WA Intention Level（更精确的提取）
            let waIntentionLevel: string | null = null;
            ptpBadges.forEach((badge: any) => {
              const text = badge.textContent?.trim() || '';
              if (text.includes('WA') || text.includes('Willing') || text.includes('Unwilling') || 
                  text.includes('Delivered') || text.includes('Sent') || text.includes('Not Found')) {
                waIntentionLevel = text;
              }
            });
            if (!waIntentionLevel) {
              waIntentionLevel = loanTag;
            }

            // 提取金额字段（按顺序）
            // 表格中的金额顺序：Penalty, Current Due, Total Due, Repayment, Remaining, RWP
            const allAmountTexts: string[] = [];
            amountCells.forEach((cell: any) => {
              const text = cell.textContent?.trim() || '';
              const matches = text.match(/Rp\.\s*([\d.]+)/g);
              if (matches) {
                matches.forEach((match: string) => {
                  allAmountTexts.push(match);
                });
              }
            });

            // 解析各个金额字段（根据位置推断）
            let penaltyAmount = 0;
            let currentDueAmount = 0;
            let totalDueAmount = 0;
            let repaymentAmount = 0;
            let remainingAmount = 0;
            let rwp = 0;

            // 从表格结构看，金额字段的顺序是：Penalty, Current Due, Total Due, Repayment, Remaining, RWP
            // 但我们需要更精确地识别每个字段
            // 暂时按 amounts 数组的顺序分配（需要根据实际页面结构调整）
            if (amounts.length >= 6) {
              penaltyAmount = amounts[0] || 0;
              currentDueAmount = amounts[1] || 0;
              totalDueAmount = amounts[2] || 0;
              repaymentAmount = amounts[3] || 0;
              remainingAmount = amounts[4] || 0;
              rwp = amounts[5] || 0;
            } else if (amounts.length > 0) {
              // 如果金额数量不足，按常见模式分配
              // Total Due 通常是最大的
              const sortedAmounts = [...amounts].sort((a, b) => b - a);
              totalDueAmount = sortedAmounts[0] || 0;
              if (sortedAmounts.length > 1) {
                currentDueAmount = sortedAmounts[1] || 0;
              }
              if (sortedAmounts.length > 2) {
                remainingAmount = sortedAmounts[2] || 0;
              }
            }

            // customerId 通常等于 id，但可以从其他平台贷款数据中获取
            if (oplEl) {
              const onclick = oplEl.getAttribute('onclick');
              if (onclick) {
                const match = onclick.match(/loadFdcLoanPage\((\d+)\)/);
                if (match) {
                  customerId = parseNumber(match[1], id);
                }
              }
            }

            // 构建 SingaCase 对象，尽可能填充所有字段
            const caseItem: any = {
              id: id,
              caseId: extractedCaseId || caseId,
              fullName: fullName,
              customerType: customerType,
              product: productEl?.textContent?.trim() || null,
              status: ptpStatus,
              mobile: mobile,
              trigger: trigger,
              customerId: customerId,
              groupId: 0,
              level: collectionLevelEl?.textContent?.trim() || null,
              amount: totalDueAmount || amount,
              principleAmount: principleAmount,
              distributedDay: 0,
              overdueDay: overdueDay,
              reviewerId: null,
              reviewerName: reviewerName,
              createTime: assignedAt || new Date().toISOString(),
              lastLogCreateTime: lastLogCreateTime,
              customerTag: null,
              customerSysTag: occupation,
              teamLeaderName: null,
              lastSevenCount: null,
              riskGrade: priScore?.toString() || null,
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
              waRemarkContent: waRemarkContent,
              dueDate: null,
              todoFlag: false,
              queue: null,
              smsEventStatus: null,
              latestSmsSendSuccessTime: null,
              loanTag: loanTag,
              vipLevel: null,
              postLoanPreReminderLevel: null,
              overdueInstitutionLevel: null,
              applyPlatform: null,
              installPlatform: null,
              lastLoginPlatform: null,
              allowDownloadCollectionLetter: false,
              waitCall: false,
              inCollectionDays: overdueDay,
              isTadpole: oplCount > 0,
              // SingaCase 特有字段
              orderNumber: extractedCaseId || caseId,
              ptpStatus: ptpStatus as 'PTP' | 'NO PTP' | 'BP' | null,
              priScore: priScore,
              isExtendedOrder: isExtendedOrder,
              installmentSequence: installmentSequence || undefined,
              occupation: occupation,
              otherPlatformActiveLoanCount: oplCount || undefined,
              waNumber: waNumber,
              email: email,
              dpd: overdueDay,
              collectionLevel: collectionLevelEl?.textContent?.trim() || null,
              penaltyAmount: penaltyAmount || undefined,
              currentDueAmount: currentDueAmount || undefined,
              repaymentAmount: repaymentAmount || undefined,
              rwp: rwp || undefined,
              remainingAmount: remainingAmount || undefined,
              sensitivity: sensitivity,
              waIntentionLevel: waIntentionLevel,
              plan: trigger,
              assignedBy: reviewerName,
              assignedAt: assignedAt,
              lastFollowedUpDate: lastLogCreateTime,
            };

            result.push(caseItem);
          } catch (error) {
            console.error('解析行数据错误:', error);
          }
        });

        return result;
      });

      // 从页面提取分页信息
      const paginationInfo = await page.evaluate(() => {
        // @ts-expect-error - document 在浏览器环境中存在
        const showingText = (document.querySelector('.text-muted') as HTMLElement)?.textContent || '';
        // 匹配 "Showing 1 to 50 of 110 results"
        const match = showingText.match(/of\s+(\d+)\s+results/i);
        const total = match ? parseInt(match[1], 10) : 0;
        
        // 获取当前页码
        // @ts-expect-error - document 在浏览器环境中存在
        const activePage = document.querySelector('.pagination .page-item.active .page-link') as HTMLElement;
        const current = activePage ? parseInt(activePage.textContent || '1', 10) : 1;
        
        return { total, current };
      });

      // 计算总数和页数
      const casesArray = Array.isArray(cases) ? cases : [];
      const total = paginationInfo.total || (casesArray.length >= pageSize ? casesArray.length * pageNum : casesArray.length);
      const pages = Math.ceil(total / pageSize);

      const response: CasePageResponse<SingaCase> = {
        records: casesArray as SingaCase[],
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
    } finally {
      // 注意：这里不关闭引擎，因为引擎可能被重用
      // 如果需要关闭，可以调用 engine.closeBrowser()
    }
  }

  // Singa 业务可能不需要解密手机号，或者使用不同的解密方式
  // 如果 Singa 需要解密手机号，可以重写此方法
  async decryptPhone?(params: any): Promise<string|undefined> {
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

