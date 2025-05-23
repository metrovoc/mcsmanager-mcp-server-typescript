# MCSManager MCP Server

这是一个基于 TypeScript 实现的 MCSManager MCP 服务器，它使用 Model Context Protocol (MCP)提供对 MCSManager API 的访问。

## 功能特性

- 使用最新的 MCP SDK 和 StreamableHTTP 传输协议
- 提供对 MCSManager API 的完整访问
- 支持守护进程和实例管理
- 支持文件操作
- 支持命令发送
- 支持会话管理

## 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/mcsmanager-mcp-server-typescript.git
cd mcsmanager-mcp-server-typescript

# 安装依赖
npm install

# 构建项目
npm run build
```

## 配置

服务器可以通过环境变量进行配置：

- `MCSMANAGER_URL`: MCSManager 面板的 URL (默认: http://localhost:23333)
- `MCSMANAGER_API_KEY`: MCSManager API 密钥 (必需)
- `MCP_PORT`: MCP 服务器端口 (默认: 3000)
- `MCP_HOST`: MCP 服务器主机 (默认: localhost)

## 使用方法

### 启动服务器

```bash
# 设置API密钥
export MCSMANAGER_API_KEY=your_api_key

# 启动服务器
npm start
```

或者使用开发模式：

```bash
npm run dev
```

### 连接到服务器

MCP 服务器将在 `http://localhost:3000/mcp` 上运行。你可以使用任何支持 MCP 的客户端连接到此服务器。

## 工具

服务器提供以下工具：

### 获取信息工具

- `get-daemons` - 获取所有守护进程列表
- `get-instances` - 获取指定守护进程的实例列表
- `get-instance-detail` - 获取实例详情
- `get-files` - 获取文件列表
- `get-file-content` - 获取文件内容
- `get-overview` - 获取面板概览信息

### 操作工具

- `start-instance` - 启动实例
- `stop-instance` - 停止实例
- `restart-instance` - 重启实例
- `kill-instance` - 强制终止实例
- `send-command` - 向实例发送命令
- `update-file` - 更新文件内容

## 开发

### 项目结构

```
.
├── src/
│   ├── api/
│   │   └── mcsmanager-api.ts  # MCSManager API客户端
│   ├── config.ts              # 配置管理
│   ├── server.ts              # MCP服务器实现
│   └── index.ts               # 入口文件
├── dist/                      # 编译输出目录
├── package.json
├── tsconfig.json
└── README.md
```

### 构建

```bash
npm run build
```

### 测试

```bash
npm test
```

## 许可证

MIT
