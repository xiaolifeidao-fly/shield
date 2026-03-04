# Shield Singa 系统 Docker 部署技术方案

## 一、方案概述

### 1.1 架构说明

本方案保留现有的 `client` 和 `webview` 目录用于本地开发，同时创建新的 `web` 和 `web-server` 目录用于 Docker 部署：

| 目录 | 用途 | 部署方式 |
|-----|------|---------|
| `client` | Electron 桌面应用 | 本地开发使用 |
| `webview` | Next.js 管理界面 | 本地开发使用 |
| `web` | Docker 部署的前端 (从 client 复制) | Docker 容器，端口 8080 |
| `web-server` | Docker 部署的后端 (从 webview 复制) | Docker 容器，端口 3001 |

### 1.2 原有架构问题

当前系统采用 Electron 桌面应用架构，存在以下问题：

1. **性能瓶颈**
   - Playwright 爬虫与 UI 在同一进程运行
   - 爬虫占用大量 CPU/内存，影响界面响应
   - 多用户同步时资源竞争严重

2. **部署困难**
   - 依赖本地环境配置
   - 无法实现快速部署和水平扩展
   - 开发环境与生产环境差异大

3. **维护成本高**
   - 每次更新需要重新打包桌面应用
   - 多实例部署复杂
   - 难以实现高可用

### 1.3 业务需求

- 保留 client 和 webview 用于本地开发
- 新建 web 目录用于 Docker 前端部署
- 新建 web-server 目录用于 Docker 后端部署
- web 容器不直连 MySQL，通过 web-server API 访问数据

---

## 二、目标架构

### 2.1 双容器架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Host                               │
│                                                                  │
│  ┌─────────────────────┐         ┌─────────────────────┐     │
│  │  shield-singa-web   │         │ shield-singa-web-   │     │
│  │   (web 目录)        │         │   server            │     │
│  │                     │   HTTP   │ (web-server 目录)  │     │
│  │   Next.js          │◄────────►│                     │     │
│  │   端口: 8080       │   API    │   端口: 3001       │     │
│  │                     │          │                     │     │
│  │  通过 API 访问      │          │  读写 MySQL         │     │
│  │  web-server        │          │                     │     │
│  └──────────┬──────────┘         └──────────┬──────────┘     │
│             │                                │                   │
│             └──────────────┬───────────────┘                   │
│                            │                                    │
└────────────────────────────│────────────────────────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │       MySQL          │
                  │   172.16.49.45     │
                  │                     │
                  │  • shield_users    │
                  │  • shield_global_kv │
                  └─────────────────────┘
