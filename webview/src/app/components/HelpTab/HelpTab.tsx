import React from 'react';
import { Card, Typography, Divider } from 'antd';

const { Title, Paragraph, Text } = Typography;

export const HelpTab: React.FC = () => {
  return (
    <Card title="使用说明" className="app-card">
      <Typography style={{ lineHeight: 1.8, color: '#666' }}>
        <Title level={4} style={{ color: '#333', marginBottom: 15 }}>
          基本功能
        </Title>
        <ul style={{ marginLeft: 20, marginBottom: 20 }}>
          <li>支持自动化脚本运行</li>
          <li>支持IP代理设置</li>
          <li>支持Cookie登录验证</li>
          <li>实时日志监控</li>
          <li>支持多开实例管理</li>
        </ul>

        <Title level={4} style={{ color: '#333', marginBottom: 15 }}>
          使用步骤
        </Title>
        <ol style={{ marginLeft: 20, marginBottom: 20 }}>
          <li>配置基本参数</li>
          <li>设置脚本运行参数</li>
          <li>选择登录方式（扫码或CK）</li>
          <li>点击开始运行</li>
          <li>可在多开管理中创建新实例</li>
        </ol>

        <Title level={4} style={{ color: '#333', marginBottom: 15 }}>
          多开说明
        </Title>
        <ul style={{ marginLeft: 20, marginBottom: 20 }}>
          <li>每个实例使用独立的端口号</li>
          <li>配置数据按端口隔离保存</li>
          <li>支持最多100个并发实例</li>
          <li>窗口会自动错位显示</li>
        </ul>

        <Title level={4} style={{ color: '#333', marginBottom: 15 }}>
          平台设置说明
        </Title>
        <ul style={{ marginLeft: 20, marginBottom: 20 }}>
          <li>支持多个平台账号配置</li>
          <li>包括三叶草、猛犸象、熊猫、四海、AK等平台</li>
          <li>每个平台可独立启用/禁用</li>
          <li>配置信息按端口隔离保存</li>
        </ul>

        <Title level={4} style={{ color: '#333', marginBottom: 15 }}>
          代理设置说明
        </Title>
        <ul style={{ marginLeft: 20, marginBottom: 20 }}>
          <li>支持HTTP/HTTPS代理</li>
          <li>支持用户名密码认证</li>
          <li>可测试代理连接状态</li>
          <li>代理配置按端口隔离保存</li>
        </ul>

        <Title level={4} style={{ color: '#333', marginBottom: 15 }}>
          注意事项
        </Title>
        <ul style={{ marginLeft: 20 }}>
          <li>
            <Text strong>网络要求：</Text>请确保网络连接正常
          </li>
          <li>
            <Text strong>代理建议：</Text>建议使用稳定的代理服务器
          </li>
          <li>
            <Text strong>日志监控：</Text>定期检查日志信息
          </li>
          <li>
            <Text strong>合规使用：</Text>遵守相关平台规则
          </li>
          <li>
            <Text strong>性能考虑：</Text>避免同时运行过多实例
          </li>
          <li>
            <Text strong>数据备份：</Text>重要配置数据请及时备份
          </li>
        </ul>

        <Divider />

        <Title level={4} style={{ color: '#333', marginBottom: 15 }}>
          技术支持
        </Title>
        <Paragraph>
          如果您在使用过程中遇到问题，请检查以下内容：
        </Paragraph>
        <ul style={{ marginLeft: 20 }}>
          <li>查看运行日志中的错误信息</li>
          <li>确认网络连接和代理设置</li>
          <li>检查端口是否被占用</li>
          <li>尝试重启应用或清理缓存</li>
        </ul>
      </Typography>
    </Card>
  );
}; 