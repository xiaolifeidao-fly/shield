import React from 'react';
import { List, Row, Col, Checkbox, Space } from 'antd';
import { LikeOutlined } from '@ant-design/icons';
import { Instance } from '../types';
import { Business } from '@model/business.entity';
import { InstanceApi } from '@eleapi/door/instance.api';
import { InstanceActions } from './InstanceActions';
import { 
  getRunningStatusTag, 
  getLoginStatus, 
  getLockStatus, 
  getExceptionStatus, 
  getSleepStatus,
  getSleepReason,
  getStatusBadge,
  formatTimeDisplay
} from '../utils/instanceUtils';

interface InstanceListProps {
  instances: Instance[];
  businessList: Business[];
  loading: Record<string, boolean>;
  onStart: (instance: Instance) => Promise<void>;
  onStop: (instance: Instance) => Promise<void>;
  onShowQrLogModal: (instance: Instance) => void;
  onShowLockTimeModal: (instance: Instance) => void;
  onShowClearSleepModal: (instance: Instance) => void;
  onDelete: (instance: Instance) => Promise<void>;
  onUpdateInstanceBusiness: (instance: Instance, businessCode: string, checked: boolean) => Promise<void>;
}

export const InstanceList: React.FC<InstanceListProps> = ({
  instances,
  businessList,
  loading,
  onStart,
  onStop,
  onShowQrLogModal,
  onShowLockTimeModal,
  onShowClearSleepModal,
  onDelete,
  onUpdateInstanceBusiness
}) => {
  return (
    <div>
      <List
        dataSource={instances}
        renderItem={(instance) => (
          <List.Item
            style={{
              marginBottom: '16px',
              padding: '20px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
            }}
          >
            <div style={{ width: '100%' }}>
              {/* 实例基本信息 */}
              <div style={{ marginBottom: '16px' }}>
                <Space wrap>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>端口:{instance.port}</span>
                  {getStatusBadge(instance)}
                  {getRunningStatusTag(instance.runningStatus)}
                  {getLoginStatus(instance)}
                  {getLockStatus(instance, businessList)}
                  {getExceptionStatus(instance)}
                  {getSleepStatus(instance, businessList)}
                </Space>
                
                <div style={{ fontSize: 13, color: '#666', fontWeight: '500', marginTop: '8px' }}>
                  {formatTimeDisplay(instance)}
                </div>
              </div>

              {/* 业务类型统计 - 一行4个 */}
              <div style={{ marginBottom: '16px' }}>
                <Row gutter={[16, 8]}>
                  {businessList.map(business => {
                    const stat = instance.statistic?.get(business.code);
                    if (!stat) return null;
                    
                    // 从 statistic 中获取业务类型的选择状态
                    const isBusinessEnabled = stat.chose;
                    // 检查全局业务类型是否选中（作为白名单控制）
                    const isGlobalEnabled = business.chose;
                    
                    return (
                      <Col span={6} key={business.code}>
                        <div style={{ 
                          padding: '8px',
                          background: isBusinessEnabled 
                            ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' 
                            : 'linear-gradient(135deg, #f5f5f5 0%, #d9d9d9 100%)',
                          borderRadius: '8px',
                          border: isBusinessEnabled 
                            ? '1px solid #dee2e6' 
                            : '1px solid #bfbfbf',
                          minHeight: '100px',
                          opacity: !isGlobalEnabled ? 0.5 : (isBusinessEnabled ? 1 : 0.7),
                          position: 'relative',
                          filter: !isGlobalEnabled ? 'grayscale(50%)' : 'none'
                        }}>
                          {/* 勾选框 */}
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px'
                          }}>
                            <Checkbox
                              checked={isBusinessEnabled}
                              onChange={async (e) => {
                                const checked = e.target.checked;
                                await onUpdateInstanceBusiness(instance, business.code, checked);
                              }}
                            />
                          </div>
                          
                          <div style={{ 
                            fontSize: '13px', 
                            fontWeight: 'bold', 
                            color: !isGlobalEnabled ? '#aaa' : (isBusinessEnabled ? '#495057' : '#999'),
                            marginBottom: '8px',
                            textAlign: 'center',
                            paddingRight: '20px' // 为勾选框留出空间
                          }}>
                            🎯 {business.name}
                            {!isGlobalEnabled && <span style={{ fontSize: '10px', marginLeft: '4px' }}>(已禁用)</span>}
                          </div>
                          <Row gutter={4}>
                            <Col span={6}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                  fontSize: '14px', 
                                  fontWeight: 'bold', 
                                  color: isBusinessEnabled ? '#52c41a' : '#999'
                                }}>
                                  {stat.totalCount || 0}
                                </div>
                                <div style={{ fontSize: '10px', color: '#666' }}>总数</div>
                              </div>
                            </Col>
                            <Col span={6}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                  fontSize: '14px', 
                                  fontWeight: 'bold', 
                                  color: isBusinessEnabled ? '#ff4d4f' : '#999'
                                }}>
                                  {stat.totalErrorCount || 0}
                                </div>
                                <div style={{ fontSize: '10px', color: '#666' }}>总失败</div>
                              </div>
                            </Col>
                            <Col span={6}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                  fontSize: '14px', 
                                  fontWeight: 'bold', 
                                  color: isBusinessEnabled ? '#1890ff' : '#999'
                                }}>
                                  {stat.todayCount || 0}
                                </div>
                                <div style={{ fontSize: '10px', color: '#666' }}>今日</div>
                              </div>
                            </Col>
                            <Col span={6}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                  fontSize: '14px', 
                                  fontWeight: 'bold', 
                                  color: isBusinessEnabled ? '#ff7875' : '#999'
                                }}>
                                  {stat.todayErrorCount || 0}
                                </div>
                                <div style={{ fontSize: '10px', color: '#666' }}>今日失败</div>
                              </div>
                            </Col>
                          </Row>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
                
                {/* 兼容旧版本：如果没有新的Map统计数据，展示原有字段 */}
                {(!instance.statistic || instance.statistic.size === 0) && (
                  <div style={{ 
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <Space size="large" wrap>
                      <Space size="small">
                        <LikeOutlined style={{ color: '#1890ff' }} />
                        <span style={{ fontSize: 13, color: '#666' }}>
                          今日点赞: <strong style={{ color: '#1890ff' }}>{instance.likeCount || 0}</strong>
                        </span>
                      </Space>
                      <Space size="small">
                        <span style={{ fontSize: 13, color: '#666' }}>
                          总点赞: <strong style={{ color: '#52c41a' }}>{instance.totalLikeCount || 0}</strong>
                        </span>
                      </Space>
                    </Space>
                  </div>
                )}
              </div>

              {/* 休眠理由 */}
              {getSleepReason(instance, businessList)}

              {/* 操作按钮 - 移到最下方 */}
              <div style={{ 
                marginTop: '16px', 
                paddingTop: '12px', 
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <InstanceActions
                  instance={instance}
                  loading={loading}
                  onStart={onStart}
                  onStop={onStop}
                  onShowQrLogModal={onShowQrLogModal}
                  onShowLockTimeModal={onShowLockTimeModal}
                  onShowClearSleepModal={onShowClearSleepModal}
                  onDelete={onDelete}
                  businessList={businessList}
                />
              </div>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};
