'use client'

import React from 'react';
import { Table, Button, Popconfirm, Space, Progress, Typography, Tag, Tooltip, Dropdown } from 'antd';
import { EditOutlined, DeleteOutlined, PlayCircleOutlined, StopOutlined, MoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { UserInfo, BusinessType, SyncStats } from './UserManagement.types';

const { Text } = Typography;

interface UserTableProps {
  users: UserInfo[];
  loading: boolean;
  runningUsers: Set<string>;
  onEdit: (user: UserInfo) => void;
  onDelete: (username: string) => void;
  onRun: (username: string) => void;
  onStop: (username: string) => void;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  loading,
  runningUsers,
  onEdit,
  onDelete,
  onRun,
  onStop,
}) => {

  const columns: ColumnsType<UserInfo> = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: 'Password',
      dataIndex: 'password',
      key: 'password',
      width: 150,
      render: () => '******',
    },
    {
      title: 'Business Type',
      dataIndex: 'businessType',
      key: 'businessType',
      width: 120,
      render: (type: BusinessType) => type || '-',
    },
    {
      title: 'Remark',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: 'Action',
      key: 'action',
      width: 160,
      align: 'center',
      fixed: 'right' as const,
      render: (_, record) => {
        const isRunning = record.syncStats?.running || false;
        
        // Menu items for dropdown
        const menuItems: MenuProps['items'] = [
          {
            key: 'edit',
            label: (
              <span onClick={() => onEdit(record)} style={{ cursor: 'pointer' }}>
                <EditOutlined style={{ marginRight: 8 }} />
                Edit
              </span>
            ),
          },
          {
            key: 'run',
            label: (
              <span 
                onClick={() => {
                  if (record.businessType && !isRunning && !runningUsers.has(record.username)) {
                    onRun(record.username);
                  }
                }}
                style={{ 
                  cursor: (!record.businessType || isRunning || runningUsers.has(record.username)) ? 'not-allowed' : 'pointer',
                  opacity: (!record.businessType || isRunning || runningUsers.has(record.username)) ? 0.5 : 1
                }}
              >
                <PlayCircleOutlined style={{ marginRight: 8 }} />
                Run
              </span>
            ),
            disabled: !record.businessType || isRunning || runningUsers.has(record.username),
          },
          {
            key: 'stop',
            label: (
              <span 
                onClick={() => {
                  if (isRunning) {
                    onStop(record.username);
                  }
                }}
                style={{ 
                  cursor: !isRunning ? 'not-allowed' : 'pointer',
                  opacity: !isRunning ? 0.5 : 1
                }}
              >
                <StopOutlined style={{ marginRight: 8 }} />
                Stop
              </span>
            ),
            disabled: !isRunning,
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            label: (
              <Popconfirm
                title="Are you sure you want to delete this user?"
                onConfirm={() => onDelete(record.username)}
                okText="Confirm"
                cancelText="Cancel"
                onCancel={(e) => e?.stopPropagation()}
              >
                <span style={{ cursor: 'pointer', color: '#ff4d4f' }}>
                  <DeleteOutlined style={{ marginRight: 8 }} />
                  Delete
                </span>
              </Popconfirm>
            ),
          },
        ];

        // Compact mode: show icon buttons with ellipsis dropdown menu
        return (
          <div
            style={{
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '2px',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '2px',
                overflow: 'hidden',
                flex: 1,
                justifyContent: 'center',
                minWidth: 0,
              }}
            >
              <Tooltip title="Edit">
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record)}
                  size="small"
                  style={{ padding: '0 2px', minWidth: 'auto' }}
                />
              </Tooltip>
              <Tooltip title="Run">
                <Button
                  type="link"
                  icon={<PlayCircleOutlined />}
                  onClick={() => onRun(record.username)}
                  size="small"
                  style={{ padding: '0 2px', minWidth: 'auto' }}
                  loading={runningUsers.has(record.username)}
                  disabled={!record.businessType || isRunning}
                />
              </Tooltip>
              <Tooltip title="Stop">
                <Button
                  type="link"
                  danger
                  icon={<StopOutlined />}
                  onClick={() => onStop(record.username)}
                  size="small"
                  style={{ padding: '0 2px', minWidth: 'auto' }}
                  disabled={!isRunning}
                />
              </Tooltip>
              <Popconfirm
                title="Are you sure you want to delete this user?"
                onConfirm={() => onDelete(record.username)}
                okText="Confirm"
                cancelText="Cancel"
              >
                <Tooltip title="Delete">
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    style={{ padding: '0 2px', minWidth: 'auto' }}
                  />
                </Tooltip>
              </Popconfirm>
            </div>
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Tooltip title="More actions">
                <Button
                  type="link"
                  icon={<MoreOutlined />}
                  size="small"
                  style={{ padding: '0 2px', minWidth: 'auto', flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                />
              </Tooltip>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds && seconds !== 0) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Render expanded row: display syncStats
  const expandedRowRender = (record: UserInfo) => {
    const { syncStats } = record;
    const isRunning = syncStats?.running || false;
    
    if (!syncStats) {
      return (
        <div style={{ padding: '16px', background: '#fafafa' }}>
          <Text type="secondary">No sync statistics available</Text>
        </div>
      );
    }

    const { totalCount, successCount, skipCount, failCount, lastSyncTime, startTime, duration } = syncStats;
    
    // Calculate progress percentage (if there is total count)
    const progressPercent = totalCount > 0 
      ? Math.round(((successCount + skipCount) / totalCount) * 100)
      : 0;

    return (
      <div style={{ padding: '16px', background: '#fafafa' }}>
        <div style={{ marginBottom: '12px' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <Text strong>Sync Statistics</Text>
              <Space size="middle">
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Status: </Text>
                  <Tag color={isRunning ? 'processing' : 'default'}>
                    {isRunning ? 'Running' : 'Stopped'}
                  </Tag>
                </div>
                {startTime && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Start Time: </Text>
                    <Text style={{ fontSize: '12px' }}>
                      {new Date(startTime).toLocaleString('en-US')}
                    </Text>
                  </div>
                )}
                {duration !== undefined && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Duration: </Text>
                    <Text strong style={{ fontSize: '12px' }}>{formatDuration(duration)}</Text>
                  </div>
                )}
                {lastSyncTime && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Last Sync: </Text>
                    <Text style={{ fontSize: '12px' }}>
                      {new Date(lastSyncTime).toLocaleString('en-US')}
                    </Text>
                  </div>
                )}
              </Space>
            </div>
            
            {/* Show progress bar only when running */}
            {isRunning && totalCount > 0 && (
              <Progress
                percent={progressPercent}
                status={failCount > 0 ? 'exception' : 'active'}
                format={(percent) => `${successCount + skipCount} / ${totalCount}`}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            )}
            
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <Text type="secondary">Total: </Text>
                <Text strong>{totalCount}</Text>
              </div>
              <div>
                <Text type="secondary">Success: </Text>
                <Text strong style={{ color: '#52c41a' }}>{successCount}</Text>
              </div>
              <div>
                <Text type="secondary">Skipped: </Text>
                <Text strong style={{ color: '#faad14' }}>{skipCount}</Text>
              </div>
              <div>
                <Text type="secondary">Failed: </Text>
                <Text strong style={{ color: '#ff4d4f' }}>{failCount}</Text>
              </div>
            </div>
          </Space>
        </div>
      </div>
    );
  };

  return (
    <Table
      columns={columns}
      dataSource={users}
      rowKey="id"
      loading={loading}
      expandable={{
        expandedRowRender,
        expandRowByClick: false,
        rowExpandable: () => true,
        defaultExpandAllRows: true, // Default expand all rows to display syncStats
      }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} records`,
      }}
      scroll={{ x: 'max-content' }}
    />
  );
};

export default UserTable;

