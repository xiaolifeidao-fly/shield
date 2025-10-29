'use client'

import React, { useState } from 'react';
import { Layout, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './globals.css';

const { Content } = Layout;

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('script');
  const [groupCode, setGroupCode] = useState<string>('');

  const renderTabContent = () => {
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#667eea',
          borderRadius: 12,
        },
      }}
    >
      <Layout className="app-layout">
        <div className="app-container">
          
          
          <Content className="app-content">
            <div className="tab-content-wrapper">
            </div>
            
            {/* 只在非script标签页显示日志面板 */}
          </Content>
        </div>
      </Layout>
    </ConfigProvider>
  );
}