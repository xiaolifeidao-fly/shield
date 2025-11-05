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

/**
 * Singa Case 接口，扩展自 Case
 * 可以添加 Singa 特有的字段
 */
export interface SingaCase extends Case {
  // 可以在这里添加 Singa 特有的字段
  // 例如：
  // singaSpecificField?: string;
}

/**
 * Singa 业务 API 实现
 * TODO: 实现具体的 API 方法
 */
export class SingaBusinessApi extends BaseBusinessApi {

  getLoanPlan(customerId: number): Promise<LoanPlan[]> {
    return Promise.resolve([]);
  }

  getCustomerInfo(product: string, caseItem : Case): Promise<CustomerInfo> {
    return Promise.resolve({} as CustomerInfo);
  }

  getCaseDetail(product: string, caseItem : Case): Promise<CaseDetail> {
    // caseItem 转换为 CaseDetail
    return Promise.resolve({} as CaseDetail);
    
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

      // 等待表格加载
      await page.waitForSelector('tbody tr.assign-', { timeout: 30000 }).catch(() => {
        log.warn('表格可能未加载或为空');
      });

      // 解析表格数据
      // 注意：page.evaluate 中的代码在浏览器环境中执行
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cases: any = await page.evaluate(() => {
        // @ts-expect-error - document 在浏览器环境中存在
        const rows = Array.from(document.querySelectorAll('tbody tr[class^="assign-"]'));
        const result: any[] = [];

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
            
            // 查找逾期天数（通常在带有 text-danger 的 td 中）
            const overdueDayEl = Array.from(row.querySelectorAll('td')).find((td: any) => {
              const text = (td as any).textContent?.trim() || '';
              return /^\d+$/.test(text) && td.querySelector('.text-danger');
            });
            const overdueDay = overdueDayEl ? parseInt((overdueDayEl as any).textContent?.trim() || '0', 10) : 0;

            // 查找金额字段（包含 "Rp." 的文本）
            const amountCells = Array.from(row.querySelectorAll('td')).filter((td: any) => {
              return td.textContent?.includes('Rp.');
            });
            
            // 解析金额（假设顺序：principleAmount, amount, 或其他）
            let principleAmount = 0;
            let amount = 0;
            if (amountCells.length > 0) {
              // 尝试从金额单元格中提取
              const amounts = amountCells.map((cell: any) => {
                const text = cell.textContent?.trim() || '';
                const match = text.match(/Rp\.\s*([\d.]+)/);
                if (match) {
                  return parseFloat(match[1].replace(/\./g, ''));
                }
                return 0;
              }).filter((n: number) => n > 0);
              
              if (amounts.length > 0) {
                // 假设最后一个金额是总金额
                amount = amounts[amounts.length - 1];
                // 假设第一个金额是本金额
                if (amounts.length > 1) {
                  principleAmount = amounts[0];
                }
              }
            }

            // 从 data-id 获取 customerId（如果有）
            const dataIdEl = row.querySelector('[data-id]');
            const customerId = dataIdEl ? parseInt(dataIdEl.getAttribute('data-id') || '0', 10) : 0;

            // 从 href 中提取更多信息
            const detailLink = row.querySelector('a[href*="/detail/"]');
            let extractedCaseId = caseId;
            if (detailLink) {
              const href = detailLink.href;
              const match = href.match(/\/detail\/([^\/]+)/);
              if (match) {
                extractedCaseId = match[1];
              }
            }

            // 构建 Case 对象
            const caseItem: any = {
              id: id,
              caseId: extractedCaseId || caseId,
              fullName: fullName,
              customerType: null,
              product: productEl?.textContent?.trim() || null,
              status: null,
              mobile: mobile,
              trigger: null,
              customerId: customerId || 0,
              groupId: 0,
              level: collectionLevelEl?.textContent?.trim() || null,
              amount: amount,
              principleAmount: principleAmount,
              distributedDay: 0,
              overdueDay: overdueDay,
              reviewerId: null,
              reviewerName: null,
              createTime: new Date().toISOString(),
              lastLogCreateTime: null,
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
              isTadpole: false,
            };

            result.push(caseItem);
          } catch (error) {
            console.error('解析行数据错误:', error);
          }
        });

        return result;
      });

      // 计算总数和页数
      // 注意：实际的分页可能需要通过页面上的分页信息获取，这里先使用当前页数据长度估算
      const casesArray = Array.isArray(cases) ? cases : [];
      const total = casesArray.length >= pageSize ? casesArray.length * pageNum : casesArray.length;
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
  async decryptPhone?(params: any): Promise<string> {
    throw new Error('Singa decryptPhone API not implemented yet');
  }

  async writeCase(
    caseDetail: CaseDetail,
    loanPlan: LoanPlan[],
    customerInfo: CustomerInfo,
    businessType: BusinessType | undefined
  ): Promise<void> {
    // writeCase 是通用的后端API，使用相同的 writeCaseInstance
    // 构建请求数据
    const requestData = {
      caseDetail: caseDetail,
      customerInfo: customerInfo,
      loanPlan: loanPlan,
      loanSource: businessType || null
    };
    log.info(`writeCase requestData: ${JSON.stringify(requestData)}`);
    await writeCaseInstance.post("/loan/import/external/sync", requestData);
  }
}

