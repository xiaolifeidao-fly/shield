import React from 'react';
import { Card, Row, Col } from 'antd';
import { Business } from '@model/business.entity';
import { BusinessStats } from '../types';

interface InstanceStatsProps {
  businessList: Business[];
  businessStats: BusinessStats;
}

export const InstanceStats: React.FC<InstanceStatsProps> = ({
  businessList,
  businessStats
}) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '16px',
        padding: '12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          📊 实时数据统计
        </h3>
      </div>
      
      {/* 按业务类型分别显示统计卡片 - 一行4个 */}
      <Row gutter={[16, 16]}>
        {businessList.map((business) => {
          const stat = businessStats[business.code] || { 
            totalCount: 0, 
            todayCount: 0, 
            totalErrorCount: 0, 
            todayErrorCount: 0 
          };
          
          return (
            <Col span={6} key={business.code}>
              <Card 
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
                  overflow: 'hidden',
                  minHeight: '140px'
                }}
              >
                {/* 业务类型标题 */}
                <div style={{ 
                  textAlign: 'center', 
                  marginBottom: '12px',
                  padding: '6px',
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '6px'
                }}>
                  <h4 style={{ 
                    color: '#fff', 
                    margin: 0, 
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    🎯 {business.name}
                  </h4>
                </div>
                
                {/* 统计数据 - 横向排列 */}
                <Row gutter={4}>
                  <Col span={6}>
                    <div style={{
                      textAlign: 'center',
                      padding: '4px 2px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      minHeight: '50px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div style={{ fontSize: '14px', marginBottom: '2px' }}>👍</div>
                      <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                        {stat.totalCount}
                      </div>
                      <div style={{ color: '#fff', fontSize: '8px', opacity: 0.8 }}>总数</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{
                      textAlign: 'center',
                      padding: '4px 2px',
                      background: 'rgba(255,107,107,0.3)',
                      borderRadius: '4px',
                      minHeight: '50px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div style={{ fontSize: '14px', marginBottom: '2px' }}>⚠️</div>
                      <div style={{ color: '#ffcccb', fontSize: '12px', fontWeight: 'bold' }}>
                        {stat.totalErrorCount}
                      </div>
                      <div style={{ color: '#ffcccb', fontSize: '8px', opacity: 0.8 }}>总失败</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{
                      textAlign: 'center',
                      padding: '4px 2px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      minHeight: '50px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div style={{ fontSize: '14px', marginBottom: '2px' }}>✨</div>
                      <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                        {stat.todayCount}
                      </div>
                      <div style={{ color: '#fff', fontSize: '8px', opacity: 0.8 }}>今日</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{
                      textAlign: 'center',
                      padding: '4px 2px',
                      background: 'rgba(255,107,107,0.3)',
                      borderRadius: '4px',
                      minHeight: '50px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div style={{ fontSize: '14px', marginBottom: '2px' }}>🚨</div>
                      <div style={{ color: '#ffcccb', fontSize: '12px', fontWeight: 'bold' }}>
                        {stat.todayErrorCount}
                      </div>
                      <div style={{ color: '#ffcccb', fontSize: '8px', opacity: 0.8 }}>今日失败</div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          );
        })}
      </Row>
      
      {/* 如果没有业务数据或业务列表为空，显示提示信息 */}
      {businessList.length === 0 && (
        <Card 
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            border: 'none',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
            textAlign: 'center',
            padding: '20px'
          }}
        >
          <div style={{ color: '#fff' }}>
            <h4 style={{ color: '#fff', marginBottom: '16px' }}>📊 暂无业务类型配置</h4>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              请先在上方业务类型选择框中配置要显示的业务类型
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
