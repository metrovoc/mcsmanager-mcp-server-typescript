import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * 测试MCP客户端
 */
async function main() {
  try {
    // 创建客户端
    const client = new Client({
      name: "MCSManager MCP Test Client",
      version: "1.0.0",
    });

    // 连接到服务器
    const transport = new StreamableHTTPClientTransport(
      new URL("http://localhost:3000/mcp")
    );
    await client.connect(transport);
    console.log("Connected to MCP server");

    // 列出资源
    console.log("\n=== Resources ===");
    const resources = await client.listResources();
    console.log(
      "Available resources:",
      resources.resources.map((r) => r.uriTemplate)
    );

    // 获取概览信息
    console.log("\n=== Overview ===");
    const overview = await client.readResource({ uri: "mcsm://overview" });
    console.log("Overview:", JSON.parse(overview.contents[0].text as string));

    // 列出工具
    console.log("\n=== Tools ===");
    const tools = await client.listTools();
    console.log(
      "Available tools:",
      tools.tools.map((t) => t.name)
    );

    // 断开连接
    await client.close();
    console.log("\nDisconnected from MCP server");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// 运行测试
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
