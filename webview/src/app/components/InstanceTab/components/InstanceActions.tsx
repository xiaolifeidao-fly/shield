import React from 'react';
import { Button, Space, Modal, message } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  DeleteOutlined, 
  ClockCircleOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import { Instance } from '../types';
import { InstanceApi } from '@eleapi/door/instance.api';
import { LogApi } from '@eleapi/door/log.api';

const { confirm } = Modal;

interface InstanceActionsProps {
  instance: Instance;
  loading: Record<string, boolean>;
  onStart: (instance: Instance) => Promise<void>;
  onStop: (instance: Instance) => Promise<void>;
  onShowQrLogModal: (instance: Instance) => void;
  onShowLockTimeModal: (instance: Instance) => void;
  onShowClearSleepModal: (instance: Instance) => void;
  onDelete: (instance: Instance) => Promise<void>;
  businessList: any[];
}

export const InstanceActions: React.FC<InstanceActionsProps> = ({
  instance,
  loading,
  onStart,
  onStop,
  onShowQrLogModal,
  onShowLockTimeModal,
  onShowClearSleepModal,
  onDelete,
  businessList
}) => {
  const handleDelete = async (instance: Instance) => {
    confirm({
      title: '确认删除',
      content: `确定要删除端口为 ${instance.port} 的实例吗？此操作不可撤销。`,
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        await onDelete(instance);
      }
    });
  };

  const handleOpenUserInfo = async () => {
    try {
      const logApi = new LogApi();
      await logApi.openUserInfo(String(instance.port));
    } catch (error) {
      console.error('打开用户信息失败:', error);
    }
  };

  return (
    <Space size="small">
      <Button 
        size="small" 
        icon={<QrcodeOutlined />}
        onClick={() => onShowQrLogModal(instance)}
        style={{
          background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%)',
          border: 'none',
          color: '#fff'
        }}
      >
        扫码
      </Button>
      
      {instance.runningStatus === 'stopped' ? (
        <Button 
          size="small" 
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={loading[`start-${instance.port}`]}
          onClick={() => onStart(instance)}
        >
          启动
        </Button>
      ) : (
        <Button 
          size="small" 
          danger
          icon={<PauseCircleOutlined />}
          loading={loading[`stop-${instance.port}`]}
          onClick={() => onStop(instance)}
        >
          停止
        </Button>
      )}
      
      {/* 检查是否有任何业务类型被锁定 */}
      {businessList.some(business => instance.lockTimes?.get(business.code) && (instance.lockTimes.get(business.code) || 0) > 0) && (
        <Button 
          size="small" 
          icon={<ClockCircleOutlined />}
          onClick={() => onShowLockTimeModal(instance)}
        >
          封禁时间设置
        </Button>
      )}
      
      {/* 清除休眠按钮 - 始终显示 */}
      <Button 
        size="small" 
        type="primary"
        icon={<ClockCircleOutlined />}
        loading={loading[`clearSleep-${instance.port}`]}
        onClick={() => onShowClearSleepModal(instance)}
        style={{
          background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
          border: 'none',
          boxShadow: '0 2px 4px rgba(82, 196, 26, 0.3)'
        }}
      >
        清除休眠
      </Button>
      
      {instance.runningStatus === 'stopped' && (
        <Button 
          size="small" 
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(instance)}
        >
          删除
        </Button>
      )}
    </Space>
  );
};