```

### 2.2 容器职责

| 容器 | 镜像名 | 端口 | 职责 | 数据访问 |
|-----|--------|------|------|---------|
| Web | shield-singa-web | 8080 | 数据展示、用户交互 | 通过 HTTP API 访问 web-server |
| Web-Server | shield-singa-web-server | 3001 | 数据爬取、任务调度、API 服务 | 直连 MySQL |

### 2.3 数据流向

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据流向                                        │
└─────────────────────────────────────────────────────────────────────────────┘

     ① 用户点击"同步"
            │
            ▼
     ┌──────────────────────┐
     │   shield-singa-web    │           ┌──────────────────────┐
     │   (Web 界面)         │           │   shield-singa-web- │
     │                      │           │   server            │
     │  • 展示数据列表       │           │   (Playwright 爬虫) │
     │  • 用户交互界面      │    HTTP   │                     │
     │  • 实时状态显示      │ ─────────►│  • 执行数据爬取      │
     │                      │  POST     │  • 定时任务调度      │
     └──────────┬───────────┘  /api/sync │  • 任务状态管理      │
                │                       └──────────┬───────────┘
                │  GET /api/sync/status/*          │
                │◄──────────────────────────────────┤
                │                                   │
                │  更新界面                          │
                ▼                                   ▼
     ┌─────────────────────────────────────────────────────────────┐
     │                        MySQL                               │
     │                  172.16.49.45                             │
     │                                                             │
     │  表:                                                        │
     │  • shield_users                                            │
     │  • shield_global_kv (存储同步统计，不存储案件详情)          │
     └─────────────────────────────────────────────────────────────┘
                                    ▲
                                    │
                          ┌─────────┴─────────┐
                          │   writeCase API   │
                          │  (同步到业务系统)  │
                          └───────────────────┘
                                    ▲
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         │            Playwright 爬虫处理流程                    │
         │  1. 爬取案件列表 (getCasePage)                        │
         │  2. 获取案例详情 (getCaseDetail)                      │
         │  3. 获取还款计划 (getLoanPlan)                        │
         │  4. 获取客户信息 (getCustomerInfo)                    │
         │  5. 处理数据（解密手机号）                             │
         │  6. 调用 writeCase API 同步到业务系统                 │
         └──────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              详细流程                                        │
└─────────────────────────────────────────────────────────────────────────────┘

  1. 用户在 Web 界面点击"同步"按钮
         │
         ▼
  2. shield-singa-web 发送 HTTP POST 请求到 shield-singa-web-server
     POST http://web-server:3001/api/sync/start
     Body: { "username": "xxx", "businessType": "singa" }
         │
         ▼
  3. shield-singa-web-server 接收请求，启动 Playwright 爬虫任务
         │
         ▼
  4. Playwright 爬取外部网站数据（案件列表）
         │
         ▼
  5. 对每个案件：获取详情、还款计划、客户信息
         │
         ▼
  6. 处理数据（解密手机号等）
         │
         ▼
  7. 调用 writeCase API 同步到业务系统
         │
         ▼
  8. 同步统计信息写入 MySQL (shield_global_kv 表)
     - 存储键: sync_stats_{username}
     - 存储内容: { totalCount, successCount, skipCount, failCount }
         │
         ▼
  9. shield-singa-web 轮询获取同步状态
     GET http://web-server:3001/api/sync/status/xxx
         │
         ▼
  10. Web 界面更新，展示同步统计结果

```
---

## 三、技术方案

### 3.1 web 目录（Docker 前端）

#### 来源
从 `client` 目录复制，修改为纯 Web 应用

#### 技术栈
- Next.js 14
- React 18
- Ant Design 5
- HTTP API 调用（不直连 MySQL）

#### 目录结构
```
web/
├── src/
│   ├── app/              # Next.js 页面
│   ├── components/       # UI 组件
│   ├── impl/             # API 实现
│   └── lib/
│       └── api.ts       # web-server API 调用
├── Dockerfile
└── .env
```

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 复制代码
COPY . .

# 构建
RUN pnpm build

# 运行
EXPOSE 8080
CMD ["pnpm", "start", "-p", "8080"]
```

### 3.2 web-server 目录（Docker 后端）

#### 来源
从 `webview` 目录复制，添加 API 服务

#### 技术栈
- Node.js 18
- Playwright
- Express (API 服务)
- setTimeout (定时任务)
- MySQL (mysql2)

#### 目录结构
```
web-server/
├── src/
│   ├── services/
│   │   ├── sync.service.ts    # 同步逻辑
│   │   ├── singa.sync.ts     # Singa 业务
│   │   └── adapundi.sync.ts   # Adapundi 业务
│   ├── api/
│   │   └── server.ts          # HTTP API
│   └── scheduler.ts           # 定时任务
├── Dockerfile
└── package.json
```

#### 核心服务

**HTTP API 服务**
```javascript
// /api/sync/start - 触发同步
// /api/sync/status/:username - 获取状态
// /api/sync/result/:username - 获取结果
// /api/users - 获取用户列表
// /api/kv/:key - 获取键值数据
// /api/config/sync-time - 获取/设置定时配置
```

**启动初始化流程**

```
web-server 启动
    │
    ▼
1. 连接 MySQL
    │
    ▼
2. 从 shield_global_kv 读取所有业务类型的定时配置
    │  (key: syncTimeConfig_{businessType})
    │
    ▼
3. 为每个业务类型初始化定时任务
    │
    ▼
4. 计算下次执行时间，使用 setTimeout 等待
    │
    ▼
