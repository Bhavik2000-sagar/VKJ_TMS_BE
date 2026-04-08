import type { Server } from "socket.io";
export declare function setSocketServer(server: Server): void;
export declare function emitToUser(userId: string, event: string, payload: unknown): void;
