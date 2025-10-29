import React, { useState, useEffect, useRef } from 'react';
import { Modal, Card, Input, Button, Space, Typography, message, Spin, Form } from 'antd';
import { PhoneOutlined, MessageOutlined } from '@ant-design/icons';
import { LogApi } from '@eleapi/door/log.api';

const { Text } = Typography;

interface SmsLoginModalProps {
  visible: boolean;
  port: string;
  groupCode: string;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const SmsLoginModal: React.FC<SmsLoginModalProps> = ({
  visible,
  port,
  groupCode,
  onClose,
  onLoginSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && port) {
      initLogin();
    } else {
      cleanup();
    }
    
    return () => cleanup();
  }, [visible, port]);

  // 倒计时逻辑
  useEffect(() => {
    if (resendCountdown > 0) {
      countdownInterval.current = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
    };
  }, [resendCountdown]);

  const cleanup = () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    setShowLoginForm(false);
    setPhoneNumber('');
    setVerificationCode('');
    setResendCountdown(0);
    form.resetFields();
  };

  const initLogin = async () => {
    if (!port) {
      message.error('端口号无效');
      return;
    }

    setLoading(true);
    try {
      const logApi = new LogApi();
      const result = await logApi.smsLoginInit(port);
      
      if (result.code) {
        message.success('验证成功');
        onLoginSuccess();
        onClose();
      } else {
        // 显示验证码登录界面
        setShowLoginForm(true);
      }
    } catch (error: any) {
      message.error(`初始化失败: ${error.message || error}`);
      setShowLoginForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      message.error('请输入手机号');
      return;
    }

    // 简单的手机号格式验证
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      message.error('请输入正确的手机号');
      return;
    }

    setSendLoading(true);
    try {
      const logApi = new LogApi();
      const result = await logApi.getValidateCodeByPhone(port, phoneNumber);
      
      if (result.code) {
        message.success('验证码已发送');
        setResendCountdown(60); // 开始60秒倒计时
      } else {
        message.error(result.data || '发送验证码失败');
      }
    } catch (error: any) {
      message.error(`发送验证码失败: ${error.message || error}`);
    } finally {
      setSendLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!phoneNumber.trim()) {
      message.error('请输入手机号');
      return;
    }

    if (!verificationCode.trim()) {
      message.error('请输入验证码');
      return;
    }

    setLoginLoading(true);
    try {
      const logApi = new LogApi();
      const result = await logApi.loginByPhone(port, verificationCode);
      
      if (result.code) {
        message.success('验证成功');
        onLoginSuccess();
        onClose();
      } else {
        message.error(result.data || '验证失败');
      }
    } catch (error: any) {
      message.error(`验证失败: ${error.message || error}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0) {
      return;
    }

    setResendLoading(true);
    try {
      const logApi = new LogApi();
      const result = await logApi.getValidateCodeByPhone(port, phoneNumber);
      
      if (result.code) {
        message.success('验证码已重新发送');
        setResendCountdown(60); // 重新开始60秒倒计时
      } else {
        message.error(result.data || '重新发送失败');
      }
    } catch (error: any) {
      message.error(`重新发送失败: ${error.message || error}`);
    } finally {
      setResendLoading(false);
    }
  };

  const handleModalClose = () => {
    cleanup();
    onClose();
  };

  return (
    <Modal
      title="验证码登录"
      open={visible}
      onCancel={handleModalClose}
      width={400}
      footer={null}
      destroyOnClose
      centered
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 初始化加载 */}
        {loading && !showLoginForm && (
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ padding: '60px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">正在初始化验证...</Text>
              </div>
            </div>
          </Card>
        )}

        {/* 验证码登录表单 */}
        {showLoginForm && (
          <Card 
            size="small" 
            title={
              <Space>
                <MessageOutlined />
                短信验证码登录
              </Space>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleLogin}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* 手机号输入 */}
                <Form.Item
                  label="手机号"
                  required
                >
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder="请输入手机号"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    maxLength={11}
                  />
                </Form.Item>

                {/* 验证码输入 */}
                <Form.Item
                  label="验证码"
                  required
                >
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Input
                      placeholder="请输入验证码"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      style={{ flex: 1 }}
                    />
                    <Button 
                      loading={sendLoading}
                      disabled={!phoneNumber.trim() || !/^1[3-9]\d{9}$/.test(phoneNumber)}
                      onClick={handleSendCode}
                    >
                      发送验证码
                    </Button>
                  </div>
                </Form.Item>

                {/* 重新获取验证码 */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Button 
                    type="link" 
                    size="small"
                    loading={resendLoading}
                    disabled={resendCountdown > 0}
                    onClick={handleResendCode}
                    style={{ padding: 0 }}
                  >
                    {resendCountdown > 0 ? `重新获取验证码(${resendCountdown}s)` : '重新获取验证码'}
                  </Button>
                </div>
                
                {/* 登录按钮 */}
                <Button 
                  type="primary" 
                  block
                  size="large"
                  loading={loginLoading}
                  onClick={handleLogin}
                  disabled={!phoneNumber.trim() || !verificationCode.trim()}
                >
                  登录
                </Button>
              </Space>
            </Form>
          </Card>
        )}
      </Space>
    </Modal>
  );
}; 