5. 定时任务运行中...
```

**定时任务调度**

定时任务配置存储在 `shield_global_kv` 表中（key: `syncTimeConfig_{businessType}`）：

```typescript
// 配置结构
interface SyncTimeConfig {
  type: 'daily' | 'monthly';
  hour: number;        // 0-23
  minute: number;      // 0-59
  day?: number;        // 1-31，仅 monthly 类型需要
  businessType: string;
}

// 启动时调用
class ScheduledTaskManager {
  async initialize() {
    // 1. 从 MySQL 读取定时配置
    const config = await getSyncTimeConfigByBusiness(businessType);

    // 2. 计算下次执行时间
    const nextExecutionTime = this.calculateNextExecutionTime(config);

    // 3. 使用 setTimeout 定时
    const delay = nextExecutionTime - Date.now();
    setTimeout(() => {
      this.executeTaskForBusiness(businessType);  // 立即执行
      this.scheduleNextTask(businessType, config); // 重新计算下次执行
    }, delay);
  }
}
```

#### Dockerfile
```dockerfile
FROM mcr.microsoft.com/playwright:v1.49.0-focal

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# 安装浏览器
RUN npx playwright install chromium

# 复制代码
COPY . .

# 启动 API + 定时任务
CMD ["node", "server.js"]
```

### 3.3 数据库设计

#### 现有表（无需新建）

使用现有的 2 张表存储数据：

| 表名 | 用途 |
|-----|------|
| `shield_users` | 用户信息、登录凭证 |
| `shield_global_kv` | 键值存储（同步统计、缓存数据等） |

#### 数据存储说明

> **重要说明**：案件详情不存储在 MySQL 中，而是通过 `writeCase` API 实时同步到外部业务系统。

`shield_global_kv` 表存储内容：

```sql
-- 定时任务配置 (每个业务类型独立配置)
-- config_key: syncTimeConfig_{businessType}
-- config_value: JSON {"type": "daily", "hour": 0, "minute": 0, "businessType": "singa"}

-- 同步统计 (用户每次同步的结果统计)
-- config_key: sync_stats_{username}
-- config_value: JSON {"totalCount": 100, "successCount": 50, "skipCount": 48, "failCount": 2, "lastSyncTime": "..."}

-- 同步缓存 (记录今日已同步的 caseId，避免重复同步)
-- config_key: sync_cache_{username}_{businessType}
-- config_value: JSON {"caseId1": "2025-01-17", "caseId2": "2025-01-17"}

-- 断点续传 (当日同步中断后恢复)
-- config_key: sync_resume_{username}
-- config_value: JSON {"date": "2025-01-17", "pageNum": 3}

-- 停止标志 (用户主动停止同步)
-- config_key: sync_stop_{username}
-- config_value: true/false
```

#### 数据流向总结

```
外部网站 → Playwright 爬虫 → 数据处理 → writeCase API → 业务系统
                              ↓
                         MySQL (仅存储统计)
```

---

## 四、部署方案

### 4.1 构建镜像

```bash
# shield-singa-web 镜像
cd web
docker build -t shield-singa-web .

# shield-singa-web-server 镜像
cd web-server
docker build -t shield-singa-web-server .
```

### 4.2 运行容器

> **注意**：web-server 容器需要保持运行状态，定时任务依赖于 web-server 进程。

```bash
# shield-singa-web 容器（前端，可选，仅用于展示）
docker run -d \
  --name shield-singa-web \
  -p 8080:8080 \
  -e WEB_SERVER_API_URL=http://web-server:3001 \
  shield-singa-web

# shield-singa-web-server 容器（后端，必须保持运行）
docker run -d \
  --name shield-singa-web-server \
  -p 3001:3001 \
  -e MYSQL_HOST=172.16.49.45 \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=amc_w \
  -e MYSQL_PASSWORD=sdfcerts4amc \
  -e MYSQL_DATABASE=shield \
  shield-singa-web-server
