import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 接口定义
interface DesktopFile {
  name: string;
  type: 'file' | 'directory';
  size: string; // 格式化后的字符串（如 "2.34 MB"）
  modified: Date;
  absolutePath: string;
}

interface FileInfo {
    fileName: string;
    fileSize: number; // 单位：字节
    content: string;
    filePath: string;
}

// 获取桌面路径
const getDesktopPath = (): string => {
  if (os.platform() === 'win32') {
    return path.join(process.env.USERPROFILE || '', 'Desktop');
  }
  return path.join(process.env.HOME || '', 'Desktop');
};

// 主函数
export const listDesktopFiles = (): DesktopFile[] => {
  const desktopPath = getDesktopPath();
  
  // 异常处理：路径不存在时返回空数组
  if (!fs.existsSync(desktopPath)) return [];

  return fs.readdirSync(desktopPath).map(file => {
    const filePath = path.join(desktopPath, file);
    const stats = fs.statSync(filePath);
    
    return {
      name: file,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: formatFileSize(stats.size),
      modified: stats.mtime,
      absolutePath: filePath
    };
  });
};

const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024;
    index++;
  }
  return `${bytes.toFixed(2)} ${units[index]}`;
};

type AsyncFileResult = 
  | { status: 'success'; content: string }
  | { status: 'error'; errorType: 'NOT_FOUND' | 'UNKNOWN' };

export const readFileAsync = async (filePath: string): Promise<AsyncFileResult> => {
  try {
    const normalizedPath = path.resolve(filePath);
    const content = await fs.promises.readFile(normalizedPath, 'utf-8'); // 异步读取[2,5](@ref)
    return { status: 'success', content };
  } catch (err: any) {
    if (err.code === 'ENOENT') { // 识别文件不存在错误[6,7](@ref)
      return { status: 'error', errorType: 'NOT_FOUND' };
    }
    return { status: 'error', errorType: 'UNKNOWN' };
  }
};

// /​**​
//  * 将 file:///logs/ 前缀转换为桌面路径
//  * @param fileUri 输入的文件URI（如 file:///logs/app.log）
//  * @returns 转换后的桌面文件绝对路径（如 C:\Users\用户名\Desktop\app.log）
//  */
export const convertFileUriToDesktopPath = (fileUri: string): string => {
  // 1. 提取子路径（移除 file:///logs/ 前缀）
  const subPath = fileUri.replace('file:///logs/', '');

  // 2. 获取桌面路径（兼容 Windows/macOS/Linux）
  const desktopPath = (() => {
    const homeDir = os.homedir(); // 直接通过 os 模块获取用户主目录
    return path.join(homeDir, 'Desktop');
  })();

  // 3. 拼接完整路径
  return path.join(desktopPath, subPath);
};
interface LogFileInfo {
    fileName: string;    // 文件名
    fileSize: number;    // 文件大小（字节）
    content: string;     // 文件内容
    filePath: string;    // 完整文件路径
}

/*
 * 获取桌面第一层所有 .log 文件的信息
 * @returns LogFileInfo[] 文件信息数组
 */
export function getDesktopLogFilesInfo(): LogFileInfo[] {
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const logFiles: LogFileInfo[] = [];

    try {
        // 读取桌面目录下的所有条目（不递归子目录）
        const entries = fs.readdirSync(desktopPath, { withFileTypes: true });

        entries.forEach((entry) => {
            if (entry.isFile() && path.extname(entry.name) === '.log') { // 过滤文件且扩展名为 .log[4](@ref)
                const filePath = path.join(desktopPath, entry.name);
                try {
                    // 获取文件元数据（大小）[4,7](@ref)
                    const stats = fs.statSync(filePath);
                    // 读取文件内容（UTF-8 编码）[4](@ref)
                    const content = fs.readFileSync(filePath, 'utf8');
                    logFiles.push({
                        fileName: entry.name,
                        fileSize: stats.size,
                        content: content,
                        filePath: filePath
                    });
                } catch (error) {
                    console.error(`读取文件 ${entry.name} 失败: ${error instanceof Error ? error.message : error}`);
                }
            }
        });
    } catch (error) {
        console.error(`访问桌面目录失败: ${error instanceof Error ? error.message : error}`);
    }

    return logFiles;
}

export function fileWatch (path: string, cb: (content: string) => void) {
    if (fs.existsSync(path)) {
        fs.watch(path, (eventType) => {
            if (eventType === 'change') {
              const content = fs.readFileSync(path, 'utf-8');
              cb(content);
              // 发送资源更新通知（参考网页3订阅机制[3](@ref)）
            //   server.notifyResourceUpdate({
            //     uri: resourceURI,
            //     text: content,
            //     version: currentVersion.toString(),
            //     mimeType: 'text/plain'
            //   });
            }
          });
      } else {
        console.error('文件不存在，请先创建！');
      }
    
}