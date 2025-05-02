import dotenv from "dotenv";

// 加载.env文件
dotenv.config();

/**
 * MCP服务器配置
 */
export interface MCPServerConfig {
  /**
   * MCSManager面板URL
   */
  mcsmanagerUrl: string;

  /**
   * MCSManager API密钥
   */
  apiKey: string;

  /**
   * MCP服务器端口
   */
  port: number;

  /**
   * MCP服务器主机
   */
  host: string;
}

/**
 * 默认配置
 */
export const defaultConfig: MCPServerConfig = {
  mcsmanagerUrl: process.env.MCSMANAGER_URL || "http://localhost:23333",
  apiKey: process.env.MCSMANAGER_API_KEY || "",
  port: parseInt(process.env.MCP_PORT || "3000"),
  host: process.env.MCP_HOST || "localhost",
};

/**
 * 获取配置
 */
export function getConfig(): MCPServerConfig {
  return {
    ...defaultConfig,
    // 可以在这里添加从其他来源加载配置的逻辑
  };
}
