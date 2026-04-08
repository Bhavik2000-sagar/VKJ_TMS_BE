let io = null;
export function setSocketServer(server) {
    io = server;
}
export function emitToUser(userId, event, payload) {
    io?.to(`user:${userId}`).emit(event, payload);
}
//# sourceMappingURL=socketHub.js.map