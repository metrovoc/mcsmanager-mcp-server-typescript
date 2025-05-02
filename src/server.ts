import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
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
    // 守护进程列表资源
    this.server.resource("daemons", "mcsm://daemons", async (uri) => {
      try {
        const response = await this.api.getDaemons();
        if (response.status !== 200) {
          throw new Error(`Failed to get daemons: ${response.status}`);
        }

        const daemonsInfo = response.data.map((daemon: any) => {
          return {
            id: daemon.uuid,
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
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(daemonsInfo, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching daemons:", error);
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching daemons: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    });

    // 实例列表资源
    this.server.resource(
      "instances",
      new ResourceTemplate("mcsm://daemons/{daemonId}/instances", {
        list: undefined,
      }),
      async (uri, { daemonId }) => {
        try {
          const daemonIdStr = Array.isArray(daemonId) ? daemonId[0] : daemonId;
          const response = await this.api.getInstances(daemonIdStr);
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
            contents: [
              {
                uri: uri.href,
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
            contents: [
              {
                uri: uri.href,
                text: `Error fetching instances: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // 实例详情资源
    this.server.resource(
      "instance",
      new ResourceTemplate("mcsm://daemons/{daemonId}/instances/{instanceId}", {
        list: undefined,
      }),
      async (uri, { daemonId, instanceId }) => {
        try {
          const daemonIdStr = Array.isArray(daemonId) ? daemonId[0] : daemonId;
          const instanceIdStr = Array.isArray(instanceId)
            ? instanceId[0]
            : instanceId;
          const response = await this.api.getInstanceDetail(
            instanceIdStr,
            daemonIdStr
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
            contents: [
              {
                uri: uri.href,
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
            contents: [
              {
                uri: uri.href,
                text: `Error fetching instance details: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // 文件列表资源
    this.server.resource(
      "files",
      new ResourceTemplate(
        "mcsm://daemons/{daemonId}/instances/{instanceId}/files/{path*}",
        { list: undefined }
      ),
      async (uri, { daemonId, instanceId, path }) => {
        try {
          const pathStr = Array.isArray(path) ? path[0] : path;
          const targetPath = pathStr || "";
          const daemonIdStr = Array.isArray(daemonId) ? daemonId[0] : daemonId;
          const instanceIdStr = Array.isArray(instanceId)
            ? instanceId[0]
            : instanceId;
          const response = await this.api.getFileList(
            instanceIdStr,
            daemonIdStr,
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
            contents: [
              {
                uri: uri.href,
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
            contents: [
              {
                uri: uri.href,
                text: `Error fetching files: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // 文件内容资源
    this.server.resource(
      "file-content",
      new ResourceTemplate(
        "mcsm://daemons/{daemonId}/instances/{instanceId}/file-content/{filePath*}",
        { list: undefined }
      ),
      async (uri, { daemonId, instanceId, filePath }) => {
        try {
          if (!filePath) {
            throw new Error("File path is required");
          }

          const daemonIdStr = Array.isArray(daemonId) ? daemonId[0] : daemonId;
          const instanceIdStr = Array.isArray(instanceId)
            ? instanceId[0]
            : instanceId;
          const filePathStr = Array.isArray(filePath) ? filePath[0] : filePath;

          const response = await this.api.getFileContent(
            instanceIdStr,
            daemonIdStr,
            filePathStr
          );
          if (response.status !== 200) {
            throw new Error(`Failed to get file content: ${response.status}`);
          }

          return {
            contents: [
              {
                uri: uri.href,
                text: response.data,
              },
            ],
          };
        } catch (error) {
          console.error(`Error fetching file content for ${filePath}:`, error);
          return {
            contents: [
              {
                uri: uri.href,
                text: `Error fetching file content: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // 面板概览资源
    this.server.resource("overview", "mcsm://overview", async (uri) => {
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
          chart: {
            system: overview.chart.system,
            request: overview.chart.request,
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
            cpuMemChart: daemon.cpuMemChart,
            uuid: daemon.uuid,
            ip: daemon.ip,
            port: daemon.port,
            prefix: daemon.prefix,
            available: daemon.available,
            remarks: daemon.remarks,
          })),
        };

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(overviewInfo, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching overview:", error);
        return {
          contents: [
            {
              uri: uri.href,
              text: `Error fetching overview: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    });
  }

  /**
   * 注册工具
   */
  private registerTools() {
    // 启动实例工具
    this.server.tool(
      "start-instance",
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
