import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express from "express";
import { randomUUID } from "crypto";
import { MCSManagerAPI } from "./api/mcsmanager-api.js";
import { MCPServerConfig } from "./config.js";

/**
 * MCSManager MCP服务器
 */
export class MCSManagerMCPServer {
  private server: McpServer;
  private api: MCSManagerAPI;
  private app: express.Application;
  private config: MCPServerConfig;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } =
    {};

  /**
   * 创建MCSManager MCP服务器
   * @param config 服务器配置
   */
  constructor(config: MCPServerConfig) {
    this.config = config;
    this.api = new MCSManagerAPI(config.mcsmanagerUrl, config.apiKey);
    this.app = express();
    this.app.use(express.json());

    // 创建MCP服务器
    this.server = new McpServer({
      name: "MCSManager MCP Server",
      version: "1.0.0",
    });

    // 注册资源和工具
    this.registerResources();
    this.registerTools();
  }

  /**
   * 注册资源
   */
  private registerResources() {
    // 不再注册资源，所有资源都改为工具
  }

  /**
   * 注册工具
   */
  private registerTools() {
    // 获取守护进程列表工具
    this.server.tool("get-daemons", "获取所有守护进程列表", {}, async () => {
      try {
        // 使用overview接口获取守护进程列表
        const response = await this.api.getOverview();
        if (response.status !== 200) {
          throw new Error(`Failed to get daemons: ${response.status}`);
        }

        // 从overview中提取remote字段作为守护进程列表
        const daemonsInfo = response.data.remote.map((daemon: any) => {
          return {
            id: daemon.uuid, // 确保包含daemonid
            name: daemon.remarks,
            version: daemon.version,
            status: daemon.available ? "online" : "offline",
            instances: {
              running: daemon.instance.running,
              total: daemon.instance.total,
            },
            system: {
              type: daemon.system.type,
              platform: daemon.system.platform,
              hostname: daemon.system.hostname,
              cpuUsage: daemon.system.cpuUsage,
              memUsage: daemon.system.memUsage,
            },
          };
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(daemonsInfo, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching daemons:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error fetching daemons: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    });

    // 获取实例列表工具
    this.server.tool(
      "get-instances",
      "获取指定守护进程的实例列表",
      {
        daemonId: z.string().describe("守护进程ID"),
      },
      async ({ daemonId }) => {
        try {
          const response = await this.api.getInstances(daemonId);
          if (response.status !== 200) {
            throw new Error(`Failed to get instances: ${response.status}`);
          }

          const instancesInfo = response.data.data.map((instance: any) => {
            return {
              id: instance.instanceUuid,
              name: instance.config.nickname,
              status: this.getStatusText(instance.status),
              type: instance.config.type,
              startCommand: instance.config.startCommand,
              stopCommand: instance.config.stopCommand,
              cwd: instance.config.cwd,
              processInfo: instance.processInfo,
              created: new Date(instance.config.createDatetime).toISOString(),
            };
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(instancesInfo, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error(
            `Error fetching instances for daemon ${daemonId}:`,
            error
          );
          return {
            content: [
              {
                type: "text",
                text: `Error fetching instances: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 获取实例详情工具
    this.server.tool(
      "get-instance-detail",
      "获取指定实例的详细信息",
      {
        daemonId: z.string().describe("守护进程ID"),
        instanceId: z.string().describe("实例ID"),
      },
      async ({ daemonId, instanceId }) => {
        try {
          const response = await this.api.getInstanceDetail(
            instanceId,
            daemonId
          );
          if (response.status !== 200) {
            throw new Error(
              `Failed to get instance details: ${response.status}`
            );
          }

          const instance = response.data;
          const instanceInfo = {
            id: instance.instanceUuid,
            name: instance.config.nickname,
            status: this.getStatusText(instance.status),
            type: instance.config.type,
            startCommand: instance.config.startCommand,
            stopCommand: instance.config.stopCommand,
            cwd: instance.config.cwd,
            processInfo: instance.processInfo,
            created: new Date(instance.config.createDatetime).toISOString(),
            lastModified: new Date(instance.config.lastDatetime).toISOString(),
            fileEncoding: instance.config.fileCode,
            processType: instance.config.processType,
            info: instance.info,
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(instanceInfo, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error(
            `Error fetching instance ${instanceId} details:`,
            error
          );
          return {
            content: [
              {
                type: "text",
                text: `Error fetching instance details: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 获取文件列表工具
    this.server.tool(
      "get-files",
      "获取指定实例的文件列表",
      {
        daemonId: z.string().describe("守护进程ID"),
        instanceId: z.string().describe("实例ID"),
        path: z.string().optional().describe("文件路径，可选"),
      },
      async ({ daemonId, instanceId, path }) => {
        try {
          const targetPath = path || "";
          const response = await this.api.getFileList(
            instanceId,
            daemonId,
            targetPath
          );
          if (response.status !== 200) {
            throw new Error(`Failed to get file list: ${response.status}`);
          }

          const fileList = response.data;
          const filesInfo = {
            path: fileList.absolutePath,
            files: fileList.items.map((file: any) => ({
              name: file.name,
              size: file.size,
              time: file.time,
              type: file.type === 0 ? "directory" : "file",
              mode: file.mode,
            })),
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(filesInfo, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error(
            `Error fetching files for instance ${instanceId}:`,
            error
          );
          return {
            content: [
              {
                type: "text",
                text: `Error fetching files: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 获取文件内容工具
    this.server.tool(
      "get-file-content",
      "获取指定实例的文件内容",
      {
        daemonId: z.string().describe("守护进程ID"),
        instanceId: z.string().describe("实例ID"),
        filePath: z.string().describe("文件路径"),
      },
      async ({ daemonId, instanceId, filePath }) => {
        try {
          if (!filePath) {
            throw new Error("File path is required");
          }

          const response = await this.api.getFileContent(
            instanceId,
            daemonId,
            filePath
          );
          if (response.status !== 200) {
            throw new Error(`Failed to get file content: ${response.status}`);
          }

          return {
            content: [
              {
                type: "text",
                text: response.data,
              },
            ],
          };
        } catch (error) {
          console.error(`Error fetching file content for ${filePath}:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error fetching file content: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 获取面板概览工具
    this.server.tool(
      "get-overview",
      "获取MCSManager面板概览信息",
      {},
      async () => {
        try {
          const response = await this.api.getOverview();
          if (response.status !== 200) {
            throw new Error(`Failed to get overview: ${response.status}`);
          }

          const overview = response.data;
          const overviewInfo = {
            version: overview.version,
            specifiedDaemonVersion: overview.specifiedDaemonVersion,
            process: overview.process,
            record: overview.record,
            system: {
              user: overview.system.user,
              time: overview.system.time,
              totalmem: overview.system.totalmem,
              freemem: overview.system.freemem,
              type: overview.system.type,
              version: overview.system.version,
              node: overview.system.node,
              hostname: overview.system.hostname,
              loadavg: overview.system.loadavg,
              platform: overview.system.platform,
              release: overview.system.release,
              uptime: overview.system.uptime,
              cpu: overview.system.cpu,
            },
            remoteCount: {
              available: overview.remoteCount.available,
              total: overview.remoteCount.total,
            },
            remote: overview.remote.map((daemon: any) => ({
              version: daemon.version,
              process: daemon.process,
              instance: daemon.instance,
              system: {
                type: daemon.system.type,
                hostname: daemon.system.hostname,
                platform: daemon.system.platform,
                release: daemon.system.release,
                uptime: daemon.system.uptime,
                cwd: daemon.system.cwd,
                loadavg: daemon.system.loadavg,
                freemem: daemon.system.freemem,
                cpuUsage: daemon.system.cpuUsage,
                memUsage: daemon.system.memUsage,
                totalmem: daemon.system.totalmem,
                processCpu: daemon.system.processCpu,
                processMem: daemon.system.processMem,
              },
              uuid: daemon.uuid,
              ip: daemon.ip,
              port: daemon.port,
              prefix: daemon.prefix,
              available: daemon.available,
              remarks: daemon.remarks,
            })),
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(overviewInfo, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error("Error fetching overview:", error);
          return {
            content: [
              {
                type: "text",
                text: `Error fetching overview: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 启动实例工具
    this.server.tool(
      "start-instance",
      "启动指定实例",
      {
        daemonId: z.string().describe("守护进程ID"),
        instanceId: z.string().describe("实例ID"),
      },
      async ({ daemonId, instanceId }) => {
        try {
          const response = await this.api.startInstance(instanceId, daemonId);
          if (response.status !== 200) {
            throw new Error(`Failed to start instance: ${response.status}`);
          }

          return {
            content: [
              {
                type: "text",
                text: `Successfully started instance ${instanceId}`,
              },
            ],
          };
        } catch (error) {
          console.error(`Error starting instance ${instanceId}:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error starting instance: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 停止实例工具
    this.server.tool(
      "stop-instance",
      "停止指定实例",
      {
        daemonId: z.string().describe("守护进程ID"),
        instanceId: z.string().describe("实例ID"),
      },
      async ({ daemonId, instanceId }) => {
        try {
          const response = await this.api.stopInstance(instanceId, daemonId);
          if (response.status !== 200) {
            throw new Error(`Failed to stop instance: ${response.status}`);
          }

          return {
            content: [
              {
                type: "text",
                text: `Successfully stopped instance ${instanceId}`,
              },
            ],
          };
        } catch (error) {
          console.error(`Error stopping instance ${instanceId}:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error stopping instance: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 重启实例工具
    this.server.tool(
      "restart-instance",
      "重启指定实例",
      {
        daemonId: z.string().describe("守护进程ID"),
        instanceId: z.string().describe("实例ID"),
      },
      async ({ daemonId, instanceId }) => {
        try {
          const response = await this.api.restartInstance(instanceId, daemonId);
          if (response.status !== 200) {
            throw new Error(`Failed to restart instance: ${response.status}`);
          }

          return {
            content: [
              {
                type: "text",
                text: `Successfully restarted instance ${instanceId}`,
              },
            ],
          };
        } catch (error) {
          console.error(`Error restarting instance ${instanceId}:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error restarting instance: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 强制终止实例工具
    this.server.tool(
      "kill-instance",
      "强制终止指定实例",
      {
        daemonId: z.string().describe("守护进程ID"),
        instanceId: z.string().describe("实例ID"),
      },
      async ({ daemonId, instanceId }) => {
        try {
          const response = await this.api.killInstance(instanceId, daemonId);
          if (response.status !== 200) {
            throw new Error(`Failed to kill instance: ${response.status}`);
          }

          return {
            content: [
              {
                type: "text",
                text: `Successfully killed instance ${instanceId}`,
              },
            ],
          };
        } catch (error) {
          console.error(`Error killing instance ${instanceId}:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error killing instance: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 发送命令工具
    this.server.tool(
      "send-command",
      "向指定实例发送命令",
      {
        daemonId: z.string().describe("守护进程ID"),
        instanceId: z.string().describe("实例ID"),
        command: z.string().describe("要发送的命令"),
      },
      async ({ daemonId, instanceId, command }) => {
        try {
          const response = await this.api.sendCommand(
            instanceId,
            daemonId,
            command
          );
          if (response.status !== 200) {
            throw new Error(`Failed to send command: ${response.status}`);
          }

          return {
            content: [
              {
                type: "text",
                text: `Successfully sent command "${command}" to instance ${instanceId}`,
              },
            ],
          };
        } catch (error) {
          console.error(
            `Error sending command to instance ${instanceId}:`,
            error
          );
          return {
            content: [
              {
                type: "text",
                text: `Error sending command: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 更新文件内容工具
    this.server.tool(
      "update-file",
      "更新指定实例的文件内容",
      {
        daemonId: z.string().describe("守护进程ID"),
        instanceId: z.string().describe("实例ID"),
        filePath: z.string().describe("文件路径"),
        content: z.string().describe("文件内容"),
      },
      async ({ daemonId, instanceId, filePath, content }) => {
        try {
          const response = await this.api.updateFileContent(
            instanceId,
            daemonId,
            filePath,
            content
          );
          if (response.status !== 200) {
            throw new Error(`Failed to update file: ${response.status}`);
          }

          return {
            content: [
              {
                type: "text",
                text: `Successfully updated file ${filePath}`,
              },
            ],
          };
        } catch (error) {
          console.error(`Error updating file ${filePath}:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error updating file: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * 获取实例状态文本
   * @param status 状态码
   * @returns 状态文本
   */
  private getStatusText(status: number): string {
    switch (status) {
      case -1:
        return "busy";
      case 0:
        return "stopped";
      case 1:
        return "stopping";
      case 2:
        return "starting";
      case 3:
        return "running";
      default:
        return "unknown";
    }
  }

  /**
   * 启动服务器
   */
  async start() {
    // 处理POST请求
    this.app.post("/mcp", async (req, res) => {
      // 检查会话ID
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && this.transports[sessionId]) {
        // 重用现有传输
        transport = this.transports[sessionId];
      } else if (!sessionId && req.body && req.body.method === "initialize") {
        // 新的初始化请求
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            // 存储传输
            this.transports[sessionId] = transport;
          },
        });

        // 传输关闭时清理
        transport.onclose = () => {
          if (transport.sessionId) {
            delete this.transports[transport.sessionId];
          }
        };

        // 连接到MCP服务器
        await this.server.connect(transport);
      } else {
        // 无效请求
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
        return;
      }

      // 处理请求
      await transport.handleRequest(req, res, req.body);
    });

    // 处理GET和DELETE请求的可重用处理程序
    const handleSessionRequest = async (
      req: express.Request,
      res: express.Response
    ) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !this.transports[sessionId]) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }

      const transport = this.transports[sessionId];
      await transport.handleRequest(req, res);
    };

    // 处理GET请求
    this.app.get("/mcp", handleSessionRequest);

    // 处理DELETE请求
    this.app.delete("/mcp", handleSessionRequest);

    // 启动服务器
    return new Promise<void>((resolve) => {
      this.app.listen(this.config.port, this.config.host, () => {
        console.log(
          `MCSManager MCP Server is running at http://${this.config.host}:${this.config.port}/mcp`
        );
        resolve();
      });
    });
  }
}
