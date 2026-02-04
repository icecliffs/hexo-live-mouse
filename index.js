"use strict";
const scriptContent = `
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
(function() {
    const socket = io('https://nmsl.io', {
        transports: ['websocket'],
        reconnectionAttempts: 5,
        timeout: 5000
    });
    const otherMice = new Map();
    const MAX_USERS = 100;
    const myFakeGps = (Math.random()*90-45).toFixed(4) + "," + (Math.random()*180-90).toFixed(4);
    let myIP = "loading...";
    const ipLabel = document.createElement('div');
    ipLabel.style.cssText = \`
        position: fixed;
        z-index: 99999999;
        pointer-events: none;
        font-size: 11px;
        line-height: 1.2;
        padding: 3px 8px;
        border-radius: 4px;
        background: rgba(0,0,0,0.75);
        color: #fff;
        font-family: monospace;
        box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    \`;
    document.body.appendChild(ipLabel);

    fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => { if (d && d.ip) myIP = d.ip; })
        .catch(() => { myIP = "ip unknown"; });

    document.addEventListener('mousemove', function(e) {
        ipLabel.style.left = (e.clientX + 16) + 'px';
        ipLabel.style.top  = (e.clientY + 16) + 'px';
        ipLabel.textContent = \`\${myIP} || GPS: \${myFakeGps}\`;
        socket.emit('mouse_move', {
            x: e.clientX / window.innerWidth,
            y: e.clientY / window.innerHeight
        });
    });
    function renderMouse(data) {
        if (!data || !data.id) return;
        if (typeof data.x !== 'number' || typeof data.y !== 'number') return;
        const safeId = String(data.id).slice(0, 64);
        if (!otherMice.has(safeId) && otherMice.size > MAX_USERS) return;
        let container = otherMice.get(safeId);
        if (!container) {
            container = document.createElement('div');
            container.style.cssText = \`
                position: fixed;
                z-index: 9999998;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                will-change: transform;
                transition: transform 0.1s linear;
            \`;
            const cursor = document.createElement('div');
            cursor.style.cssText = \`
                width: 20px;
                height: 20px;
                background-repeat: no-repeat;
                background-size: contain;
                background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='black' stroke='white' stroke-width='1' d='M3 2L3 22L8 17L12 22L15 20L11 15L20 15Z'/></svg>");
            \`;
            const label = document.createElement('div');
            label.className = 'remote-info-tag';
            label.style.cssText = \`
                font-size: 10px;
                background: rgba(30, 30, 30, 0.85);
                color: #00ff00;
                padding: 2px 5px;
                border-radius: 3px;
                white-space: nowrap;
                margin-top: 4px;
                margin-left: 12px;
                font-family: monospace;
                box-shadow: 1px 1px 4px rgba(0,0,0,0.4);
            \`;
            container.appendChild(cursor);
            container.appendChild(label);
            document.body.appendChild(container);
            otherMice.set(safeId, container);
        }
        const x = data.x * window.innerWidth;
        const y = data.y * window.innerHeight;
        container.style.transform = \`translate3d(\${x}px, \${y}px, 0)\`;
        container.style.left = '0';
        container.style.top = '0';
        const labelEl = container.querySelector('.remote-info-tag');
        if (labelEl) {
            const displayIp = data.ip || '0.0.0.0';
            const displayGps = data.gps || '0,0';
            labelEl.textContent = \`\${displayIp} || \${displayGps}\`;
        }
    }
    socket.on('initial_state', function(list) {
        if (!Array.isArray(list)) return;
        list.forEach(renderMouse);
    });
    socket.on('update_mouse', renderMouse);
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