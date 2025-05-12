import { Server } from "@modelcontextprotocol/sdk/server/index.js";

export class Logger {
    server: Server;
    constructor(server: Server) {
        this.server = server;
    }

    debug(message: string) {
        this.server.sendLoggingMessage({
            level: "debug",
            data: message,
          });
    }

    info(message: string) {
        this.server.sendLoggingMessage({
            level: "info",
            data: message,
          });
    }
}