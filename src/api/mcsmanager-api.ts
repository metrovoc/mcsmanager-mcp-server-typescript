import axios, { AxiosInstance } from 'axios';

/**
 * MCSManager API客户端
 * 用于与MCSManager API进行通信
 */
export class MCSManagerAPI {
  private client: AxiosInstance;
  private apiKey: string;

  /**
   * 创建MCSManager API客户端
   * @param baseURL MCSManager面板的基础URL
   * @param apiKey 用户的API密钥
   */
  constructor(baseURL: string, apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
  }

  /**
   * 获取守护进程列表
   */
  async getDaemons() {
    const response = await this.client.get(`/api/service/remote_services_system?apikey=${this.apiKey}`);
    return response.data;
  }

  /**
   * 获取实例列表
   * @param daemonId 守护进程ID
   * @param page 页码
   * @param pageSize 每页大小
   */
  async getInstances(daemonId: string, page: number = 1, pageSize: number = 10) {
    const response = await this.client.get(
      `/api/service/remote_service_instances?daemonId=${daemonId}&page=${page}&page_size=${pageSize}&apikey=${this.apiKey}&instance_name=&status=&tag=[]`
    );
    return response.data;
  }

  /**
   * 获取实例详情
   * @param instanceUuid 实例ID
   * @param daemonId 守护进程ID
   */
  async getInstanceDetail(instanceUuid: string, daemonId: string) {
    const response = await this.client.get(
      `/api/instance?uuid=${instanceUuid}&daemonId=${daemonId}&apikey=${this.apiKey}`
    );
    return response.data;
  }

  /**
   * 启动实例
   * @param instanceUuid 实例ID
   * @param daemonId 守护进程ID
   */
  async startInstance(instanceUuid: string, daemonId: string) {
    const response = await this.client.post(
      `/api/instance/multi_start?apikey=${this.apiKey}`,
      [{ instanceUuid, daemonId }]
    );
    return response.data;
  }

  /**
   * 停止实例
   * @param instanceUuid 实例ID
   * @param daemonId 守护进程ID
   */
  async stopInstance(instanceUuid: string, daemonId: string) {
    const response = await this.client.post(
      `/api/instance/multi_stop?apikey=${this.apiKey}`,
      [{ instanceUuid, daemonId }]
    );
    return response.data;
  }

  /**
   * 重启实例
   * @param instanceUuid 实例ID
   * @param daemonId 守护进程ID
   */
  async restartInstance(instanceUuid: string, daemonId: string) {
    const response = await this.client.post(
      `/api/instance/multi_restart?apikey=${this.apiKey}`,
      [{ instanceUuid, daemonId }]
    );
    return response.data;
  }

  /**
   * 强制终止实例
   * @param instanceUuid 实例ID
   * @param daemonId 守护进程ID
   */
  async killInstance(instanceUuid: string, daemonId: string) {
    const response = await this.client.post(
      `/api/instance/multi_kill?apikey=${this.apiKey}`,
      [{ instanceUuid, daemonId }]
    );
    return response.data;
  }

  /**
   * 向实例发送命令
   * @param instanceUuid 实例ID
   * @param daemonId 守护进程ID
   * @param command 命令
   */
  async sendCommand(instanceUuid: string, daemonId: string, command: string) {
    const response = await this.client.get(
      `/api/protected_instance/command?uuid=${instanceUuid}&daemonId=${daemonId}&command=${encodeURIComponent(command)}&apikey=${this.apiKey}`
    );
    return response.data;
  }

  /**
   * 获取文件列表
   * @param instanceUuid 实例ID
   * @param daemonId 守护进程ID
   * @param target 目标路径
   * @param page 页码
   * @param pageSize 每页大小
   */
  async getFileList(instanceUuid: string, daemonId: string, target: string = '', page: number = 0, pageSize: number = 100) {
    const response = await this.client.get(
      `/api/files/list?uuid=${instanceUuid}&daemonId=${daemonId}&target=${encodeURIComponent(target)}&page=${page}&page_size=${pageSize}&apikey=${this.apiKey}`
    );
    return response.data;
  }

  /**
   * 获取文件内容
   * @param instanceUuid 实例ID
   * @param daemonId 守护进程ID
   * @param target 目标文件路径
   */
  async getFileContent(instanceUuid: string, daemonId: string, target: string) {
    const response = await this.client.put(
      `/api/files/?uuid=${instanceUuid}&daemonId=${daemonId}&apikey=${this.apiKey}`,
      { target }
    );
    return response.data;
  }

  /**
   * 更新文件内容
   * @param instanceUuid 实例ID
   * @param daemonId 守护进程ID
   * @param target 目标文件路径
   * @param text 文件内容
   */
  async updateFileContent(instanceUuid: string, daemonId: string, target: string, text: string) {
    const response = await this.client.put(
      `/api/files/?uuid=${instanceUuid}&daemonId=${daemonId}&apikey=${this.apiKey}`,
      { target, text }
    );
    return response.data;
  }

  /**
   * 获取用户列表
   * @param page 页码
   * @param pageSize 每页大小
   */
  async getUsers(page: number = 1, pageSize: number = 20) {
    const response = await this.client.get(
      `/api/auth/list?page=${page}&page_size=${pageSize}&apikey=${this.apiKey}`
    );
    return response.data;
  }

  /**
   * 获取面板概览信息
   */
  async getOverview() {
    const response = await this.client.get(`/api/overview?apikey=${this.apiKey}`);
    return response.data;
  }
}
