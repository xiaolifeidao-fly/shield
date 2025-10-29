import React, { useState, useEffect, useRef } from 'react';
import { Modal, Card, Input, Button, Space, Typography, message, Spin } from 'antd';
import { QrcodeOutlined, PhoneOutlined } from '@ant-design/icons';
import { LogApi } from '@eleapi/door/log.api';

const { Text } = Typography;

interface QRLoginModalProps {
  visible: boolean;
  port: string;
  groupCode: string;
  onClose: () => void;
  onLoginSuccess: () => void;
}

interface QRCodeInfo {
  qrCode: string;
}

interface VerificationInfo {
  needVerification: boolean;
  verificationId?: string;
  phoneNumber?: string;
}

export const QRLoginModal: React.FC<QRLoginModalProps> = ({
  visible,
  port,
  groupCode,
  onClose,
  onLoginSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [qrCodeInfo, setQrCodeInfo] = useState<QRCodeInfo | null>(null);
  const [verificationInfo, setVerificationInfo] = useState<VerificationInfo>({
    needVerification: false,
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [step, setStep] = useState<'qr' | 'verification'>('qr');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  
  // 轮询检查登录状态
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible && port) {
      startLogin();
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
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    setQrCodeInfo(null);
    setVerificationInfo({ needVerification: false });
    setVerificationCode('');
    setStep('qr');
    setResendCountdown(0);
  };

  const startLogin = async () => {
    if (!port) {
      message.error('端口号无效');
      return;
    }

    setLoading(true);
    try {
      const logApi = new LogApi();
      const result = await logApi.awaitByLoginResultByQR(port);
      
      if (result.code && result.data) {
        // 假设返回的数据包含二维码信息
        if (result.data.qrCode) {
          setQrCodeInfo({
            qrCode: result.data.qrCode
          });
          
          // 开始轮询检查登录状态
          startPolling();
        } else {
          message.success('登录成功');
          onLoginSuccess();
          onClose();
          return;
        }
      } else {
        message.error(result.message || '启动登录失败');
      }
    } catch (error: any) {
      message.error(`登录失败: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = async () => {
    const logApi = new LogApi();
    const result = await logApi.checkAgainValidate(port);
    if(!result.code){
        message.error(result.message || '检查登录状态失败');
        return;
    }
    if(result.data.isLogin){
        cleanup();
        message.success('登录成功');
        onLoginSuccess();
        onClose();
    }else{
        if(result.data.needSmsCode){
            setVerificationInfo({ needVerification: true });
            setStep('verification');
            setResendCountdown(60); // 开始60秒倒计时
        }else{
            message.error('检测失败,未获取到验证码');
        }
            
    }
  };

  const checkLoginStatus = async () => {
    try {
      const logApi = new LogApi();
      const result = await logApi.checkLoginStatus(groupCode, port);
      
      if (result.success && result.data) {
        if (result.data.isLogin) {
          // 登录成功
          cleanup();
          message.success('登录成功');
          onLoginSuccess();
          onClose();
        } else if (result.data.needVerification) {
          // 需要验证
          setVerificationInfo({
            needVerification: true,
            verificationId: result.data.verificationId,
            phoneNumber: result.data.phoneNumber,
          });
          setStep('verification');
          setResendCountdown(60); // 开始60秒倒计时
          
          // 停止轮询
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
          }
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!verificationCode.trim()) {
      message.error('请输入验证码');
      return;
    }

    setVerifyLoading(true);
    try {
      const logApi = new LogApi();
      // 使用现有的login接口
      const result = await logApi.loginBySmsCode(port, verificationCode);
      
      if (result.code) {
        message.success('验证成功');
        // 重新开始轮询检查登录状态
        onLoginSuccess();
        onClose();
      } else {
        message.error(result.message || '验证失败');
      }
    } catch (error: any) {
      message.error(`验证失败: ${error.message || error}`);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRetry = () => {
    cleanup();
    startLogin();
  };

  const handleResendSms = async () => {
    if (resendCountdown > 0) {
      return;
    }

    setResendLoading(true);
    try {
      const logApi = new LogApi();
      const result = await logApi.againSendSms(port);
      
      if (result.code) {
        message.success('短信已重新发送');
        setResendCountdown(60); // 重新开始60秒倒计时
      } else {
        message.error(result.message || '重新发送失败');
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
      title="扫码登录"
      open={visible}
      onCancel={handleModalClose}
      width={400}
      footer={null}
      destroyOnClose
      centered
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 二维码区域 */}
        {step === 'qr' && (
          <Card size="small" style={{ textAlign: 'center' }}>
            {loading ? (
              <div style={{ padding: '60px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">正在获取二维码...</Text>
                </div>
              </div>
            ) : qrCodeInfo ? (
              <div>
                <div style={{ 
                  padding: '20px',
                  background: '#fafafa',
                  borderRadius: 8,
                  marginBottom: 16,
                  minHeight: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {qrCodeInfo.qrCode ? (
                    <img 
                      src={qrCodeInfo.qrCode} 
                      alt="登录二维码" 
                      style={{ maxWidth: '100%', maxHeight: 180 }}
                    />
                  ) : (
                    <div style={{ color: '#999' }}>
                      <QrcodeOutlined style={{ fontSize: 48, marginBottom: 8 }} />
                      <div>二维码加载中...</div>
                    </div>
                  )}
                </div>
                <Text type="secondary">请使用手机扫描二维码登录</Text>
                <div style={{ marginTop: 16 }}>
                  <Button onClick={handleRetry}>
                    重新获取
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '60px 0' }}>
                <Text type="danger">获取二维码失败</Text>
                <div style={{ marginTop: 16 }}>
                  <Button type="primary" onClick={handleRetry}>
                    重试
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 验证码区域 */}
        {step === 'verification' && verificationInfo.needVerification && (
          <Card 
            size="small" 
            title={
              <Space>
                <PhoneOutlined />
                短信验证
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text type="secondary">
                  验证码已发送至您的手机
                </Text>
              </div>
              
              <Input.OTP
                length={6}
                value={verificationCode}
                onChange={setVerificationCode}
              />
              
              <div style={{ marginBottom: 16 }}>
                <Button 
                  type="link" 
                  size="small"
                  loading={resendLoading}
                  disabled={resendCountdown > 0}
                  onClick={handleResendSms}
                  style={{ padding: 0 }}
                >
                  {resendCountdown > 0 ? `重新发送(${resendCountdown}s)` : '重新发送'}
                </Button>
              </div>
              
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button onClick={() => setStep('qr')}>
                  返回扫码
                </Button>
                <Button 
                  type="primary" 
                  loading={verifyLoading}
                  onClick={handleVerificationSubmit}
                  disabled={verificationCode.length !== 6}
                >
                  验证
                </Button>
              </Space>
            </Space>
          </Card>
        )}
      </Space>
    </Modal>
  );
}; 