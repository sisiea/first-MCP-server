import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { destination, pino, Logger as PinoLogger } from "pino";
import fs, { mkdir } from "fs";
import path from "path";
import { sync } from "glob";

export class Logger {
    server: Server;
    fileLogger: PinoLogger;
    disk: boolean;
    constructor(server: Server, disk = false) {
        this.server = server;
        // 确保目录存在
        const logDir = path.resolve("./logs/applog.log");
        const logger = pino({
            level: "debug",
            transport: {
                target: "pino-pretty",
                options: {
                    destination: logDir,
                    sync: false,
                    mkdir: true,
                }
            }
        });
        this.fileLogger = logger;
        this.disk = disk;
    }

    debug(message: string) {
        this.server.sendLoggingMessage({
            level: "debug",
            data: message,
        });
        if (this.disk) {
            this.fileLogger.debug(message);
        }
    }

    info(message: string) {
        this.server.sendLoggingMessage({
            level: "info",
            data: message,
        });
        if (this.disk) {
            this.fileLogger.info(message);
        }
    }
}