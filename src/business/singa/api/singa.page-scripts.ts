export const EXTRACT_LOAN_DETAIL_SCRIPT = String.raw`function () {
  const doc = globalThis.document;
  if (!doc) {
    return null;
  }

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
    const cleaned = text
      .replace(/Rp\./gi, '')
      .replace(/\s+/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '');
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

export const EXTRACT_CASE_PAGE_SCRIPT = String.raw`function (username) {
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

  const getCellIndex = (headerNames) => {
    const thead = document.querySelector('thead');
    if (thead) {
      const headers = Array.from(thead.querySelectorAll('th'));
      for (let i = 0; i < headers.length; i++) {
        const headerText = headers[i].textContent?.trim() || '';
        for (const name of headerNames) {
          if (headerText.toLowerCase().includes(name.toLowerCase())) {
            return i;
          }
        }
      }
    }
    return -1;
  };

  const cellIndexMap = {};
  const commonHeaders = [
    { key: 'ptp', names: ['PTP'] },
    { key: 'pri', names: ['PRI'] },
    { key: 'dpd', names: ['DPD', 'Overdue'] },
    { key: 'penalty', names: ['Penalty'] },
    { key: 'currentDue', names: ['Current Due'] },
    { key: 'totalDue', names: ['Total Due'] },
    { key: 'repayment', names: ['Repayment'] },
    { key: 'rwp', names: ['RWP'] },
    { key: 'remaining', names: ['Remaining'] },
    { key: 'sensitivity', names: ['Sensitivity'] },
    { key: 'borrowerType', names: ['Borrower Type', 'BorrowerType'] },
    { key: 'waIntention', names: ['WA Intention', 'WAIntention'] },
    { key: 'plan', names: ['Plan'] },
    { key: 'assignedBy', names: ['Assigned By', 'AssignedBy'] },
    { key: 'assignedAt', names: ['Assigned At', 'AssignedAt'] },
    { key: 'lastFollowed', names: ['Last Followed', 'LastFollowed', 'Last Follow'] },
  ];
  commonHeaders.forEach(({ key, names }) => {
    cellIndexMap[key] = getCellIndex(names);
  });

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
      const orderNumberEl = row.querySelector('.orderNumber');
      const caseId = orderNumberEl?.textContent?.trim() || '';

      const detailLink = row.querySelector('a[href*="/detail/"]');
      let extractedCaseId = caseId;
      if (detailLink) {
        const href = detailLink.href;
        const match = href.match(/\/detail\/([^\/]+)/);
        if (match) {
          extractedCaseId = match[1];
        }
      }

      let ptpStatus = null;
      const ptpIndex = cellIndexMap.ptp;
      if (ptpIndex >= 0) {
        const ptpCell = cells[ptpIndex];
        if (ptpCell) {
          const ptpBadge = ptpCell.querySelector('.badge');
          if (ptpBadge) {
            const ptpText = ptpBadge.textContent?.trim() || '';
            if (ptpText.includes('PTP') || ptpText.includes('NO PTP') || ptpText.includes('BP')) {
              ptpStatus = ptpText;
            }
          }
        }
      }

      let priScore = null;
      const priIndex = cellIndexMap.pri;
      if (priIndex >= 0) {
        const priCell = cells[priIndex];
        if (priCell) {
          const priBadge = priCell.querySelector('.badge.bg-danger');
          if (priBadge) {
            const priText = priBadge.textContent?.trim() || '';
            const priNum = parseNumber(priText);
            if (priNum >= 0) {
              priScore = priNum;
            }
          }
        }
      }

      const isExtendedOrderText = row.querySelector('.isExtendedOrder')?.textContent?.trim() || '';
      const isExtendedOrder = isExtendedOrderText.toLowerCase().includes('yes');
      const installmentSequence = parseNumber(row.querySelector('.installment')?.textContent, 0);
      const fullName = row.querySelector('.borrowerName')?.textContent?.trim() || '';
      const occupation = row.querySelector('.jobName')?.textContent?.trim() || null;
      const oplEl = row.querySelector('.other-platform-active-loan-count');
      const oplCount = parseNumber(oplEl?.textContent, 0);

      let customerId = id;
      if (oplEl) {
        const onclick = oplEl.getAttribute('onclick');
        if (onclick) {
          const match = onclick.match(/loadFdcLoanPage\((\d+)\)/);
          if (match) {
            customerId = parseNumber(match[1], id);
          }
        }
      }

      const mobile = row.querySelector('.borrowerPhone')?.textContent?.trim() || '';
      const waNumber = row.querySelector('.borrowerWa')?.textContent?.trim() || null;
      const waRemarkContent = row.querySelector('.open-wa-remark-modal')?.getAttribute('data-title') || null;
      const email = row.querySelector('.borrowerEmail')?.textContent?.trim() || null;
      const product = row.querySelector('.product')?.textContent?.trim() || null;

      let overdueDay = 0;
      const dpdIndex = cellIndexMap.dpd;
      if (dpdIndex >= 0) {
        const dpdCell = cells[dpdIndex];
        if (dpdCell) {
          const text = dpdCell.textContent?.trim() || '';
          const num = parseInt(text, 10);
          if (!isNaN(num) && num >= 0) {
            overdueDay = num;
          }
        }
      }

      const collectionLevel = row.querySelector('.collectionLevel')?.textContent?.trim() || null;

      let penaltyAmount = 0;
      let currentDueAmount = 0;
      let totalDueAmount = 0;
      let repaymentAmount = 0;
      let rwp = 0;
      let remainingAmount = 0;

      const amountMappings = [
        ['penalty', (value) => { penaltyAmount = value; }],
        ['currentDue', (value) => { currentDueAmount = value; }],
        ['totalDue', (value) => { totalDueAmount = value; }],
        ['repayment', (value) => { repaymentAmount = value; }],
        ['rwp', (value) => { rwp = value; }],
        ['remaining', (value) => { remainingAmount = value; }],
      ];

      amountMappings.forEach(([key, setter]) => {
        const idx = cellIndexMap[key];
        if (idx >= 0) {
          const cell = cells[idx];
          if (cell && cell.textContent?.includes('Rp.')) {
            const text = cell.textContent?.trim() || '';
            const match = text.match(/Rp\.\s*([\d.]+)/);
            if (match) {
              setter(parseFloat(match[1].replace(/\./g, '')) || 0);
            }
          }
        }
      });

      let principleAmount = 0;
      if (currentDueAmount > 0) {
        principleAmount = currentDueAmount;
      } else if (remainingAmount > 0) {
        principleAmount = remainingAmount;
      } else if (totalDueAmount > 0) {
        principleAmount = totalDueAmount;
      }

      let sensitivity = null;
      const sensitivityIndex = cellIndexMap.sensitivity;
      if (sensitivityIndex >= 0) {
        const sensitivityCell = cells[sensitivityIndex];
        if (sensitivityCell) {
          const sensitivityBadge = sensitivityCell.querySelector('.badge');
          if (sensitivityBadge) {
            const sensitivityText = sensitivityBadge.textContent?.trim() || '';
            if (sensitivityText.includes('risk') || sensitivityText.includes('No risk')) {
              sensitivity = sensitivityText;
            }
          }
        }
      }

      let customerType = null;
      const borrowerTypeIndex = cellIndexMap.borrowerType;
      if (borrowerTypeIndex >= 0) {
        const borrowerTypeCell = cells[borrowerTypeIndex];
        if (borrowerTypeCell) {
          const borrowerTypeBadge = borrowerTypeCell.querySelector('.badge');
          if (borrowerTypeBadge) {
            const borrowerTypeText = borrowerTypeBadge.textContent?.trim() || '';
            if (borrowerTypeText.includes('New') || borrowerTypeText.includes('Existing') || borrowerTypeText.includes('No risk')) {
              customerType = borrowerTypeText;
            }
          }
        }
      }

      let waIntentionLevel = null;
      const waIntentionIndex = cellIndexMap.waIntention;
      if (waIntentionIndex >= 0) {
        const waIntentionCell = cells[waIntentionIndex];
        if (waIntentionCell) {
          const waIntentionBadge = waIntentionCell.querySelector('.badge');
          if (waIntentionBadge) {
            const waIntentionText = waIntentionBadge.textContent?.trim() || '';
            if (waIntentionText.includes('WA') || waIntentionText.includes('Delivered')) {
              waIntentionLevel = waIntentionText;
            }
          }
        }
      }

      let plan = null;
      const planIndex = cellIndexMap.plan;
      if (planIndex >= 0) {
        const planCell = cells[planIndex];
        if (planCell) {
          const planText = planCell.textContent?.trim() || '';
          if (planText.includes('Apps Notif') || planText.includes('Plan')) {
            plan = planText;
          }
        }
      }

      let assignedBy = null;
      const assignedByIndex = cellIndexMap.assignedBy;
      if (assignedByIndex >= 0) {
        const assignedByCell = cells[assignedByIndex];
        if (assignedByCell) {
          const assignedByText = assignedByCell.textContent?.trim() || '';
          if (assignedByText && !assignedByText.match(/\d+\s+\w+\s+\d{4}/) && !assignedByText.includes('Rp.')) {
            assignedBy = assignedByText;
          }
        }
      }

      let assignedAt = null;
      const assignedAtIndex = cellIndexMap.assignedAt;
      if (assignedAtIndex >= 0) {
        const assignedAtCell = cells[assignedAtIndex];
        if (assignedAtCell) {
          const assignedAtText = assignedAtCell.textContent?.trim() || '';
          if (assignedAtText && assignedAtText !== '-') {
            assignedAt = parseDate(assignedAtText);
          }
        }
      }

      let lastFollowedUpDate = null;
      const lastFollowedIndex = cellIndexMap.lastFollowed;
      if (lastFollowedIndex >= 0) {
        const lastFollowedCell = cells[lastFollowedIndex];
        if (lastFollowedCell) {
          const lastFollowedText = lastFollowedCell.textContent?.trim() || '';
          if (lastFollowedText && lastFollowedText !== '-') {
            lastFollowedUpDate = parseDate(lastFollowedText);
          }
        }
      }

      result.push({
        id: id,
        caseId: extractedCaseId || caseId,
        fullName: fullName,
        customerType: customerType,
        product: product,
        status: ptpStatus,
        mobile: mobile,
        trigger: plan,
        customerId: customerId,
        groupId: 0,
        level: collectionLevel,
        amount: totalDueAmount || 0,
        principleAmount: principleAmount,
        distributedDay: 0,
        overdueDay: overdueDay,
        reviewerId: null,
        reviewerName: username,
        createTime: assignedAt || new Date().toISOString(),
        lastLogCreateTime: lastFollowedUpDate,
        customerTag: null,
        customerSysTag: occupation,
        teamLeaderName: null,
        lastSevenCount: null,
        riskGrade: priScore != null ? String(priScore) : null,
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
        loanTag: waIntentionLevel,
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
        orderNumber: extractedCaseId || caseId,
        ptpStatus: ptpStatus,
        priScore: priScore,
        isExtendedOrder: isExtendedOrder,
        installmentSequence: installmentSequence || undefined,
        occupation: occupation,
        otherPlatformActiveLoanCount: oplCount || undefined,
        waNumber: waNumber,
        email: email,
        dpd: overdueDay,
        collectionLevel: collectionLevel,
        penaltyAmount: penaltyAmount || undefined,
        currentDueAmount: currentDueAmount || undefined,
        repaymentAmount: repaymentAmount || undefined,
        rwp: rwp || undefined,
        remainingAmount: remainingAmount || undefined,
        sensitivity: sensitivity,
        waIntentionLevel: waIntentionLevel,
        plan: plan,
        assignedBy: assignedBy,
        assignedAt: assignedAt,
        lastFollowedUpDate: lastFollowedUpDate,
      });
    } catch (error) {
      console.error('第 ' + index + ' 行: 解析失败', error);
      if (error instanceof Error) {
        console.error('错误消息: ' + error.message);
        console.error('错误堆栈: ' + error.stack);
      }
    }
  });

  return result;
}`;
