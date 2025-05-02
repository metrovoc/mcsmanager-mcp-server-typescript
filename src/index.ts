import { MCSManagerMCPServer } from "./server.js";
import { getConfig } from "./config.js";

/**
 * 主函数
 */
async function main() {
  try {
    // 获取配置
    const config = getConfig();
    
    // 检查API密钥
    if (!config.apiKey) {
      console.error("Error: MCSMANAGER_API_KEY environment variable is not set");
      process.exit(1);
    }
    
    // 创建并启动服务器
    const server = new MCSManagerMCPServer(config);
    await server.start();
    
    console.log("MCSManager MCP Server started successfully");
  } catch (error) {
    console.error("Failed to start MCSManager MCP Server:", error);
    process.exit(1);
  }
}

// 启动应用
main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
