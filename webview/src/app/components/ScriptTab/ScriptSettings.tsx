import React, { useState, useEffect } from 'react';
import { Slider, Typography, Space, notification, List, Avatar, Spin, Button } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons';
import { ScriptConfig } from '@/app/types/index';
import { PlatformConfigApi } from '@eleapi/door/platform.config.api';

const { Title, Text } = Typography;

// 添加日志函数
const log = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
  console.log(`[ScriptSettings] ${message}`);
  if ((window as any).addLogEntry) {
    (window as any).addLogEntry(`[脚本设置] ${message}`, type);
  }
};

interface ConfigItem {
  key: keyof ScriptConfig;
  title: string;
  description: string;
  icon: React.ReactNode;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
}

export const ScriptSettings: React.FC = () => {
  const [config, setConfig] = useState<ScriptConfig>({
    likeRate: 0,
    quantity: 0,
    failure: 0,
    taskWait: 0,
    watchWait: 5000,
    detectWait: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const configItems: ConfigItem[] = [
    {
      key: 'watchWait',
      title: '观看等待时间',
      description: '每次观看视频后的等待时间',
      icon: <EyeOutlined />,
      min: 5000,
      max: 30000,
      step: 1000,
      unit: '毫秒',
      color: '#1890ff'
    }
  ];

  // 加载已保存的脚本配置
  useEffect(() => {
    loadScriptConfig();
  }, []);


  const loadScriptConfig = async () => {
    setLoading(true);
    log('正在加载脚本配置...');
    
    try {
      if (typeof PlatformConfigApi === 'undefined') {
        log('PlatformConfigApi 未初始化，无法加载配置', 'warning');
        setInitialized(true);
        return;
      }

      const platformConfigApi = new PlatformConfigApi();
      const result = await platformConfigApi.loadScriptConfig();
      log(`加载配置结果: ${JSON.stringify(result)}`);
      
      if (result.success && result.data) {
        setConfig(result.data);
        log('脚本配置加载成功', 'info');
        notification.success({
          message: '配置加载成功',
          description: '脚本配置已从本地存储加载',
          placement: 'topRight',
          duration: 2
        });
      } else {
        log('未找到已保存的脚本配置', 'info');
      }
      setInitialized(true);
    } catch (error) {
      log(`加载脚本配置失败: ${error}`, 'error');
      notification.error({
        message: '配置加载失败',
        description: '无法加载脚本配置，请检查网络连接',
        placement: 'topRight'
      });
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNow = async () => {
    setSaving(true);
    log('手动保存脚本配置...');
    
    try {
      log(`准备保存的配置数据: ${JSON.stringify(config)}`);

      if (typeof PlatformConfigApi === 'undefined') {
        log('PlatformConfigApi 未初始化，使用模拟保存', 'warning');
        await new Promise(resolve => setTimeout(resolve, 800));
        log('脚本配置保存成功 (模拟)', 'info');
        notification.success({
          message: '保存成功',
          description: '脚本配置已保存',
          placement: 'topRight',
          duration: 2
        });
        return;
      }
      
      const platformConfigApi = new PlatformConfigApi();
      const result = await platformConfigApi.saveScriptConfig(config);
      log(`保存结果: ${JSON.stringify(result)}`);
      
      if (result.success) {
        log('脚本配置保存成功', 'info');
        notification.success({
          message: '保存成功',
          description: '脚本配置已保存',
          placement: 'topRight',
          duration: 2
        });
      } else {
        log(`脚本配置保存失败: ${result.message}`, 'error');
        notification.error({
          message: '保存失败',
          description: result.message,
          placement: 'topRight'
        });
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`脚本配置保存异常: ${errorMsg}`, 'error');
      notification.error({
        message: '保存失败',
        description: `保存脚本配置失败: ${errorMsg}`,
        placement: 'topRight',
        duration: 3
      });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: keyof ScriptConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value || 0 }));
  };

  const getConfigStatusIcon = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    if (percentage === 0) return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
    if (percentage <= 50) return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '300px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" />
        <Text type="secondary">正在加载脚本配置...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* 配置头部 */}
      <div style={{ 
        marginBottom: '20px',
        padding: '14px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '10px',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={5} style={{ color: '#fff', margin: 0, fontSize: '16px' }}>
              脚本执行配置
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
              调节参数，手动保存
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SaveOutlined />
            <Text style={{ color: '#fff', fontSize: '12px' }}>手动保存模式</Text>
          </div>
        </div>
      </div>

      {/* 配置项列表 */}
      <List
        itemLayout="vertical"
        dataSource={configItems}
        renderItem={(item) => (
          <List.Item
            style={{
              padding: '16px',
              marginBottom: '10px',
              background: '#fff',
              borderRadius: '8px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0',
              transition: 'all 0.3s ease'
            }}
          >
            <List.Item.Meta
              avatar={
                <Avatar 
                  style={{ 
                    backgroundColor: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  icon={item.icon}
                />
              }
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    {item.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {getConfigStatusIcon(config[item.key], item.max)}
                    <Text strong style={{ color: item.color, fontSize: '14px' }}>
                      {config[item.key]}{item.unit}
                    </Text>
                  </div>
                </div>
              }
              description={
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {item.description}
                </Text>
              }
            />
            
            {/* 滑块控制器 */}
            <div style={{ marginTop: '12px' }}>
              <Slider
                min={item.min}
                max={item.max}
                step={item.step}
                value={config[item.key]}
                onChange={(value) => updateConfig(item.key, value)}
                trackStyle={{ backgroundColor: item.color }}
                handleStyle={{ borderColor: item.color }}
                tooltip={{
                  formatter: (value) => `${value}${item.unit}`,
                  placement: 'top'
                }}
                // marks={{
                //   [item.min]: `${item.min}${item.unit}`,
                //   [Math.floor(item.max / 2)]: `${Math.floor(item.max / 2)}${item.unit}`,
                //   [item.max]: `${item.max}${item.unit}`
                // }}
              />
            </div>
          </List.Item>
        )}
      />

      {/* 保存按钮 */}
      <div style={{ 
        marginTop: '16px',
        textAlign: 'center'
      }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSaveNow}
          style={{ fontSize: '12px' }}
        >
          保存配置
        </Button>
      </div>

      {/* 底部状态信息 */}
      <div style={{ 
        marginTop: '16px',
        padding: '12px',
        background: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #e9ecef'
      }}>
        <Space size="small">
          <Text type="secondary" style={{ fontSize: '12px' }}>
            状态: 
          </Text>
          <Text type="warning" style={{ fontSize: '12px' }}>
            手动保存模式
          </Text>
        </Space>
      </div>
    </div>
  );
}; 