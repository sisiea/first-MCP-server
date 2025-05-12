import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AlertsResponse, formatAlert, makeNWSRequest } from "./service.js";
import { listDesktopFiles, readFileAsync, convertFileUriToDesktopPath, getDesktopLogFilesInfo, fileWatch } from "./file/index.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
// import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from "./log/index.js";
import chokidar from 'chokidar';

const NWS_API_BASE = "https://api.weather.gov";

// 创建 server instance
const server = new Server({
    name: "example-server",
    version: "1.0.0"
}, {
    capabilities: {
        tools: {},
        resources: {
            subscribe: true,
            listChanged: true,
        },
        logging: {

        }
    }
});

const logger = new Logger(server);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [{
            name: "get-alerts",
            description: "获取某个州的天气警报",
            inputSchema: {
                type: "object",
                properties: {
                    state: { type: "string" },
                },
                required: ["state"]
            }
        }, {
            name: "get-desktop-files",
            description: "获取桌面文件列表",
            inputSchema: {},
        }]
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get-alerts") {
        const { state } = request.params.arguments as { state: string };
        const stateCode = state.toUpperCase();
        const alertUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
        const alertsData = await makeNWSRequest<AlertsResponse>(alertUrl);

        if (!alertsData) {
            return {
                content: [
                    {
                        type: "text",
                        text: "no Alert data"
                    }
                ]
            }
        }

        const features = alertsData.features || [];
        if (features.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `no alerts for ${stateCode}`

                    }
                ]
            }
        }

        const formattedAlerts = features.map(formatAlert);
        const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;
        return {
            content: [
                {
                    type: "text",
                    text: alertsText,
                },
            ],
        };
    } else if (request.params.name === "get-desktop-files") {
        const files = await listDesktopFiles();
        const desktopFiles = `DesktopFiles :\n\n${files.filter((file) => {
            return file.type === 'file'
        }).map((file) => {
            return `${file.name} --- ${file.size}`
        }).join("\n")}`;
        return {
            content: [
                {
                    type: "text",
                    text: desktopFiles,
                },
            ],
        };
    }
    throw new Error("Tool not found");
});


// server.tool("get-alerts", "获取某个州的天气警报",
//     {
//         state: z.string().length(2).describe("两个字母的州代码（例如 CA、NY）"),
//     },
//     async ({ state }) => {
//         const stateCode = state.toUpperCase();
//         const alertUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
//         const alertsData = await makeNWSRequest<AlertsResponse>(alertUrl);

//         if (!alertsData) {
//             return {
//                 content: [
//                     {
//                         type: "text",
//                         text: "no Alert data"
//                     }
//                 ]
//             }
//         }

//         const features = alertsData.features || [];
//         if (features.length === 0) {
//             return {
//                 content: [
//                     {
//                         type: "text",
//                         text: `no alerts for ${stateCode}`

//                     }
//                 ]
//             }
//         }

//         const formattedAlerts = features.map(formatAlert);
//         const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;
//         return {
//             content: [
//                 {
//                     type: "text",
//                     text: alertsText,
//                 },
//             ],
//         };
//     }
// );



// server.tool("get-desktop-files", "获取桌面文件列表", async () => {
//     const files = await listDesktopFiles();
//     const desktopFiles = `DesktopFiles :\n\n${files.filter((file) => {
//         return file.type === 'file'
//     }).map((file) => {
//         return `${file.name} --- ${file.size}`
//     }).join("\n")}`;
//     return {
//         content: [
//             {
//                 type: "text",
//                 text: desktopFiles,
//             },
//         ],
//     };
// })

server.setRequestHandler(ListResourcesRequestSchema, async () => {
    // const desktopPath = path.join(os.homedir(), 'Desktop');
    const logFiles = await getDesktopLogFilesInfo();
    return {
        resources: logFiles.map((file) => {
            return {
                uri: `file:///logs/${file.fileName}`,
                name: `Application Logs - ${file.fileName}`,
                mimeType: "text/plain",
                filePath: file.filePath,
            }
        }),
    };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    logger.debug(`request.params  ${JSON.stringify(request.params)}`)
    if (uri.indexOf('file:///logs/') === 0) {
        const uriStr = uri.toString();
        const desktopFileURI = convertFileUriToDesktopPath(uriStr);
        const logContents = await readFileAsync(desktopFileURI);
        if (logContents.status === 'error') {
            return {
                contents: [
                    {
                        uri: uriStr,
                        mimeType: "text/plain",
                        text: "log not found"
                    }
                ]
            }
        }
        return {
            contents: [
                {
                    uri: uriStr,
                    mimeType: "text/plain",
                    text: logContents.content,
                }
            ]
        };
    }

    throw new Error("Resource not found");
});



// const AppLogResource = server.resource("app logs", 'file:///logs/app.log', async (uri: URL) => {
//     const uriStr = uri.toString();
//     const desktopFileURI = convertFileUriToDesktopPath(uriStr);
//     const logContents = await readFileAsync(desktopFileURI);
//     if (logContents.status === 'error') {
//         return {
//             contents: [
//                 {
//                     uri: uriStr,
//                     mimeType: "text/plain",
//                     text: "log not found"
//                 }
//             ]
//         }
//     }
//     return {
//         contents: [
//             {
//                 uri: uriStr,
//                 mimeType: "text/plain",
//                 text: logContents.content,
//             }
//         ]
//     };
// });

// console.log('==== AppLogResource', AppLogResource);


async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Jack MCP Server running on stdio");
    server.sendLoggingMessage({
        level: "debug",
        data: "Server started successfully",
    });
    // const desktopFileURI = convertFileUriToDesktopPath('file:///logs/app.log');
    // 1. 定义桌面路径与监听目标
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const desktopLogPath = path.join(desktopPath, '**/*.log');
    logger.debug(`desktopLogPath ${desktopLogPath}`);
    // fileWatch(desktopLogPath, (content) => {
    //     logger.debug(`[文件修改] ${desktopLogPath}`);
    //     logger.debug(`[文件修改] new content ${content}`);
    // });
    chokidar.watch(
        desktopLogPath, // 监听所有子目录的.log文件
        {
            ignored: /(^|[/\\])\../,          // 忽略隐藏文件
            persistent: true,                 // 持续监听
            ignoreInitial: true,              // 忽略初始扫描事件
            awaitWriteFinish: {               // 防抖机制（防多次触发）
                stabilityThreshold: 2000,
                pollInterval: 100
            }
        }
    ).on('add', (filePath: string) => {
        logger.debug(`[新增文件] ${filePath}`);
        // 扩展：读取文件内容
        // const content = fs.readFileSync(filePath, 'utf-8');
        server.sendResourceListChanged();
    })
        .on('change', (filePath: string) => {
            logger.debug(`[文件修改] ${filePath}`);
            // 扩展：比较文件内容差异
            server.sendResourceUpdated({
                uri: `file:///logs/${filePath}`,
                _meta: {

                }
            });
        })
        .on('unlink', (filePath: string) => {
            logger.debug(`[文件删除] ${filePath}`);
            // 扩展：触发清理逻辑
        })
        .on('error', (error: any) => {
            logger.debug(`监听错误: ${error.message}`);
        });
}

main().catch((err) => {
    console.error("Fatal error in main():", err);
    process.exit(1);
});