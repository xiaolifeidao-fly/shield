import { BaseCaseSyncService } from '../../common/base.sync';
import { BaseBusinessApi } from '../../common/base.api';
import { Case, CaseDetail } from '../../common/entities';
import { SyncStats } from '@eleapi/user/user.api';
import { decryptPhone, AuditDataType } from '../api/phone.api';
import log from 'electron-log';

interface SyncCache {
  [caseId: string]: string;
}

/**
 * Adapundi 业务同步服务
 * 继承基础同步服务，可以重写特定方法以定制行为
 */
export class AdapundiCaseSyncService extends BaseCaseSyncService {
  constructor(businessApi: BaseBusinessApi) {
    super(businessApi);
  }

  /**
   * 重写解密手机号方法，使用 Adapundi 特定的解密逻辑
   */
  protected async decryptPhoneNumbers(caseDetail: CaseDetail, caseItem: Case): Promise<void> {
    // 解密本人手机号
    if (caseDetail.mobile) {
      try {
        const decryptedMobile = await decryptPhone({
          auditDataType: AuditDataType.CASE_DETAIL_BASIC_INFO_OWN_PHONE,
          customerId: caseDetail.customerId,
          productEnum: caseItem.product!,
        });
        caseDetail.mobile = decryptedMobile;
      } catch (error) {
        log.warn(`Failed to decrypt mobile for case ${caseItem.caseId}:`, error);
      }
    }

    // 解密备用手机号
    if (caseDetail.backupMobile) {
      try {
        const decryptedBackupMobile = await decryptPhone({
          auditDataType: AuditDataType.CASE_DETAIL_BASIC_INFO_BACKUP_PHONE,
          customerId: caseDetail.customerId,
          productEnum: caseItem.product!,
        });
        caseDetail.backupMobile = decryptedBackupMobile;
      } catch (error) {
        log.warn(`Failed to decrypt backupMobile for case ${caseItem.caseId}:`, error);
      }
    }
  }
}

