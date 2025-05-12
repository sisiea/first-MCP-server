import chokidar from 'chokidar';
import path from 'path';
import * as os from 'os';
import { access, constants } from 'fs/promises';
import { globSync } from 'fs';

/*​
 * 监听指定目录下的 .log 文件变化
 * @param targetPath 目标路径（支持目录或文件）
 */
function watchLogFiles(targetPath: string) {
    const pathT = globSync(path.join(targetPath, '**/*.log'));
    console.log('path', pathT);
  // 初始化监听器（递归监听子目录）
  const watcher = chokidar.watch(pathT, {
    // ignored: /(^|[/\\])\../,    // 忽略隐藏文件[5](@ref)
    // ignored: (path, stats) => stats?.isFile() && !path.endsWith('.js'),
    persistent: true,           // 持久化监听
    ignoreInitial: false,        // 包含初始文件状态[2](@ref)
    awaitWriteFinish: {          // 避免编辑器保存时的多次触发[7](@ref)
      stabilityThreshold: 2000,
      pollInterval: 100
    },
    usePolling: process.platform === 'win32' // Windows 兼容性优化[5](@ref)
  });

  // 事件监听
  watcher.on("all", (event, path) => {
    console.log(event, path);
  });


watcher.on('ready', () => {
    console.log('已监听文件:', watcher.getWatched()); // 输出非空对象
    });

  // 统一事件处理函数
  const handleEvent = (eventType: string, filePath: string) => {
    console.log(`[${new Date().toISOString()}] 检测到文件 ${eventType}: ${filePath}`);
    // 可在此处扩展业务逻辑（如日志解析、备份等）
  };
}


const desktopPath = path.join(os.homedir(), 'Desktop');

try {
    await access(desktopPath, constants.R_OK | constants.W_OK);
    console.log('目录可读写');
  } catch (err) {
    console.error('权限不足或目录不存在');
  }

// 示例：监听桌面上的所有 .log 文件
watchLogFiles('.');