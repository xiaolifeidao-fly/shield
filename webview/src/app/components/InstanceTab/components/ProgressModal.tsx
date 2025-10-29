import React from 'react';
import { Modal, Button, Card, Progress, Row, Col, Alert, List, Badge, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { ProgressInfo } from './types';

const { Text } = Typography;

interface ProgressModalProps {
  visible: boolean;
  progressInfo: ProgressInfo;
  onClose: () => void;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  visible,
  progressInfo,
  onClose
}) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ThunderboltOutlined style={{ color: progressInfo.type === 'start' ? '#52c41a' : '#ff4d4f' }} />
          <span>
            {progressInfo.type === 'start' ? '⚡ 批量启动进度' : '⏸️ 批量停止进度'}
          </span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      maskClosable={false}
    >
      <div style={{ padding: '16px 0' }}>
        {/* 总体进度 */}
        <Card size="small" style={{ marginBottom: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
              📊 总体进度: {progressInfo.current} / {progressInfo.total}
            </h3>
          </div>
          <Progress 
            percent={Math.round((progressInfo.current / Math.max(progressInfo.total, 1)) * 100)}
            status={progressInfo.current >= progressInfo.total ? 'success' : 'active'}
            style={{ marginBottom: 12 }}
          />
          <Row gutter={16} style={{ textAlign: 'center' }}>
            <Col span={8}>
              <div style={{ 
                background: '#f6ffed', 
                borderRadius: '6px', 
                padding: '8px',
                border: '1px solid #b7eb8f'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                  {progressInfo.completed}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>成功</div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ 
                background: '#fff2e8', 
                borderRadius: '6px', 
                padding: '8px',
                border: '1px solid #ffbb96'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>
                  {progressInfo.current - progressInfo.completed - progressInfo.failed}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>进行中</div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ 
                background: '#fff1f0', 
                borderRadius: '6px', 
                padding: '8px',
                border: '1px solid #ffa39e'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f5222d' }}>
                  {progressInfo.failed}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>失败</div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 当前处理实例 */}
        {progressInfo.currentInstance && (
          <Alert
            message={`正在处理实例: ${progressInfo.currentInstance.port}`}
            description={
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span>UID: {progressInfo.currentInstance.uid || '未知'}</span>
                  <span>昵称: {progressInfo.currentInstance.nickName || '未设置'}</span>
                  <span>状态: {progressInfo.currentInstance.runningStatus === 'running' ? '运行中' : '已停止'}</span>
                </div>
              </div>
            }
            type="info"
            style={{ marginBottom: 20 }}
            showIcon
          />
        )}
        
        {/* 实时日志显示 */}
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>📋 操作日志</span>
              <Badge count={progressInfo.logs.length} style={{ backgroundColor: '#52c41a' }} />
            </div>
          }
          size="small"
          style={{ maxHeight: 400 }}
        >
          <div style={{ 
            height: 250, 
            overflowY: 'auto', 
            border: '1px solid #f0f0f0', 
            borderRadius: 6, 
            padding: 12,
            background: '#fafafa' 
          }}>
            <List
              size="small"
              dataSource={progressInfo.logs}
              renderItem={(logItem) => (
                <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                  <div style={{ display: 'flex', gap: '8px', width: '100%', fontSize: 12 }}>
                    <Text type="secondary">[{logItem.time}]</Text>
                    <Text type={
                      logItem.type === 'error' ? 'danger' : 
                      logItem.type === 'success' ? 'success' : undefined
                    }>
                      {logItem.message}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
            {progressInfo.logs.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                color: '#999', 
                padding: '50px 0',
                fontSize: '14px'
              }}>
                📝 暂无日志
              </div>
            )}
          </div>
        </Card>
      </div>
    </Modal>
  );
};
