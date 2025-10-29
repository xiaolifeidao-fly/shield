import React, { useState } from 'react';
import { Modal, Button, DatePicker } from 'antd';
import { Instance } from './types';
import { InstanceApi } from '@eleapi/door/instance.api';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import zhCN from 'antd/es/date-picker/locale/zh_CN';

// 设置dayjs为中文
dayjs.locale('zh-cn');

interface LockTimeModalProps {
  visible: boolean;
  instance: Instance | null;
  groupCode: string;
  loading: Record<string, boolean>;
  onClose: () => void;
  onSuccess: (instance: Instance, timestamp: number) => void;
}

export const LockTimeModal: React.FC<LockTimeModalProps> = ({
  visible,
  instance,
  groupCode,
  loading,
  onClose,
  onSuccess
}) => {
  const [selectedDateTime, setSelectedDateTime] = useState<dayjs.Dayjs | null>(null);

  const handleSetLockTime = async () => {
    if (!instance || !selectedDateTime) {
      return;
    }

    try {
      const instanceApi = new InstanceApi();
      const timestamp = selectedDateTime.valueOf();
      const result = await instanceApi.setLockTime(groupCode, String(instance.port), timestamp);
      
      if (result.success) {
        onSuccess(instance, timestamp);
        onClose();
      }
    } catch (error: any) {
      console.error('设置封禁时间失败:', error);
    }
  };

  const handleClose = () => {
    setSelectedDateTime(null);
    onClose();
  };

  return (
    <Modal
      title="封禁时间设置"
      open={visible}
      onOk={handleSetLockTime}
      onCancel={handleClose}
      okText="确定"
      cancelText="取消"
      confirmLoading={loading[`setLockTime-${instance?.port}`]}
    >
      <div style={{ padding: '20px 0' }}>
        <p style={{ marginBottom: 16, color: '#666' }}>
          为实例 <strong>{instance?.port}</strong> 设置封禁解除时间：
        </p>
        <DatePicker
          showTime={{ format: 'HH:mm:ss' }}
          format="YYYY-MM-DD HH:mm:ss"
          placeholder="选择解除封禁时间"
          style={{ width: '100%' }}
          value={selectedDateTime}
          onChange={(date) => setSelectedDateTime(date)}
          disabledDate={(current) => current && current < dayjs().startOf('day')}
          locale={zhCN}
        />
        <p style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
          注意：选择的时间应该是未来时间，系统会在指定时间自动解除封禁。
        </p>
      </div>
    </Modal>
  );
};
