import React from 'react';
import { Row, Col, Card } from 'antd';
import { ScriptSettings } from './ScriptSettings';
import { PlatformSettings } from './PlatformSettings';
import { GuardSettings } from './GuardSettings';

interface ScriptTabProps {
  groupCode: string;
}

export const ScriptTab: React.FC<ScriptTabProps> = ({ groupCode }) => {
  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card 
        title="脚本管理面板" 
        className="app-card"
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          marginBottom: '16px',
          border: 'none'
        }}
        styles={{ 
          header: {
            color: '#fff',
            borderBottom: 'none',
            fontSize: '20px',
            fontWeight: 600
          }
        }}
      />
      
      <Row gutter={[16, 16]} style={{ minHeight: 'calc(100vh - 150px)' }}>
        <Col xs={24} lg={8}>
          <div style={{ 
            background: '#fff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            height: '600px',
            overflowY: 'auto'
          }}>
            <ScriptSettings />
          </div>
        </Col>
        
        <Col xs={24} lg={8}>
          <div style={{ 
            background: '#fff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            height: '600px',
            overflowY: 'auto'
          }}>
            <PlatformSettings />
          </div>
        </Col>
        
        <Col xs={24} lg={8}>
          <div style={{ 
            background: '#fff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            height: '600px',
            overflowY: 'auto'
          }}>
            <GuardSettings groupCode={groupCode} />
          </div>
        </Col>
      </Row>
    </div>
  );
}; 