'use client'

import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { UserOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, SyncOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { UserInfo, BusinessType } from './UserManagement.types';

interface UserStatsProps {
  users: UserInfo[];
  allUsers: UserInfo[];
  businessType: string;
}

const businessTypeLabels: Record<BusinessType, string> = {
  adapundi: 'Adapundi',
  singa: 'Singa'
};

const UserStats: React.FC<UserStatsProps> = ({ users, allUsers, businessType }) => {
  // 计算统计数据
  const calculateStats = () => {
    const userCount = users.length;
    let totalCount = 0;
    let skipCount = 0;
    let failCount = 0;
    let totalDuration = 0;
    let lastSyncTime = '';

    users.forEach(user => {
      if (user.syncStats) {
        totalCount += user.syncStats.totalCount || 0;
        skipCount += user.syncStats.skipCount || 0;
        failCount += user.syncStats.failCount || 0;
        totalDuration += user.syncStats.duration || 0;
        
        // 找出最后一次执行时间
        if (user.syncStats.lastSyncTime) {
          if (!lastSyncTime || new Date(user.syncStats.lastSyncTime) > new Date(lastSyncTime)) {
            lastSyncTime = user.syncStats.lastSyncTime;
          }
        }
      }
    });

    return {
      userCount,
      totalCount,
      skipCount,
      failCount,
      totalDuration,
      lastSyncTime
    };
  };

  const stats = calculateStats();

  const calculateBusinessTypeTotals = () => {
    const totals: Array<{ type: BusinessType; totalCount: number }> = [];
    (Object.keys(businessTypeLabels) as BusinessType[]).forEach(type => {
      const totalCount = allUsers.reduce((acc, user) => {
        if (user.businessType === type && user.syncStats) {
          return acc + (user.syncStats.totalCount || 0);
        }
        return acc;
      }, 0);
      totals.push({ type, totalCount });
    });
    return totals;
  };

  const businessTypeTotals = calculateBusinessTypeTotals();

  // Format duration
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  };

  // Format last sync time
  const formatLastSyncTime = (time: string) => {
    if (!time) return 'None';
    return new Date(time).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <Card 
      className="stats-card" 
      style={{ 
        marginBottom: 16,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none'
      }}
      bodyStyle={{ padding: '16px 24px' }}
    >
      <div style={{ color: 'white', marginBottom: 12, fontSize: 16, fontWeight: 500 }}>
        {businessType === 'adapundi' ? 'Adapundi' : 'Singa'} Statistics
      </div>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Statistic
            title={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Users</span>}
            value={stats.userCount}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#fff', fontSize: 24 }}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Statistic
            title={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Total</span>}
            value={stats.totalCount}
            prefix={<SyncOutlined />}
            valueStyle={{ color: '#fff', fontSize: 24 }}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Statistic
            title={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Skipped</span>}
            value={stats.skipCount}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#fff', fontSize: 24 }}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Statistic
            title={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Failed</span>}
            value={stats.failCount}
            prefix={<CloseCircleOutlined />}
            valueStyle={{ color: '#fff', fontSize: 24 }}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <div>
            <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14, marginBottom: 4 }}>
              <FieldTimeOutlined /> Total Duration
            </div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 600 }}>
              {formatDuration(stats.totalDuration)}
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <div>
            <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14, marginBottom: 4 }}>
              <CheckCircleOutlined /> Last Sync Time
            </div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
              {formatLastSyncTime(stats.lastSyncTime)}
            </div>
          </div>
        </Col>
      </Row>
      <div style={{ color: 'rgba(255, 255, 255, 0.85)', marginTop: 16, marginBottom: 8 }}>
        Business Type Totals
      </div>
      <Row gutter={16}>
        {businessTypeTotals.map(item => (
          <Col key={item.type} xs={24} sm={12} md={8} lg={4}>
            <Statistic
              title={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{businessTypeLabels[item.type]}</span>}
              value={item.totalCount}
              prefix={<SyncOutlined />}
              valueStyle={{ color: '#fff', fontSize: 24 }}
            />
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default UserStats;

