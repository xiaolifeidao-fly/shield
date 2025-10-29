import React, { useState, useEffect } from 'react';
import { Card, Checkbox, Input, Button, Space, Row, Col, Collapse, message, Typography } from 'antd';
import { RightOutlined, DownOutlined } from '@ant-design/icons';
import { PlatformInfo, PlatformName } from '@/app/types/index';
import { PlatformConfigApi } from '@eleapi/door/platform.config.api';

const { Panel } = Collapse;
const { Title, Text } = Typography;

// 添加日志函数
const log = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
  console.log(`[PlatformSettings] ${message}`);
  if ((window as any).addLogEntry) {
    (window as any).addLogEntry(`[平台设置] ${message}`, type);
  }
};

// 平台联系信息
// const platformContacts = {
//   xm: {
//     telegram: '@XMPTKF',
//     group: 'https://t.me/XMPTTZQ'
//   },
//   ak: {
//     telegram: '@AKPT0001',
//     group: ''
//   },
//   syc: {
//     telegram: '@SanYeCaoPingTai',
//     group: ''
//   },
//   sh: {
//     telegram: '@Hongzai939',
//     group: 'http://t.me/sihaipingtai'
//   }
// };

const platformContacts = {}

export const PlatformSettings: React.FC = () => {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([
    { key: 'xm', name: '熊猫', enabled: false, user: '', pass: '' },
    { key: 'ak', name: 'AK', enabled: false, user: '', pass: '' },
    { key: 'syc', name: '三叶草', enabled: false, user: '', pass: '' },
    { key: 'sh', name: '四海', enabled: false, user: '', pass: '' },
    { key: 'nm', name: '柠檬', enabled: false, user: '', pass: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // 加载已保存的平台配置
  useEffect(() => {
    loadPlatformConfig();
  }, []);

  const loadPlatformConfig = async () => {
    log('正在加载平台配置...');
    
    try {
      // 检查 PlatformConfigApi 是否可用
      if (typeof PlatformConfigApi === 'undefined') {
        log('PlatformConfigApi 未初始化，无法加载配置', 'warning');
        return;
      }

      // 实例化 API 并调用
      const platformConfigApi = new PlatformConfigApi();
      const result = await platformConfigApi.loadPlatformConfig();
      log(`加载配置结果: ${JSON.stringify(result)}`);
      
      if (result.success && result.data) {
        const savedPlatforms = result.data;
        
        // 更新本地状态
        setPlatforms(prev => 
          prev.map(platform => {
            const savedPlatform = savedPlatforms.find((p: any) => p.key === platform.key);
            if (savedPlatform) {
              return {
                ...platform,
                enabled: savedPlatform.enabled || false,
                user: savedPlatform.user || '',
                pass: savedPlatform.pass || ''
              };
            }
            return platform;
          })
        );
        
        log('平台配置加载成功', 'info');
        setInitialized(true);
      } else {
        log('未找到已保存的平台配置', 'info');
      }
    } catch (error) {
      log(`加载平台配置失败: ${error}`, 'error');
    }
  };

  const updatePlatform = (key: PlatformName, field: 'enabled' | 'user' | 'pass', value: any) => {
    setPlatforms(prev => 
      prev.map(platform => 
        platform.key === key 
          ? { ...platform, [field]: value }
          : platform
      )
    );
  };

  const handleSavePlatformConfig = async () => {
    setLoading(true);
    log('开始保存平台配置...');
    
    try {
      // 构造平台配置数据
      const platformData = {
        type: 'platform',
        config: platforms
      };
      
      log(`准备保存的配置数据: ${JSON.stringify(platformData)}`);
      
      // 检查 PlatformConfigApi 是否可用
      if (typeof PlatformConfigApi === 'undefined') {
        log('PlatformConfigApi 未初始化，使用模拟保存', 'warning');
        // 模拟保存成功
        await new Promise(resolve => setTimeout(resolve, 1000));
        log('平台配置保存成功 (模拟)', 'info');
        message.success('平台配置保存成功 (模拟)');
        return;
      }
      
      // 实例化 API 并调用
      const platformConfigApi = new PlatformConfigApi();
      const result = await platformConfigApi.savePlatformConfig(platformData);
      log(`保存结果:`,result);
      
      if (result.success) {
        log('平台配置保存成功', 'info');
        message.success('平台配置保存成功');
      } else {
        log(`平台配置保存失败: ${result.message}`, 'error');
        message.error(`保存失败: ${result.message}`);
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`平台配置保存异常: ${errorMsg}`, 'error');
      message.error(`保存失败: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const renderPlatformItem = (platform: PlatformInfo) => (
    <div key={platform.key} className="platform-item" style={{ marginBottom: 5, padding: '5px', background: '#fafafa', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
      <Row gutter={[12, 6]} align="middle" style={{ width: '100%' }}>
        <Col xs={24} sm={24} md={6}>
          <Checkbox
            checked={platform.enabled}
            onChange={(e) => updatePlatform(platform.key, 'enabled', e.target.checked)}
            style={{ fontSize: '14px' }}
          >
            {platform.name}
          </Checkbox>
        </Col>
        <Col xs={24} sm={24} md={9}>
          <Space.Compact style={{ width: '100%' }}>
            <span style={{ 
              display: 'inline-block', 
              width: 35, 
              textAlign: 'right', 
              marginRight: 6,
              fontSize: 12,
              color: '#666'
            }}>
              帐号:
            </span>
            <Input
              placeholder="请输入帐号"
              value={platform.user}
              onChange={(e) => updatePlatform(platform.key, 'user', e.target.value)}
              size="small"
            />
          </Space.Compact>
        </Col>
        <Col xs={24} sm={24} md={9}>
          <Space.Compact style={{ width: '100%' }}>
            <span style={{ 
              display: 'inline-block', 
              width: 35, 
              textAlign: 'right', 
              marginRight: 6,
              fontSize: 12,
              color: '#666'
            }}>
              密码:
            </span>
            <Input.Password
              placeholder="请输入密码"
              value={platform.pass}
              onChange={(e) => updatePlatform(platform.key, 'pass', e.target.value)}
              size="small"
            />
          </Space.Compact>
        </Col>
        
        {/* 平台联系信息 */}
        {/* <Col xs={24} style={{ paddingLeft: 48, marginTop: 4 }}>
          <div style={{ fontSize: 12, color: '#888' }}>
            平台开户请联系：
            <span style={{ marginLeft: 8, color: '#1890ff' }}>{platformContacts[platform.key].telegram}</span>
            {platformContacts[platform.key].group && (
              <a 
                href={platformContacts[platform.key].group} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ marginLeft: 16, color: '#1890ff' }}
              >
                {platform.name}电报群
              </a>
            )}
          </div>
        </Col> */}
      </Row>
    </div>
  );

  return (
    <div style={{ padding: '0' }}>
      {/* 平台设置头部 */}
      <div style={{ 
        marginBottom: '20px',
        padding: '14px',
        background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
        borderRadius: '10px',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={5} style={{ color: '#fff', margin: 0, fontSize: '16px' }}>
              平台设置
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
              配置平台账号信息
            </Text>
          </div>
        </div>
      </div>
      
      <Collapse 
        ghost
        defaultActiveKey={['1']}
        expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
        style={{ background: 'transparent' }}
      >
        <Panel header="平台账号配置" key="1" style={{ background: '#fff', border: 'none', borderRadius: '8px' }}>
          <div className="platform-settings">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {platforms.map(renderPlatformItem)}
              
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Button
                  type="primary"
                  className="gradient-btn"
                  loading={loading}
                  onClick={handleSavePlatformConfig}
                  size="small"
                  style={{
                    background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                    border: 'none',
                    borderRadius: '6px'
                  }}
                >
                  保存设置
                </Button>
              </div>
            </Space>
          </div>
        </Panel>
      </Collapse>
    </div>
  );
}; 