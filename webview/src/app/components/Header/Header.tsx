import React, { useState, useEffect } from 'react';
import { Tabs, Space, Badge, Select, Typography } from 'antd';
import { 
  CodeOutlined, 
  GlobalOutlined, 
  AppstoreOutlined, 
  QuestionCircleOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { PlatformConfigApi } from '@eleapi/door/platform.config.api';
import { BusinessGroup } from '@model/business.entity';

const { Text } = Typography;

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  groupCode: string;
  onGroupChange: (groupCode: string) => void;
}

const tabItems = [
  {
    key: 'script',
    label: (
      <Space size="small">
        <CodeOutlined />
        <span>脚本管理</span>
      </Space>
    ),
  },
  {
    key: 'proxy',
    label: (
      <Space size="small">
        <GlobalOutlined />
        <span>IP代理设置</span>
      </Space>
    ),
  },
  {
    key: 'instance',
    label: (
      <Space size="small">
        <AppstoreOutlined />
        <span>多开管理</span>
        <Badge 
          count="Hot" 
          style={{ 
            backgroundColor: '#ff4d4f',
            fontSize: '10px',
            height: '16px',
            lineHeight: '14px',
            minWidth: '24px'
          }} 
        />
      </Space>
    ),
  },
  {
    key: 'help',
    label: (
      <Space size="small">
        <QuestionCircleOutlined />
        <span>使用说明</span>
      </Space>
    ),
  },
];

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, groupCode, onGroupChange }) => {
  const [businessGroups, setBusinessGroups] = useState<Array<{code: string, name: string, description: string}>>([]);
  const [loading, setLoading] = useState(false);

  // 加载业务分组列表
  useEffect(() => {
    loadBusinessGroups();
  }, []);

  const loadBusinessGroups = async () => {
    try {
      setLoading(true);
      const platformConfigApi = new PlatformConfigApi();
      const result = await platformConfigApi.getBusinessGroups();
      if (result.success && result.data) {
        setBusinessGroups(result.data);
        // 如果没有选中的分组，默认选中第一个
        if (!groupCode && result.data.length > 0) {
          onGroupChange(result.data[0].code);
        }
      }
    } catch (error) {
      console.error('加载业务分组失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="app-header" 
      style={{
        background: 'linear-gradient(135deg,rgb(191, 220, 222) 0%,rgb(136, 184, 187) 100%)',
        padding: '16px 32px',
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 业务分组选择器 */}
      <div style={{ 
        marginBottom: '16px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '12px'
        }}>
          <TeamOutlined style={{ color: '#fff', fontSize: '16px' }} />
          <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
            业务分组:
          </Text>
          <Select
            value={groupCode}
            onChange={onGroupChange}
            loading={loading}
            style={{ 
              minWidth: '120px',
              borderRadius: '8px'
            }}
            options={businessGroups.map(group => ({
              value: group.code,
              label: group.name
            }))}
            placeholder="选择业务分组"
          />
        </div>
      </div>

      {/* 导航标签 */}
      <div style={{ 
        marginTop: '8px',
        position: 'relative',
        zIndex: 1
      }}>
        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          items={tabItems}
          centered
          size="large"
          tabBarStyle={{
            borderBottom: 'none',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '8px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            marginBottom: 0
          }}
        />
      </div>

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .ant-tabs-tab {
          color: rgba(43, 130, 83, 0.8) !important;
          border: none !important;
          background: transparent !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
        }
        
        .ant-tabs-tab:hover {
          color: #fff !important;
          background: rgba(56, 205, 202, 0.1) !important;
          border-radius: 12px !important;
          transform: translateY(-1px) !important;
        }
        
        .ant-tabs-tab-active {
          color: #fff !important;
          background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%) !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4) !important;
          transform: translateY(-2px) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
        }
        
        .ant-tabs-ink-bar {
          display: none !important;
        }
        
        .ant-tabs-nav {
          margin-bottom: 0 !important;
        }
      `}</style>
    </div>
  );
}; 