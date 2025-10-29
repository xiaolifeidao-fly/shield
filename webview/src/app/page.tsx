'use client'

import React, { useState } from 'react';
import { Layout, ConfigProvider } from 'antd';
import { Header } from './components/Header/Header';
import { ScriptTab } from './components/ScriptTab/ScriptTab';
import { ProxyTab } from './components/ProxyTab/ProxyTab';
import { InstanceTab } from './components/InstanceTab/InstanceTab';
import { HelpTab } from './components/HelpTab/HelpTab';
import { LogPanel } from './components/LogPanel/LogPanel';
import zhCN from 'antd/locale/zh_CN';
import './globals.css';

const { Content } = Layout;

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('script');
  const [groupCode, setGroupCode] = useState<string>('');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'script':
        return <ScriptTab groupCode={groupCode} />;
      case 'proxy':
        return <ProxyTab />;
      case 'instance':
        return <InstanceTab groupCode={groupCode} />;
      case 'help':
        return <HelpTab />;
      default:
        return <ScriptTab groupCode={groupCode} />;
    }
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
          <Header 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            groupCode={groupCode}
            onGroupChange={setGroupCode}
          />
          
          <Content className="app-content">
            <div className="tab-content-wrapper">
              {renderTabContent()}
            </div>
            
            {/* 只在非script标签页显示日志面板 */}
          </Content>
        </div>
      </Layout>
    </ConfigProvider>
  );
}