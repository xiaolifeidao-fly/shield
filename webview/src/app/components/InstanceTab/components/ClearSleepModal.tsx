import React, { useState, useEffect } from 'react';
import { Modal, Button, Checkbox, Row, Col } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { Instance } from '../types';
import { Business } from '@model/business.entity';
import { InstanceApi } from '@eleapi/door/instance.api';

interface ClearSleepModalProps {
  visible: boolean;
  instance: Instance | null;
  groupCode: string;
  businessList: Business[];
  loading: Record<string, boolean>;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClearSleepModal: React.FC<ClearSleepModalProps> = ({
  visible,
  instance,
  groupCode,
  businessList,
  loading,
  onClose,
  onSuccess
}) => {
  const [selectedBusinessCodes, setSelectedBusinessCodes] = useState<string[]>([]);

  useEffect(() => {
    if (visible && instance) {
      // 获取当前实例正在休眠的业务类型
      const sleepingBusinessCodes: string[] = [];
      businessList.forEach(business => {
        const sleepFlag = instance.sleepFlags?.get(business.code);
        if (sleepFlag === true) {
          sleepingBusinessCodes.push(business.code);
        }
      });
      setSelectedBusinessCodes(sleepingBusinessCodes);
    }
  }, [visible, instance, businessList]);

  const handleClearSleep = async () => {
    if (!instance || selectedBusinessCodes.length === 0) {
      return;
    }

    try {
      const instanceApi = new InstanceApi();
      let successCount = 0;
      let failedBusinesses: string[] = [];
      
      // 逐个清除选中业务类型的休眠状态
      for (const businessCode of selectedBusinessCodes) {
        try {
          const result = await instanceApi.clearSleepFlag(groupCode, String(instance.port), businessCode);
          if (result.success) {
            successCount++;
          } else {
            const businessName = businessList.find(b => b.code === businessCode)?.name || businessCode;
            failedBusinesses.push(businessName);
          }
        } catch (error: any) {
          const businessName = businessList.find(b => b.code === businessCode)?.name || businessCode;
          failedBusinesses.push(businessName);
        }
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('清除休眠失败:', error);
    }
  };

  const handleClose = () => {
    setSelectedBusinessCodes([]);
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClockCircleOutlined style={{ color: '#52c41a' }} />
          <span>清除休眠状态</span>
        </div>
      }
      open={visible}
      onOk={handleClearSleep}
      onCancel={handleClose}
      okText="清除选中休眠"
      cancelText="取消"
      confirmLoading={loading[`clearSleep-${instance?.port}`]}
      width={600}
    >
      <div style={{ padding: '20px 0' }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: 8 }}>
            实例端口: <strong style={{ color: '#1890ff' }}>{instance?.port}</strong>
          </p>
          {instance?.uid && (
            <p style={{ color: '#666', fontSize: '14px', marginBottom: 0 }}>
              用户: <strong style={{ color: '#1890ff' }}>
                {instance.uid}-{instance.nickName || '未知'}
              </strong>
            </p>
          )}
        </div>
        
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ color: '#333', marginBottom: 12, fontSize: '15px' }}>
            📋 选择要清除休眠的业务类型:
          </h4>
          <div style={{
            background: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e9ecef'
          }}>
            <Checkbox.Group
              value={selectedBusinessCodes}
              onChange={(checkedValues: string[]) => {
                setSelectedBusinessCodes(checkedValues);
              }}
              style={{ width: '100%' }}
            >
              <Row gutter={[16, 12]}>
                {businessList.map(business => {
                  const sleepFlag = instance?.sleepFlags?.get(business.code);
                  const sleepTime = instance?.sleepTimes?.get(business.code);
                  const sleepReason = instance?.sleepReasons?.get(business.code);
                  const isSleeping = sleepFlag === true;
                  
                  return (
                    <Col span={24} key={business.code}>
                      <div style={{
                        background: isSleeping ? '#fff2f0' : '#f6ffed',
                        borderRadius: '6px',
                        padding: '12px',
                        border: isSleeping ? '1px solid #ffbb96' : '1px solid #b7eb8f',
                        transition: 'all 0.3s',
                        opacity: isSleeping ? 1 : 0.7
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Checkbox 
                            value={business.code}
                            disabled={!isSleeping}
                            style={{ 
                              fontSize: '14px',
                              fontWeight: '500',
                              marginBottom: isSleeping ? '8px' : '0'
                            }}
                          >
                            <span style={{ color: isSleeping ? '#ff4d4f' : '#52c41a' }}>
                              {business.name} 业务
                            </span>
                          </Checkbox>
                          
                          <div style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isSleeping ? '#ff4d4f' : '#52c41a',
                            color: '#fff',
                            fontWeight: 'bold'
                          }}>
                            {isSleeping ? '😴 休眠中' : '✅ 正常'}
                          </div>
                        </div>
                        
                        {isSleeping && sleepTime && (
                          <div style={{ marginLeft: '24px', fontSize: '12px', color: '#666' }}>
                            <div style={{ marginBottom: '4px' }}>
                              <span>休眠时间: </span>
                              <strong>{new Date(sleepTime).toLocaleString('zh-CN')}</strong>
                            </div>
                            {sleepReason && (
                              <div style={{ color: '#ff7875' }}>
                                <span>休眠原因: </span>
                                <strong>{sleepReason}</strong>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!isSleeping && (
                          <div style={{ marginLeft: '24px', fontSize: '12px', color: '#52c41a' }}>
                            该业务类型当前运行正常，无需清除休眠
                          </div>
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </Checkbox.Group>
          </div>
        </div>
        
        <div style={{
          background: '#e6f7ff',
          borderRadius: '6px',
          padding: '12px',
          border: '1px solid #91d5ff'
        }}>
          <div style={{ fontSize: '12px', color: '#0050b3' }}>
            <strong>💡 提示:</strong>
            <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
              <li>选择需要清除休眠状态的业务类型</li>
              <li>清除后该业务类型将立即可以重新启动</li>
              <li>未选中的业务类型将保持休眠状态</li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
};
