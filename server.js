"use strict";
const PORT = process.env.PORT || 3000;
const MAX_CONNECTIONS = 2000;
const MAX_PER_IP = 50;
const MOVE_INTERVAL = 40;
const IDLE_TIMEOUT = 60000;
const connectionCount = new Map();
const lastMoveCache = new Map();
const lastActive = new Map();
const io = require("socket.io")(PORT, {
    cors: {
        origin: ["http://localhost", "https://iloli.moe"],
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1024,
    pingTimeout: 20000,
    pingInterval: 25000
});
io.use((socket, next) => {
    try {
        const ip = socket.handshake.address || "unknown";
        if (io.engine.clientsCount > MAX_CONNECTIONS) {
            return next(new Error("server full"));
        }
        const count = connectionCount.get(ip) || 0;
        if (count > MAX_PER_IP) {
            return next(new Error("too many connections"));
        }
        connectionCount.set(ip, count + 1);
        socket._ip = ip;
        next();
    } catch {
        next(new Error("auth fail"));
    }
});
io.on("connection", (socket) => {
    console.log("握握手", socket.id);
    lastActive.set(socket.id, Date.now());
    socket.on("mouse_move", (data) => {
        try {
            const now = Date.now();
            const lastMove = lastMoveCache.get(socket.id) || 0;
            if (now - lastMove < MOVE_INTERVAL) return;
            if (!data) return;
            if (typeof data.x !== "number") return;
            if (typeof data.y !== "number") return;
            if (data.x < 0 || data.x > 1) return;
            if (data.y < 0 || data.y > 1) return;
            lastMoveCache.set(socket.id, now);
            lastActive.set(socket.id, now);
            socket.broadcast.volatile.emit("update_mouse", {
                id: socket.id,
                x: data.x,
                y: data.y
            });
        } catch {}
    });
    socket.on("disconnect", () => {
        try {
            console.log("握握双手", socket.id);
            lastMoveCache.delete(socket.id);
            lastActive.delete(socket.id);
            const ip = socket._ip;
            if (ip && connectionCount.has(ip)) {
                const c = connectionCount.get(ip) - 1;
                if (c <= 0) connectionCount.delete(ip);
                else connectionCount.set(ip, c);
            }
            io.emit("user_left", socket.id);
        } catch {}
    });
});
setInterval(() => {
    const now = Date.now();
    for (const [id, time] of lastActive.entries()) {
        if (now - time > IDLE_TIMEOUT) {
            const socket = io.sockets.sockets.get(id);
            if (socket) socket.disconnect(true);
        }
    }
}, 30000);
console.log("hexo-live-mouse-secure:", PORT);