```

### 4.3 定时任务说明

- **无需前端页面**：定时任务在 web-server 容器中运行，不依赖前端是否打开
- **容器需保持运行**：web-server 容器需要 24/7 运行，定时任务才能触发
- **启动时初始化**：
  1. web-server 启动时从 `shield_global_kv` 读取定时配置（key: `syncTimeConfig_{businessType}`）
  2. 为每个业务类型初始化定时任务
  3. 使用 `setTimeout` 计算并等待到下次执行时间
- **任务触发方式**：
  1. 时间到达后立即执行同步任务
  2. 执行完成后重新计算下次执行时间

---

## 五、API 接口设计

### 5.1 shield-singa-web-server API

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | /api/sync/start | 触发同步 |
| GET | /api/sync/status/:username | 获取同步状态 |
| GET | /api/sync/result/:username | 获取同步结果 |
| GET | /api/users | 获取用户列表 |
| GET | /api/kv/:key | 获取键值数据 |

### 5.2 请求示例

```bash
# 触发同步
curl -X POST http://localhost:3001/api/sync/start \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "businessType": "singa"}'

# 查询状态
curl http://localhost:3001/api/sync/status/testuser

# 获取数据（从 shield_global_kv 读取）
curl http://localhost:3001/api/kv/cases_testuser_singa
```

---

## 六、开发模式对比

### 6.1 本地开发模式

| 组件 | 目录 | 说明 |
|-----|------|------|
| Electron 客户端 | `client/` | 桌面应用，直接运行 |
| Web 管理界面 | `webview/` | Next.js 应用，端口 3000 |
| 数据存储 | electron-store / MySQL | 本地存储或远程 MySQL |

### 6.2 Docker 部署模式

| 组件 | 目录 | 说明 |
|-----|------|------|
| Web 前端 | `web/` | Next.js 应用，端口 8080 |
| Web 后端 | `web-server/` | API 服务 + 爬虫，端口 3001 |
| 数据存储 | MySQL | 仅 web-server 直连 |

### 6.3 迁移计划

### 6.3.1 阶段一：创建 web 目录
- [ ] 从 client 复制代码到 web 目录
- [ ] 移除 Electron 相关代码（app.ts, preload.js 等）
- [ ] 修改数据读取方式（通过 HTTP API 调用 web-server）
- [ ] 移除 MySQL 直连配置，改为 API 调用

### 6.3.2 阶段二：创建 web-server 目录
- [ ] 从 webview 复制代码到 web-server 目录
- [ ] 添加 HTTP API 服务
- [ ] 配置 MySQL 连接
- [ ] 实现定时任务调度

### 6.3.3 阶段三：容器化部署
- [ ] 编写 web/Dockerfile
- [ ] 编写 web-server/Dockerfile
- [ ] 测试独立部署

### 6.3.4 阶段四：验证
- [ ] 验证本地开发模式正常（client + webview）
- [ ] 验证 Docker 部署模式正常（web + web-server）
- [ ] 验证数据一致性

---

## 七、风险与对策

| 风险 | 影响 | 对策 |
|-----|------|------|
| Playwright 在容器中性能下降 | 爬取速度变慢 | 优化浏览器配置，增加资源限制 |
| 网络隔离导致无法访问外网 | 爬虫无法工作 | 配置代理或内网部署 |
| 双容器部署复杂度增加 | 运维成本上升 | 编写部署文档和脚本 |
| 数据一致性问题 | 显示数据不及时 | 实现数据刷新机制 |

---

## 八、总结

本方案保留现有的 client 和 webview 用于本地开发，同时创建 web 和 web-server 用于 Docker 部署：

1. **client**（保留）：Electron 桌面应用，用于本地开发
2. **webview**（保留）：Next.js 管理界面，用于本地开发
3. **web**（新建）：Docker 部署的前端，专注于数据展示
4. **web-server**（新建）：Docker 部署的后端，运行 Playwright 爬虫和 API 服务

方案优势：
- 开发与部署分离：本地开发和 Docker 部署并行不悖
- 独立扩展：可根据负载分别扩展
- 资源隔离：爬虫不会影响 UI 响应
- 快速部署：一键构建 Docker 镜像
- 易于维护：职责分离，代码解耦
- 无人值守：定时任务自动执行，无需前端打开

实施后可解决当前客户端性能问题，同时保持本地开发体验。
