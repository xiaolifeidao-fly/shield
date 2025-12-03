# 从 Electron 迁移到 Express 服务器

本文档说明将 client 项目从 Electron 应用改造为 Express 服务端项目的所有更改。

## 主要更改

### 1. 存储系统改造

**之前**: 使用 `electron-store` 存储数据
**现在**: 使用 `conf` 库存储数据

- 创建了 `common/utils/store/conf.ts` 替代 `common/utils/store/electron.ts`
- 配置文件存储在 `~/.config/shield/config.json`
- API 接口保持不变：`getGlobal()`, `setGlobal()`, `removeGlobal()`, `clearGlobal()`

### 2. 日志系统改造

**之前**: 使用 `electron-log`
**现在**: 自定义日志工具 `client/src/utils/logger.ts`

- 日志文件存储在 `~/.config/shield/logs/YYYY-MM-DD.log`
- 保持相同的 API：`log.info()`, `log.error()`, `log.warn()`, `log.debug()`

### 3. 应用架构改造

**之前**: Electron 主进程 + IPC 通信
**现在**: Express HTTP 服务器

#### 新增文件：
- `client/src/server/app.ts` - Express 应用主文件
- `client/src/server/routes.ts` - 路由注册
- `client/src/server/api/index.ts` - API 路由入口
- `client/src/server/api/user.routes.ts` - 用户相关路由
- `client/src/server/api/system.routes.ts` - 系统配置相关路由

#### 修改文件：
- `client/src/main.ts` - 改为启动 Express 服务器
- `client/src/impl/user/user.impl.ts` - 移除 Electron 依赖
- `client/src/impl/config/system.impl.ts` - 移除 Electron 依赖
- `client/src/task/task.ts` - 更新日志导入

### 4. API 路由映射

所有原来的 IPC 调用现在都映射为 HTTP 路由：

#### User API
- `GET /api/user/getUserInfoList` - 获取用户列表
- `POST /api/user/getUserInfo` - 获取单个用户信息
- `POST /api/user/addUser` - 添加用户
- `POST /api/user/updateUser` - 更新用户
- `POST /api/user/deleteUser` - 删除用户
- `POST /api/user/runUser` - 运行用户同步
- `POST /api/user/stopUser` - 停止用户同步

#### System API
- `GET /api/system/getSyncTimeConfig` - 获取同步时间配置
- `POST /api/system/saveSyncTimeConfig` - 保存同步时间配置
- `GET /api/system/getSyncTimeConfigByBusiness` - 根据业务类型获取配置
- `POST /api/system/saveSyncTimeConfigByBusiness` - 根据业务类型保存配置

### 5. 依赖更新

#### 移除的依赖：
- `electron`
- `electron-log`
- `electron-store`
- `electron-updater`
- `electron-builder`
- `concurrently`
- `wait-on`

#### 新增的依赖：
- `conf` - 配置文件管理
- `ts-node` - TypeScript 运行时
- `ts-node-dev` - 开发时热重载

#### 保留的依赖：
- `express` - HTTP 服务器框架
- `cors` - 跨域支持
- 其他业务相关依赖保持不变

### 6. 启动脚本更新

**之前**:
```json
"start": "electron ."
```

**现在**:
```json
"dev": "ts-node src/main.ts",
"build": "webpack --config webpack.config.js --mode production",
"start": "node dist/main.js",
"dev:watch": "ts-node-dev --respawn src/main.ts"
```

### 7. 环境变量

服务器配置通过环境变量控制：

- `PORT` 或 `SERVER_PORT` - 服务器端口（默认: 3000）
- `HOST` - 服务器主机（默认: 0.0.0.0）
- `APP_URL_PREFIX` - API 路径前缀（默认: /api）

### 8. 文件路径更改

所有使用 `app.getPath('userData')` 的地方都改为：
```typescript
path.join(os.homedir(), '.config', 'shield')
```

## 使用说明

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器（支持热重载）
npm run dev:watch

# 或使用普通开发模式
npm run dev
```

### 生产环境

```bash
# 构建项目
npm run build

# 启动服务器
npm run start
```

### 健康检查

服务器启动后，可以通过以下端点检查服务状态：

```bash
curl http://localhost:3000/health
```

## 注意事项

1. **配置文件位置**: 配置文件现在存储在 `~/.config/shield/config.json`，而不是 Electron 的用户数据目录
2. **日志文件位置**: 日志文件存储在 `~/.config/shield/logs/` 目录
3. **API 响应格式**: 所有 API 响应统一为 `{ success: boolean, data?: any, error?: string }` 格式
4. **端口配置**: 默认端口为 3000，可通过环境变量修改

## 兼容性

- ✅ 所有业务逻辑保持不变
- ✅ API 接口签名保持不变（仅通信方式从 IPC 改为 HTTP）
- ✅ 数据存储格式兼容（使用相同的键名）
- ✅ 定时任务功能保持不变

## 后续工作

1. 移除不再使用的 Electron 相关文件：
   - `client/src/preload.ts`
   - `client/src/kernel/app.ts`
   - `client/src/kernel/windows.ts`
   - `client/src/kernel/register/rpc.ts`
   - `client/src/kernel/store.ts`

2. 更新 webpack 配置（如果需要）

3. 添加 API 文档

4. 添加单元测试

