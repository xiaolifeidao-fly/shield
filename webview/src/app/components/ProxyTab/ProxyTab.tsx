import React, { useState, useEffect } from 'react';
import { Card, Input, InputNumber, Button, Checkbox, Space, Row, Col, message } from 'antd';
import { ProxyConfig } from '@/app/types/index';
import { ProxyConfigApi } from '@eleapi/door/proxy.config.api';

// 添加日志函数
const log = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
  console.log(`[ProxyTab] ${message}`);
  if ((window as any).addLogEntry) {
    (window as any).addLogEntry(`[代理设置] ${message}`, type);
  }
};

export const ProxyTab: React.FC = () => {
  const [config, setConfig] = useState<ProxyConfig>({
    enabled: false,
    server: '',
    port: 0,
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);

  // 加载已保存的代理配置
  useEffect(() => {
    loadProxyConfig();
  }, []);

  const loadProxyConfig = async () => {
    log('正在加载代理配置...');
    
    try {
      // 检查 ProxyConfigApi 是否可用
      if (typeof ProxyConfigApi === 'undefined') {
        log('ProxyConfigApi 未初始化，无法加载配置', 'warning');
        return;
      }

      // 实例化 API 并调用
      const proxyConfigApi = new ProxyConfigApi();
      const result = await proxyConfigApi.loadProxyConfig();
      log(`加载配置结果: ${JSON.stringify(result)}`);
      
      if (result.success && result.data) {
        // 更新本地状态
        setConfig(result.data);
        log('代理配置加载成功', 'info');
        setInitialized(true);
      } else {
        log('未找到已保存的代理配置', 'info');
      }
    } catch (error) {
      log(`加载代理配置失败: ${error}`, 'error');
    }
  };

  const updateConfig = (key: keyof ProxyConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const setButtonLoading = (key: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  };

  const handleTestProxy = async () => {
    setButtonLoading('test', true);
    try {
      if (!config.server || !config.port) {
        log('请先输入代理服务器地址和端口', 'error');
        message.error('请先输入代理服务器地址和端口');
        return;
      }

      log(`开始测试代理连接: ${config.server}:${config.port}`, 'info');
      
      // 检查 ProxyConfigApi 是否可用
      if (typeof ProxyConfigApi === 'undefined') {
        log('ProxyConfigApi 未初始化，使用模拟测试', 'warning');
        // 模拟测试结果
        await new Promise(resolve => setTimeout(resolve, 2000));
        const success = Math.random() > 0.3;
        if (success) {
          log('代理连接测试成功 (模拟)', 'info');
          log('响应时间: 120ms (模拟)', 'info');
          log('外部IP: 192.168.1.100 (模拟)', 'info');
          message.success('代理连接测试成功 (模拟)');
        } else {
          log('代理连接测试失败 (模拟)', 'error');
          message.error('代理连接测试失败 (模拟)');
        }
        return;
      }
      
      // 实例化 API 并调用
      const proxyConfigApi = new ProxyConfigApi();
      const result = await proxyConfigApi.testProxyConnection(config);
      log(`测试结果: ${JSON.stringify(result)}`);
      
      if (result.success) {
        log('代理连接测试成功', 'info');
        log(`响应时间: ${result.responseTime}ms`, 'info');
        log(`外部IP: ${result.externalIP}`, 'info');
        message.success('代理连接测试成功');
      } else {
        log(`代理连接测试失败: ${result.message}`, 'error');
        message.error(`测试失败: ${result.message}`);
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`测试代理出错: ${errorMsg}`, 'error');
      message.error(`测试失败: ${errorMsg}`);
    } finally {
      setButtonLoading('test', false);
    }
  };

  const handleSaveProxyConfig = async () => {
    setButtonLoading('save', true);
    try {
      if (config.enabled && (!config.server || !config.port)) {
        log('启用代理时，服务器地址和端口不能为空', 'error');
        message.error('启用代理时，服务器地址和端口不能为空');
        return;
      }

      log('开始保存代理配置...');
      
      // 检查 ProxyConfigApi 是否可用
      if (typeof ProxyConfigApi === 'undefined') {
        log('ProxyConfigApi 未初始化，使用模拟保存', 'warning');
        // 模拟保存成功
        await new Promise(resolve => setTimeout(resolve, 1000));
        log('代理设置保存成功 (模拟)', 'info');
        message.success('代理设置保存成功 (模拟)');
        return;
      }
      
      // 构造代理配置数据
      const proxyData = {
        type: 'proxy',
        config: config
      };
      
      log(`准备保存的配置数据: ${JSON.stringify(proxyData)}`);
      
      // 实例化 API 并调用
      const proxyConfigApi = new ProxyConfigApi();
      const result = await proxyConfigApi.saveProxyConfig(proxyData);
      log(`保存结果: ${JSON.stringify(result)}`);
      
      if (result.success) {
        log('代理配置保存成功', 'info');
        
        if (config.enabled) {
          log(`代理服务器: ${config.server}:${config.port}`, 'info');
          if (config.username) {
            log(`代理用户: ${config.username}`, 'info');
          }
        } else {
          log('代理已禁用', 'info');
        }
        
        message.success('代理配置保存成功');
      } else {
        log(`代理配置保存失败: ${result.message}`, 'error');
        message.error(`保存失败: ${result.message}`);
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`保存代理设置出错: ${errorMsg}`, 'error');
      message.error(`保存失败: ${errorMsg}`);
    } finally {
      setButtonLoading('save', false);
    }
  };

  return (
    <Card title="IP代理设置" className="app-card">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Row gutter={[10, 10]}>
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <label style={{ fontWeight: 500, color: '#555', fontSize: 13 }}>
                代理服务器
              </label>
              <Input
                placeholder="请输入代理服务器地址"
                value={config.server}
                onChange={(e) => updateConfig('server', e.target.value)}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <label style={{ fontWeight: 500, color: '#555', fontSize: 13 }}>
                端口
              </label>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="代理端口"
                min={1}
                max={65535}
                value={config.port}
                onChange={(value) => updateConfig('port', value || 0)}
              />
            </Space>
          </Col>
        </Row>

        <Row gutter={[10, 10]}>
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <label style={{ fontWeight: 500, color: '#555', fontSize: 13 }}>
                用户名
              </label>
              <Input
                placeholder="代理用户名"
                value={config.username}
                onChange={(e) => updateConfig('username', e.target.value)}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <label style={{ fontWeight: 500, color: '#555', fontSize: 13 }}>
                密码
              </label>
              <Input.Password
                placeholder="代理密码"
                value={config.password}
                onChange={(e) => updateConfig('password', e.target.value)}
              />
            </Space>
          </Col>
        </Row>

        <Checkbox
          checked={config.enabled}
          onChange={(e) => updateConfig('enabled', e.target.checked)}
        >
          启用代理
        </Checkbox>

        <Row gutter={[10, 10]}>
          <Col xs={24} sm={12}>
            <Button
              type="primary"
              className="gradient-btn"
              block
              loading={loading.test}
              onClick={handleTestProxy}
            >
              测试连接
            </Button>
          </Col>
          <Col xs={24} sm={12}>
            <Button
              type="primary"
              className="gradient-btn"
              block
              loading={loading.save}
              onClick={handleSaveProxyConfig}
            >
              保存代理配置
            </Button>
          </Col>
        </Row>
      </Space>
    </Card>
  );
}; 