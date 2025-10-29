import React, { useState } from 'react';
import { Card, Switch, InputNumber, Checkbox, Button, Space, Row, Col, Select, Tooltip } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { BasicConfig } from '../../types';

const { Option } = Select;

export const BasicSettings: React.FC = () => {
  const [config, setConfig] = useState<BasicConfig>({
    slideStats: false,
    port: "0",
    noVideo: false,
    autoEnd: false,
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const updateConfig = (key: keyof BasicConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const setButtonLoading = (key: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  };

  const handleSaveParams = async () => {
    setButtonLoading('save', true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      (window as any).addLogEntry?.('参数保存成功', 'info');
    } catch (error) {
      (window as any).addLogEntry?.('保存失败: ' + error, 'error');
    } finally {
      setButtonLoading('save', false);
    }
  };

  const handleScanLogin = async () => {
    setButtonLoading('scan', true);
    try {
      (window as any).addLogEntry?.('正在启动扫码登录...', 'info');
      await new Promise(resolve => setTimeout(resolve, 1000));
      (window as any).addLogEntry?.('请使用手机扫描二维码', 'info');
    } catch (error) {
      (window as any).addLogEntry?.('扫码登录失败: ' + error, 'error');
    } finally {
      setButtonLoading('scan', false);
    }
  };

  const handleCkLogin = async () => {
    setButtonLoading('ck', true);
    try {
      (window as any).addLogEntry?.('CK登录验证中...', 'info');
      await new Promise(resolve => setTimeout(resolve, 1500));
      (window as any).addLogEntry?.('CK登录成功', 'info');
    } catch (error) {
      (window as any).addLogEntry?.('CK登录失败: ' + error, 'error');
    } finally {
      setButtonLoading('ck', false);
    }
  };

  const handleStartRunning = async () => {
    setButtonLoading('start', true);
    try {
      (window as any).addLogEntry?.('开始运行脚本...', 'info');
      await new Promise(resolve => setTimeout(resolve, 1000));
      (window as any).addLogEntry?.('脚本运行中...', 'info');
    } catch (error) {
      (window as any).addLogEntry?.('启动失败: ' + error, 'error');
    } finally {
      setButtonLoading('start', false);
    }
  };

  const handleStopRunning = async () => {
    setButtonLoading('stop', true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      (window as any).addLogEntry?.('脚本已停止运行', 'warning');
    } catch (error) {
      (window as any).addLogEntry?.('停止失败: ' + error, 'error');
    } finally {
      setButtonLoading('stop', false);
    }
  };

  return (
    <Card title="基本设置" className="app-card">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Row gutter={[10, 10]}>
          <Col xs={24} sm={12}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>滑动统计数量</span>
              <Switch
                checked={config.slideStats}
                onChange={(checked) => updateConfig('slideStats', checked)}
              />
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>启动端口:</span>
              <InputNumber
                style={{ flex: 1 }}
                min={0}
                max={65535}
                value={Number(config.port)}
                onChange={(value) => updateConfig('port', String(value || "0"))}
                placeholder="输入端口号"
              />
              <Select
                style={{ width: 120 }}
                placeholder="选择配置"
                suffixIcon={<DownOutlined />}
                dropdownStyle={{ minWidth: 200 }}
              >
                <Option value="8080">端口 8080</Option>
                <Option value="8081">端口 8081</Option>
                <Option value="8082">端口 8082</Option>
              </Select>
            </div>
          </Col>
        </Row>

        <div style={{ fontSize: 12, color: '#666', marginTop: -8 }}>
           可以直接输入端口号，或点击选择配置从已保存的配置中选择
        </div>

        <Row gutter={[16, 8]}>
          <Col>
            <Checkbox
              checked={config.noVideo}
              onChange={(e) => updateConfig('noVideo', e.target.checked)}
            >
              不加载视频
            </Checkbox>
          </Col>
          <Col>
            <Checkbox
              checked={config.autoEnd}
              onChange={(e) => updateConfig('autoEnd', e.target.checked)}
            >
              自动结束
            </Checkbox>
          </Col>
        </Row>

        <Row gutter={[8, 8]}>
          <Col xs={12} sm={6}>
            <Button
              block
              loading={loading.save}
              onClick={handleSaveParams}
            >
              保存参数
            </Button>
          </Col>
          <Col xs={12} sm={6}>
            <Button
              block
              loading={loading.scan}
              onClick={handleScanLogin}
            >
              扫码登录
            </Button>
          </Col>
          <Col xs={12} sm={6}>
            <Button
              block
              loading={loading.ck}
              onClick={handleCkLogin}
            >
              CK登录
            </Button>
          </Col>
          <Col xs={12} sm={6}>
            <Button
              type="primary"
              className="success-btn"
              block
              loading={loading.start}
              onClick={handleStartRunning}
            >
              开始运行
            </Button>
          </Col>
          <Col xs={24} sm={12}>
            <Button
              danger
              className="danger-btn"
              block
              loading={loading.stop}
              onClick={handleStopRunning}
            >
              停止运行
            </Button>
          </Col>
        </Row>
      </Space>
    </Card>
  );
}; 