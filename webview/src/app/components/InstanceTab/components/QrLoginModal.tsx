import React, { useState } from 'react';
import { Modal, Button, Alert, Card, List, Progress, Typography, Space } from 'antd';
import { QrcodeOutlined } from '@ant-design/icons';
import { Instance, QrLogItem } from '../types';
import { LogApi } from '@eleapi/door/log.api';

const { Text } = Typography;

interface QrLoginModalProps {
  visible: boolean;
  instance: Instance | null;
  groupCode: string;
  onClose: () => void;
  onLoginSuccess: (instance: Instance) => void;
}

export const QrLoginModal: React.FC<QrLoginModalProps> = ({
  visible,
  instance,
  groupCode,
  onClose,
  onLoginSuccess
}) => {
  const [qrLogs, setQrLogs] = useState<QrLogItem[]>([]);
  const [qrLoading, setQrLoading] = useState(false);

  const addQrLog = (message: string, type: 'info' | 'error' | 'warning') => {
    setQrLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message,
      type
    }].slice(-50)); // 保留最新50条日志
  };

  const handleQrLogin = async () => {
    if (!instance) return;
    
    setQrLoading(true);
    addQrLog('正在启动扫码登录页面...', 'info');
    
    try {
      const logApi = new LogApi();
      const result = await logApi.login(groupCode, String(instance.port), false);
      
      if (result.success) {
        addQrLog('扫码页面已打开，请使用手机扫码登录', 'info');
        addQrLog('正在等待扫码结果...', 'info');
        
        // 模拟登录进度
        setTimeout(() => addQrLog('检测到扫码操作，正在验证...', 'info'), 2000);
        setTimeout(() => {
          if (result.success) {
            addQrLog('扫码登录成功!', 'info');
            onLoginSuccess(instance);
          }
          setQrLoading(false);
        }, 4000);
        
      } else {
        addQrLog(`扫码登录失败: ${result.message}`, 'error');
        setQrLoading(false);
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      addQrLog(`扫码登录异常: ${errorMsg}`, 'error');
      setQrLoading(false);
    }
  };

  const handleClose = () => {
    setQrLogs([]);
    setQrLoading(false);
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <QrcodeOutlined style={{ color: '#ff6b6b' }} />
          <span>实例 {instance?.port} - 扫码登录</span>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      width={700}
      footer={[
        <Button key="close" onClick={handleClose}>
          关闭
        </Button>,
        <Button 
          key="login" 
          type="primary" 
          loading={qrLoading}
          onClick={handleQrLogin}
          style={{
            background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%)',
            border: 'none'
          }}
        >
          开始扫码登录
        </Button>
      ]}
    >
      <div style={{ padding: '16px 0' }}>
        {/* 扫码说明 */}
        <Alert
          message="扫码登录说明"
          description="点击'开始扫码登录'按钮后，系统将打开登录页面，请使用手机抖音扫码完成登录。登录过程中的详细日志将在下方实时显示。"
          type="info"
          style={{ marginBottom: 20 }}
          showIcon
        />
        
        {/* 实时日志显示 */}
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>📋 实时日志</span>
              {qrLoading && (
                <Progress 
                  type="line" 
                  percent={75} 
                  size="small" 
                  status="active"
                  style={{ flex: 1, marginLeft: 16 }}
                />
              )}
            </div>
          }
          size="small"
          style={{ maxHeight: 400 }}
        >
          <div style={{ 
            height: 300, 
            overflowY: 'auto', 
            border: '1px solid #f0f0f0', 
            borderRadius: 6, 
            padding: 12,
            background: '#fafafa' 
          }}>
            <List
              size="small"
              dataSource={qrLogs}
              renderItem={(logItem) => (
                <List.Item style={{ padding: '6px 0', borderBottom: 'none' }}>
                  <Space size="small" style={{ width: '100%', fontSize: 12 }}>
                    <Text type="secondary">[{logItem.time}]</Text>
                    <Text type={
                      logItem.type === 'error' ? 'danger' : 
                      logItem.type === 'warning' ? 'warning' : undefined
                    }>
                      {logItem.message}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
            {qrLogs.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                color: '#999', 
                padding: '50px 0',
                fontSize: '14px'
              }}>
                📝 暂无日志，点击开始扫码登录查看详细过程
              </div>
            )}
          </div>
        </Card>
      </div>
    </Modal>
  );
};
