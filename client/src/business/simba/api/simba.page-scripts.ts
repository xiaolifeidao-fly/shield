// TODO: 根据 Simba 实际页面结构实现数据提取脚本
// 此文件包含从 Simba 页面提取数据的 JavaScript 脚本

/**
 * 贷款详情页面提取脚本
 * TODO: 根据 Simba 实际页面结构调整
 */
export const EXTRACT_LOAN_DETAIL_SCRIPT = String.raw`function () {
  const doc = globalThis.document;
  if (!doc) {
    return null;
  }

  // TODO: 根据 Simba 实际页面结构调整选择器
  const table = doc.querySelector('#firstTable tbody');
  if (!table) {
    return null;
  }

  const row = table.querySelector('tr');
  if (!row) {
    return null;
  }

  const cells = Array.from(row.querySelectorAll('td'));
  if (cells.length < 6) {
    return null;
  }

  const getCellText = (index) => {
    const cell = cells[index];
    if (!cell) {
      return '';
    }
    const text = cell.textContent ?? '';
    return String(text).replace(/\s+/g, ' ').trim();
  };

  const parseAmount = (text) => {
    if (!text) {
      return 0;
    }
    const cleaned = text.replace(/[^\d.,]/g, '').replace(/,/g, '.');
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? 0 : num;
  };

  const parseDate = (text) => {
    if (!text || text === '-' || text === '--') {
      return null;
    }
    const trimmed = text.replace(/\s+/g, ' ').trim();
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  };

  return {
    productName: getCellText(0),
    bankName: getCellText(1),
    contractAmount: parseAmount(getCellText(2)),
    applyAt: parseDate(getCellText(3)),
    disbursementDate: parseDate(getCellText(4)),
    disbursementAmount: parseAmount(getCellText(5)),
  };
}`;

/**
 * 案件列表页面提取脚本
 * TODO: 根据 Simba 实际页面结构调整
 */
export const EXTRACT_CASE_PAGE_SCRIPT = String.raw`function (username) {
  // TODO: 根据 Simba 实际页面结构调整选择器
  const rows = Array.from(document.querySelectorAll('tbody tr[class^="assign-"]'));
  const result = [];

  const parseNumber = (text, defaultValue = 0) => {
    if (!text) return defaultValue;
    const num = parseInt(text.trim(), 10);
    return isNaN(num) ? defaultValue : num;
  };

  const parseDate = (dateStr) => {
    if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '') return null;
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (_error) {
      // ignore invalid date strings
    }
    return null;
  };

  rows.forEach((row, index) => {
    try {
      const classList = row.className;
      const idMatch = classList.match(/assign-(\d+)/);
      if (!idMatch) {
        return;
      }

      const id = parseInt(idMatch[1], 10);
      if (isNaN(id)) {
        return;
      }

      const cells = Array.from(row.querySelectorAll('td'));
      const fullName = row.querySelector('.borrowerName')?.textContent?.trim() || '';
      const mobile = row.querySelector('.borrowerPhone')?.textContent?.trim() || '';
      const caseId = row.querySelector('.orderNumber')?.textContent?.trim() || String(id);

      result.push({
        id: id,
        caseId: caseId,
        fullName: fullName,
        customerType: null,
        product: null,
        status: null,
        mobile: mobile,
        trigger: null,
        customerId: id,
        groupId: 0,
        level: null,
        amount: 0,
        principleAmount: 0,
        distributedDay: 0,
        overdueDay: 0,
        reviewerId: null,
        reviewerName: username,
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
        orderNumber: caseId,
        ptpStatus: null,
        priScore: null,
        isExtendedOrder: false,
        installmentSequence: undefined,
        occupation: null,
        otherPlatformActiveLoanCount: undefined,
        waNumber: null,
        email: null,
        dpd: 0,
        collectionLevel: null,
        penaltyAmount: undefined,
        currentDueAmount: undefined,
        repaymentAmount: undefined,
        rwp: undefined,
        remainingAmount: undefined,
        sensitivity: null,
        waIntentionLevel: null,
        plan: null,
        assignedBy: null,
        assignedAt: null,
        lastFollowedUpDate: null,
      });
    } catch (error) {
      console.error('第 ' + index + ' 行: 解析失败', error);
    }
  });

  return result;
}`;
