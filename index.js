"use strict";
const scriptContent = `
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
(function() {
const socket = io('http://127.0.0.1:3000', {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    timeout: 5000
});
const otherMice = new Map();
const MAX_USERS = 100;
document.addEventListener('mousemove', function(e) {
    socket.emit('mouse_move', {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
    });
});
socket.on('update_mouse', function(data) {
    if (!data) return;
    if (typeof data.x !== 'number' || typeof data.y !== 'number') return;
    if (data.x < 0 || data.x > 1 || data.y < 0 || data.y > 1) return;
    if (typeof data.id !== 'string' && typeof data.id !== 'number') return;
    const safeId = String(data.id).slice(0, 64);
    if (!otherMice.has(safeId) && otherMice.size > MAX_USERS) return;
    let el = otherMice.get(safeId);
    if (!el) {
        el = document.createElement('div');
        el.style.cssText = \`
            width:20px;
            height:20px;
            position:fixed;
            z-index:9999999;
            pointer-events:none;
            background-repeat:no-repeat;
            background-size:contain;
        \`;
        el.style.backgroundImage = "url('data:image/svg+xml;utf8,\
        <svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"24\\" height=\\"24\\" viewBox=\\"0 0 24 24\\">\
        <path fill=\\"black\\" d=\\"M3 2L3 22L8 17L12 22L15 20L11 15L20 15Z\\"/>\
        </svg>')";
        document.body.appendChild(el);
        otherMice.set(safeId, el);
    }
    const x = data.x * window.innerWidth;
    const y = data.y * window.innerHeight;
    el.style.transform = \`translate3d(\${x}px, \${y}px, 0)\`;
    el.style.left = '0';
    el.style.top = '0';
});
socket.on('user_left', function(id) {
    const safeId = String(id || '').slice(0, 64);
    if (otherMice.has(safeId)) {
        otherMice.get(safeId).remove();
        otherMice.delete(safeId);
    }
});
})();
</script>
`;
hexo.extend.injector.register('body_end', scriptContent, 'default');