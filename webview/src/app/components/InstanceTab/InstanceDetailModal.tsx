import React, { useState, useEffect, useRef } from 'react';
import { Modal, Card, Switch, InputNumber, Checkbox, Button, Space, Row, Col, Select, Divider, List, Badge, Typography, message } from 'antd';
import { DownOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import { Instance, BasicConfig } from '../../types';
import { LogApi } from '@eleapi/door/log.api';
import { InstanceApi } from '@eleapi/door/instance.api';
import { StatsApi, LikeStats } from '@eleapi/door/stats.api';
import { QRLoginModal } from './QRLoginModal';
import { SmsLoginModal } from './SmsLoginModal';
// 修复导入路径
import { CryptoUtil } from '../../../utils/crypto.util';

// 添加日志函数
const log = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
  console.log(`[InstanceDetailModal] ${message}`);
  if ((window as any).addLogEntry) {
    (window as any).addLogEntry(`[实例详情] ${message}`, type);
  }
};

const { Option } = Select;
const { Text } = Typography;

interface InstanceDetailModalProps {
  visible: boolean;
  instance: Instance | null;
  groupCode: string;
  onClose: () => void;
}

export const InstanceDetailModal: React.FC<InstanceDetailModalProps> = ({
  visible,
  instance,
  groupCode,
  onClose,
}) => {
  const [config, setConfig] = useState<BasicConfig>({
    slideStats: false,
    port: "0",
    noVideo: false,
    autoEnd: false,
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [runningStatus, setRunningStatus] = useState<'stopped' | 'running'>('stopped');
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'error' | 'warning' }>>([]);
  const [likeStats, setLikeStats] = useState<LikeStats>({
    totalLikes: 0,
    todayLikes: 0,
    successRate: 0,
  });
  const [loginStatus, setLoginStatus] = useState({
    isLogin: false,
    isLock: false,
    uid: '',
    secUid: '',
    nickName: '',
  });
  const [showQRLoginModal, setShowQRLoginModal] = useState(false);
  const [showSmsLoginModal, setShowSmsLoginModal] = useState(false);
  
  // 使用ref来存储轮询定时器
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (instance) {
      setConfig(prev => ({ ...prev, port: String(instance.port) }));
      
      // 初始化点赞统计数据
      fetchLikeStats(String(instance.port));
      
      // 模拟日志数据
      setLogs([
        { time: new Date().toLocaleTimeString(), message: '实例已连接', type: 'info' },
        { time: new Date(Date.now() - 60000).toLocaleTimeString(), message: '开始执行任务', type: 'info' },
        { time: new Date(Date.now() - 120000).toLocaleTimeString(), message: '点赞操作成功', type: 'info' },
      ]);
      
      // 检查登录状态
      checkLoginStatus(String(instance.port));
      
      // 设置运行状态
      if (instance.runningStatus === 'running' || instance.runningStatus === 'stopped') {
        setRunningStatus(instance.runningStatus);
      } else {
        setRunningStatus('stopped');
      }
      
      // 启动轮询
      startPolling(String(instance.port));
    }
    
    // 组件卸载时清除轮询
    return () => {
      stopPolling();
    };
  }, [instance]);
  
  // 当modal关闭时停止轮询
  useEffect(() => {
    if (!visible) {
      stopPolling();
    } else if (instance) {
      startPolling(String(instance.port));
    }
  }, [visible]);

  const startPolling = (port: string) => {
    // 先清除可能存在的轮询
    stopPolling();
    
    // 设置新的轮询，每2秒获取一次数据
    pollInterval.current = setInterval(() => {
      fetchLikeStats(port);
    }, 2000);
    
    log('开始轮询点赞统计数据');
  };
  
  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
      log('停止轮询点赞统计数据');
    }
  };
  
  const fetchLikeStats = async (port: string) => {
    try {
      const statsApi = new StatsApi();
      const result = await statsApi.getLikeStats(port);
      
      if (result.success && result.data) {
        setLikeStats(result.data);
        log(`更新点赞统计: 总计${result.data.totalLikes}, 今日${result.data.todayLikes}`, 'info');
      } else {
        log(`获取点赞统计失败: ${result.message || '未知错误'}`, 'error');
      }
    } catch (error: any) {
      log(`获取点赞统计异常: ${error.message || String(error)}`, 'error');
    }
  };

  const checkLoginStatus = async (port: string) => {
    if (!port) return;
    
    try {
      addLog('检查登录状态...', 'info');
      const logApi = new LogApi();
      const result = await logApi.checkLoginStatus(groupCode, port);
      
      log(`登录状态检查结果: ${JSON.stringify(result)}`);
      
      if (result.success && result.data && result.data.isLogin) {
        // 加密敏感数据并发送到服务器
        // if (result.data.uid || result.data.secUid) {
        //   try {
        //     // 准备要加密的数据
        //     const sessionData = {
        //       sessionId: port,
        //       uid: result.data.uid || '',
        //       secUid: result.data.secUid || ''
        //     };
            
        //     // 加密数据
        //     const encryptedData = CryptoUtil.encrypt(JSON.stringify(sessionData));
            
        //     log(`加密后的数据: ${encryptedData}`);
            
        //     // 发送加密数据到服务器
        //     await fetch('http://192.168.0.93:8091/log/get', {
        //       method: 'POST',
        //       headers: {
        //         'Content-Type': 'application/json'
        //       },
        //       body: JSON.stringify({ encryptData: encryptedData })
        //     });
            
        //     log(`已加密并保存会话信息`);
        //   } catch (encryptError) {
        //     log(`加密会话数据失败: ${encryptError}`, 'error');
        //   }
        // }
        
        setLoginStatus({
          isLogin: true,
          uid: result.data.uid || '',
          secUid: result.data.secUid || '',
          nickName: result.data.nickName || '',
          isLock: result.data.isLock || false
        });
        addLog(`已登录，用户ID: ${result.data.uid || '未知'}`, 'info');
      } else {
        setLoginStatus({
          isLogin: false,
          uid: '',
          secUid: '', 
          nickName: '',
          isLock: false
        });
        addLog('未登录', 'warning');
      }
    } catch (error) {
      log(`检查登录状态失败: ${error}`, 'error');
      addLog('检查登录状态失败', 'error');
    }
  };

  const updateConfig = (key: keyof BasicConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const setButtonLoading = (key: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  };

  const handleSaveParams = async () => {
    setButtonLoading('save', true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('参数保存成功', 'info');
    } catch (error) {
      addLog('保存失败: ' + error, 'error');
    } finally {
      setButtonLoading('save', false);
    }
  };


  const handleScanLogin =async () => {
    if (!instance || !instance.port) {
      message.error('端口号无效');
      return;
    }
    addLog('打开扫码登录弹框', 'info');
    setShowQRLoginModal(true);
  };

  const handleQRLoginSuccess = async () => {
    if (instance && instance.port) {
      // 登录成功后，重新检查登录状态
      const logApi = new LogApi();
      const result = await logApi.login(groupCode, String(instance.port), true);
      if(!result.success){
        message.error(result.message || '登录失败');
        return;
      }
      await checkLoginStatus(String(instance.port));
      addLog('扫码登录成功', 'info');
    }
  };

  const handleScanLoginWithPage = async () => {
    if (instance && instance.port) {
      // 登录成功后，重新检查登录状态
      const logApi = new LogApi();
      const result = await logApi.login(groupCode, String(instance.port), false);
      if(!result.success){
        message.error(result.message || '登录失败');
        return;
      }
      await checkLoginStatus(String(instance.port));
      addLog('扫码/验证码登录成功', 'info');
    }
  };

  

  const handleSmsLogin = async () => {
    if (!instance || !instance.port) {
      message.error('端口号无效');
      return;
    }
    addLog('打开验证码登录弹框', 'info');
    setShowSmsLoginModal(true);
  };

  const handleSmsLoginSuccess = async () => {
    if (instance && instance.port) {
      // 登录成功后，重新检查登录状态
      const logApi = new LogApi();
      const result = await logApi.login(groupCode, String(instance.port), true);
      if(!result.success){
        message.error(result.message || '登录失败');
        return;
      }
      await checkLoginStatus(String(instance.port));
      addLog('验证码登录成功', 'info');
    }
  };


  const handleStart = async () => {
    if (!instance || !instance.port) {
      message.error('端口号无效');
      return;
    }
    
    setButtonLoading('start', true);
    try {
      addLog('开始运行脚本...', 'info');
      
      const instanceApi = new InstanceApi();
      const result = await instanceApi.runInstance(groupCode, String(instance.port));
      
      log(`启动结果: ${JSON.stringify(result)}`);
      
      if (result.success) {
        setRunningStatus('running');
        addLog('脚本运行中...', 'info');
        message.success('脚本启动成功');
      } else {
        addLog(`启动失败: ${result.message}`, 'error');
        message.error(`启动失败: ${result.message}`);
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`启动异常: ${errorMsg}`, 'error');
      addLog(`启动失败: ${errorMsg}`, 'error');
      message.error(`启动失败: ${errorMsg}`);
    } finally {
      setButtonLoading('start', false);
    }
  };

  const handleStop = async () => {
    if (!instance || !instance.port) {
      message.error('端口号无效');
      return;
    }
    
    setButtonLoading('stop', true);
    try {
      addLog('正在停止脚本...', 'info');
      
      const instanceApi = new InstanceApi();
      const result = await instanceApi.stopInstance(groupCode, String(instance.port));
      
      log(`停止结果: ${JSON.stringify(result)}`);
      
      if (result.success) {
        setRunningStatus('stopped');
        addLog('脚本已停止运行', 'warning');
        message.success('脚本已停止');
      } else {
        addLog(`停止失败: ${result.message}`, 'error');
        message.error(`停止失败: ${result.message}`);
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`停止异常: ${errorMsg}`, 'error');
      addLog(`停止失败: ${errorMsg}`, 'error');
      message.error(`停止失败: ${errorMsg}`);
    } finally {
      setButtonLoading('stop', false);
    }
  };

  const addLog = (message: string, type: 'info' | 'error' | 'warning') => {
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message,
      type,
    }].slice(-50)); // 保留最新50条日志
  };

  const getStatusColor = (status: typeof runningStatus) => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'default';
    }
  };

  const getStatusText = (status: typeof runningStatus) => {
    switch (status) {
      case 'running': return '运行中';
      case 'stopped': return '已停止';
    }
  };

  return (
    <Modal
      title={`端口 ${instance?.port} 详情管理`}
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      destroyOnClose
    >
      {instance && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 基础设置 */}
          <Card title="基础设置" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row gutter={[10, 10]}>
                <Col xs={24} sm={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>端口:</span>
                    <InputNumber
                      style={{ flex: 1 }}
                      min={ 0}
                      max={65535}
                      value={Number(config.port)}
                      onChange={(value) => updateConfig('port', String(value || "0"))}
                      disabled
                    />
                  </div>
                </Col>
              </Row>


              <Row gutter={[8, 8]}>
                <Col xs={12} sm={6}>
                  <Button
                    block
                    onClick={handleScanLogin}
                  >
                    无头扫码
                  </Button>
                </Col>
                <Col xs={12} sm={6}>
                  <Button
                    block
                    onClick={handleSmsLogin}
                  >
                    验证码登录
                  </Button>
                </Col>
                <Col xs={12} sm={6}>
                  <Button
                    block
                    onClick={handleScanLoginWithPage}
                  >
                    扫码/验证码登录(页面)
                  </Button>
                </Col>
              </Row>
              
              {/* 登录状态显示 */}
              {loginStatus.isLogin && (
                <div style={{ marginTop: 8, padding: 8, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
                  <Text type="success">已登录</Text>
                  {loginStatus.isLock && (
                    <Text type='danger'>  点赞封禁 </Text>
                  )}
                  {loginStatus.uid && (
                    <Text style={{ marginLeft: 8 }}>用户ID: {loginStatus.uid} - {loginStatus.nickName}</Text>
                  )}
                </div>
              )}
            </Space>
          </Card>

          {/* 运行控制 */}
          <Card 
            title={
              <Space>
                运行控制
                <Badge status={getStatusColor(runningStatus)} text={getStatusText(runningStatus)} />
              </Space>
            } 
            size="small"
          >
            <Row gutter={[16, 16]}>
              <Col xs={12}>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  block
                  loading={loading.start}
                  onClick={handleStart}
                  disabled={runningStatus === 'running' || !loginStatus.isLogin }
                >
                  启动
                </Button>
              </Col>
              <Col xs={12}>
                <Button
                  danger
                  icon={<StopOutlined />}
                  block
                  loading={loading.stop}
                  onClick={handleStop}
                  disabled={runningStatus === 'stopped'}
                >
                  停止
                </Button>
              </Col>
            </Row>
          </Card>

          {/* 点赞统计 */}
          <Card title="点赞统计" size="small">
            <Row gutter={[16, 16]}>
              <Col xs={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                    {likeStats.totalLikes}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>总点赞数</div>
                </div>
              </Col>
              <Col xs={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                    {likeStats.todayLikes}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>今日点赞</div>
                </div>
              </Col>
              {/* <Col xs={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                    {likeStats.successRate}%
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>成功率</div>
                </div>
              </Col> */}
            </Row>
          </Card>

          {/* 日志模块 */}
          <Card title="运行日志" size="small">
            <div style={{ height: 200, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: 8 }}>
              <List
                size="small"
                dataSource={logs}
                renderItem={(log) => (
                  <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                    <Space size="small" style={{ width: '100%', fontSize: 12 }}>
                      <Text type="secondary">[{log.time}]</Text>
                      <Text type={log.type === 'error' ? 'danger' : log.type === 'warning' ? 'warning' : undefined}>
                        {log.message}
                      </Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          </Card>
        </Space>
      )}
      
      {/* 扫码登录弹框 */}
      <QRLoginModal
        visible={showQRLoginModal}
        port={String(instance?.port || '')}
        groupCode={groupCode}
        onClose={() => setShowQRLoginModal(false)}
        onLoginSuccess={handleQRLoginSuccess}
      />
      
      {/* 验证码登录弹框 */}
      <SmsLoginModal
        visible={showSmsLoginModal}
        port={String(instance?.port || '')}
        groupCode={groupCode}
        onClose={() => setShowSmsLoginModal(false)}
        onLoginSuccess={handleSmsLoginSuccess}
      />
    </Modal>
  );
}; 