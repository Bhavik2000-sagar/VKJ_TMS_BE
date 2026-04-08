import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
export declare function attachSocket(httpServer: HttpServer): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export type SocketIOServer = ReturnType<typeof attachSocket>;
