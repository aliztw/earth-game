/**
 * 土之穩行｜指尖走線 - 核心邏輯
 */

export {};

const CONFIG = {
    duration: 30,
    pathWidth: 38,
    ballRadius: 13, 
    tolerance: 0.93,
    startGraceTime: 300, 
    collisionSlackPx: 1.5,
};

const STATE = {
    status: 'START',
    timeLeft: CONFIG.duration,
    timerId: null as any,
    progress: 0,
    isDragging: false,
    pathPoints: [] as {x: number, y: number, len: number}[], 
    totalLength: 0,
    dragStartPos: { x: 0, y: 0 },
    ballStartPos: { x: 0, y: 0 }, 
    dragStartTime: 0,
    currentBallPos: { x: 0, y: 0 },
    pathGenerated: false,
};

const preventRubberBand = (e: TouchEvent) => {
    if (STATE.status === 'COUNTDOWN' || STATE.status === 'PLAYING') {
        if (e.cancelable) e.preventDefault();
    }
};

const ui = {
    els: {
        startScreen: document.getElementById('screen-start')!,
        gameScreen: document.getElementById('screen-game')!,
        gameGrid: document.getElementById('game-grid')!,
        canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
        playerGroup: document.getElementById('player-group')!, 
        playerBall: document.getElementById('player-ball')!, 
        playerHandle: document.getElementById('player-handle')!,
        startHint: document.getElementById('start-hint')!,
        timerDisplay: document.getElementById('timer-display')!,
        timerVal: document.getElementById('timer-val')!,
        btnResult: document.getElementById('btn-result') as HTMLButtonElement,
        overlayCountdown: document.getElementById('overlay-countdown')!,
        countdownNum: document.getElementById('countdown-number')!,
        modalResult: document.getElementById('modal-result')!,
        modalRules: document.getElementById('modal-rules')!,
        resPercent: document.getElementById('res-percent')!,
        resMsg: document.getElementById('res-msg')!,
        resSubMsg: document.getElementById('res-submsg')!,
        resScore: document.getElementById('res-score')!,
        
        btnStart: document.getElementById('btn-start')!,
        btnShowRules: document.getElementById('btn-show-rules')!,
        btnRestart: document.getElementById('btn-restart')!,
        btnCloseResult: document.getElementById('btn-close-result')!,
        btnPlayAgain: document.getElementById('btn-play-again')!,
        btnCloseRules: document.getElementById('btn-close-rules')!,
    },

    showGame() {
        document.body.classList.add('no-scroll');
        document.documentElement.classList.add('no-scroll');
        window.scrollTo(0, 0);
        window.addEventListener('touchmove', preventRubberBand, { passive: false });
        this.els.startScreen.classList.add('hidden-force');
        this.els.gameScreen.classList.remove('hidden-force');
        setTimeout(() => game.resizeCanvas(), 50);
    },

    showStart() {
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
        window.removeEventListener('touchmove', preventRubberBand);
        this.els.startScreen.classList.remove('hidden-force');
        this.els.gameScreen.classList.add('hidden-force');
    },

    updateTimer(val: number) {
        this.els.timerVal.textContent = val.toString();
        if (val <= 5) {
            this.els.timerDisplay.classList.add('text-red-600', 'animate-pulse');
        } else {
            this.els.timerDisplay.classList.remove('text-red-600', 'animate-pulse');
        }
    },

    enableResultBtn(enabled: boolean) {
        if (enabled) {
            this.els.btnResult.disabled = false;
            this.els.btnResult.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            this.els.btnResult.disabled = true;
            this.els.btnResult.classList.add('opacity-50', 'cursor-not-allowed');
        }
    },

    updateBallPosition(cx: number, cy: number) {
        this.els.playerGroup.style.left = `${cx - 13}px`;
        this.els.playerGroup.style.top = `${cy - 13}px`;
        this.els.playerGroup.classList.remove('hidden-force');
        STATE.currentBallPos = { x: cx, y: cy };
    },

    showCountdown(cb: () => void) {
        this.els.overlayCountdown.classList.remove('hidden-force');
        let count = 3;
        this.els.countdownNum.textContent = count.toString();
        const int = setInterval(() => {
            count--;
            if (count > 0) {
                this.els.countdownNum.textContent = count.toString();
            } else {
                clearInterval(int);
                this.els.overlayCountdown.classList.add('hidden-force');
                cb();
            }
        }, 1000);
    },

    showResult() {
        const result = game.calculateResult();
        this.els.resPercent.textContent = Math.round(STATE.progress).toString();
        this.els.resMsg.textContent = result.message;
        this.els.resSubMsg.textContent = result.subMessage;
        this.els.resScore.textContent = result.score.toString();
        this.els.modalResult.classList.remove('hidden-force');
    },

    closeResult() { this.els.modalResult.classList.add('hidden-force'); },
    showRules() { this.els.modalRules.classList.remove('hidden-force'); },
    closeRules() { this.els.modalRules.classList.add('hidden-force'); },
    toggleHint(show: boolean) {
        if(show) this.els.startHint.classList.remove('hidden-force');
        else this.els.startHint.classList.add('hidden-force');
    }
};

const game = {
    ctx: null as CanvasRenderingContext2D | null,
    path2D: null as Path2D | null,

    init() {
        STATE.status = 'START';
        ui.showStart();
        this.ctx = ui.els.canvas.getContext('2d');
        window.addEventListener('resize', () => {
           if (STATE.status !== 'START') this.resizeCanvas();
        });

        ui.els.btnStart.onclick = () => this.startCountdown();
        ui.els.btnShowRules.onclick = () => ui.showRules();
        ui.els.btnRestart.onclick = () => this.restart();
        ui.els.btnCloseResult.onclick = () => ui.closeResult();
        ui.els.btnPlayAgain.onclick = () => { this.restart(); ui.closeResult(); };
        ui.els.btnCloseRules.onclick = () => ui.closeRules();
        ui.els.btnResult.onclick = () => ui.showResult();

        const handle = ui.els.playerHandle;
        handle.addEventListener('pointerdown', (e) => this.handleDragStart(e));
        window.addEventListener('pointermove', (e) => this.handleDragMove(e));
        window.addEventListener('pointerup', (e) => this.handleDragEnd(e));
        window.addEventListener('pointercancel', (e) => this.handleDragEnd(e));
    },

    startCountdown() {
        ui.showGame(); 
        ui.closeResult();
        STATE.status = 'COUNTDOWN';
        ui.enableResultBtn(false);
        ui.updateTimer(CONFIG.duration);
        ui.toggleHint(false);
        this.resizeCanvas(); 
        if(STATE.pathPoints.length > 0) {
            const start = STATE.pathPoints[0];
            ui.updateBallPosition(start.x, start.y);
        }
        ui.showCountdown(() => { 
            window.scrollTo(0, 0);
            this.startPlaying(); 
        });
    },

    resizeCanvas() {
        const container = ui.els.gameGrid;
        ui.els.canvas.width = container.offsetWidth;
        ui.els.canvas.height = container.offsetHeight;
        
        if (!STATE.pathGenerated) {
            this.generatePath();
            STATE.pathGenerated = true;
        }
        
        this.draw();
        if (STATE.pathPoints.length > 0 && !STATE.isDragging) {
             const start = STATE.pathPoints[0];
             ui.updateBallPosition(start.x, start.y);
        }
    },

    generatePath() {
        const w = ui.els.canvas.width;
        const h = ui.els.canvas.height;
        this.path2D = new Path2D();
        STATE.pathPoints = [];
        
        const marginX = Math.max(36, CONFIG.pathWidth * 1.25);
        const marginY = Math.max(48, CONFIG.pathWidth * 1.5);
        const safeBottom = CONFIG.ballRadius + 80; 
        
        const startX = marginX;
        const endX = w - marginX;
        const yTopLimit = marginY;
        const yBottomLimit = h - (marginY + safeBottom);
        
        const hPath = yBottomLimit - yTopLimit;
        const minStepX = CONFIG.pathWidth * 2.35;
        let columns = Math.floor((endX - startX) / minStepX) + 1;
        columns = Math.min(8, Math.max(5, columns));
        const stepX = (endX - startX) / (columns - 1);
        
        const wiggleCol1 = Math.floor(columns / 2);
        let wiggleCol2 = 1;
        if (Math.abs(wiggleCol2 - wiggleCol1) < 2) wiggleCol2 = columns - 2;
        const wiggleAmp = Math.min(stepX * 0.18, CONFIG.pathWidth * 0.55);
        const wiggleAmp2 = wiggleAmp * 0.8;
        const ranges = [[0.12, 0.20], [0.80, 0.90], [0.25, 0.38], [0.60, 0.75]];
        const yTargets = [];
        for (let i = 0; i < columns - 1; i++) {
            const range = ranges[i % ranges.length];
            const val = range[0] + Math.random() * (range[1] - range[0]);
            yTargets.push(val);
        }
        yTargets.push(0.0);

        let rawPoints = [];
        rawPoints.push({x: startX, y: yBottomLimit});
        for (let i = 0; i < columns; i++) {
            const x = startX + i * stepX;
            const targetY = yTopLimit + yTargets[i] * hPath;
            const lastPoint = rawPoints[rawPoints.length - 1];
            const startY = (i === 0) ? yBottomLimit : lastPoint.y;
            
            if (i === wiggleCol1 || i === wiggleCol2) {
                const count = (i === wiggleCol1) ? 3 : 2;
                const stepY = (targetY - startY) / count;
                const currentAmp = (i === wiggleCol1) ? wiggleAmp : wiggleAmp2;
                for (let k = 1; k < count; k++) {
                    const dir = (k % 2 === 1) ? 1 : -1;
                    rawPoints.push({x: x + dir * currentAmp, y: startY + k * stepY});
                }
            }
            rawPoints.push({x: x, y: targetY});
            if (i < columns - 1) {
                const nextX = startX + (i + 1) * stepX;
                rawPoints.push({x: nextX, y: targetY});
            }
        }
        
        if (rawPoints.length > 0) {
            this.path2D.moveTo(rawPoints[0].x, rawPoints[0].y);
            STATE.pathPoints.push({x: rawPoints[0].x, y: rawPoints[0].y, len: 0});
            let cLen = 0;
            for (let i = 1; i < rawPoints.length; i++) {
                const p1 = rawPoints[i-1];
                const p2 = rawPoints[i];
                this.path2D.lineTo(p2.x, p2.y);
                const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const steps = Math.max(1, Math.ceil(dist / 4)); 
                for (let s = 1; s <= steps; s++) {
                    const t = s / steps;
                    const px = p1.x + (p2.x - p1.x) * t;
                    const py = p1.y + (p2.y - p1.y) * t;
                    const segLen = dist / steps;
                    cLen += segLen;
                    STATE.pathPoints.push({x: px, y: py, len: cLen});
                }
            }
            STATE.totalLength = cLen;
        }
    },

    draw() {
        if (!this.ctx || !this.path2D) return;
        const w = ui.els.canvas.width;
        const h = ui.els.canvas.height;
        this.ctx.clearRect(0, 0, w, h);
        
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#a37e4d';
        this.ctx.lineWidth = CONFIG.pathWidth;
        this.ctx.stroke(this.path2D);
        
        this.ctx.strokeStyle = '#e5d3b0';
        this.ctx.lineWidth = CONFIG.pathWidth * CONFIG.tolerance;
        this.ctx.stroke(this.path2D);
        
        this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke(this.path2D);
        
        const start = STATE.pathPoints[0];
        const end = STATE.pathPoints[STATE.pathPoints.length-1];
        
        this.ctx.font = 'bold 18px "Noto Sans TC"';
        this.ctx.fillStyle = '#b45309';
        this.ctx.textAlign = 'center';
        
        this.ctx.fillText('起點', start.x, start.y + 35); 
        this.ctx.beginPath();
        this.ctx.arc(start.x, start.y, 8, 0, Math.PI*2);
        this.ctx.fillStyle = '#166534'; 
        this.ctx.fill();
        
        this.ctx.fillStyle = '#b45309';
        this.ctx.fillText('終點', end.x, end.y - 25);
        this.ctx.beginPath();
        this.ctx.arc(end.x, end.y, 10, 0, Math.PI * 2);
        this.ctx.fillStyle = '#b45309';
        this.ctx.fill();
    },

    startPlaying() {
        STATE.status = 'PLAYING';
        STATE.timeLeft = CONFIG.duration;
        STATE.progress = 0;
        STATE.isDragging = false;
        ui.toggleHint(true);
        if (STATE.timerId) clearInterval(STATE.timerId);
        STATE.timerId = setInterval(() => {
            STATE.timeLeft--;
            ui.updateTimer(STATE.timeLeft);
            if (STATE.timeLeft <= 0) this.finishGame();
        }, 1000);
    },

    handleDragStart(e: PointerEvent) {
        if (STATE.status !== 'PLAYING') return;
        STATE.isDragging = true;
        ui.toggleHint(false);
        STATE.dragStartPos = { x: e.clientX, y: e.clientY };
        STATE.ballStartPos = { ...STATE.currentBallPos };
        STATE.dragStartTime = Date.now();
        ui.els.playerGroup.style.cursor = 'grabbing';
        ui.els.playerHandle.style.cursor = 'grabbing';
    },

    handleDragMove(e: PointerEvent) {
        if (STATE.status !== 'PLAYING' || !STATE.isDragging) return;
        const deltaX = e.clientX - STATE.dragStartPos.x;
        const deltaY = e.clientY - STATE.dragStartPos.y;
        const newX = STATE.ballStartPos.x + deltaX;
        const newY = STATE.ballStartPos.y + deltaY;
        const gridRect = ui.els.gameGrid.getBoundingClientRect();
        
        if (newX < 0 || newX > gridRect.width || newY < 0 || newY > gridRect.height) { this.failGame(); return; }
        
        ui.updateBallPosition(newX, newY);
        const timeElapsed = Date.now() - STATE.dragStartTime;
        if (timeElapsed < CONFIG.startGraceTime) { this.checkProgress(newX, newY); return; }
        
        const collisionInfo = this.checkCollision(newX, newY);
        if (collisionInfo.collided) this.failGame();
        else this.updateProgressFromInfo(collisionInfo);
    },

    checkCollision(x: number, y: number) {
        if (!this.ctx || !this.path2D) return { collided: true, closestIdx: 0, dist: 0 };
        let minDist = Infinity;
        let closestIdx = 0;
        for(let i=0; i<STATE.pathPoints.length; i++) {
            const p = STATE.pathPoints[i];
            const d = (x - p.x)**2 + (y - p.y)**2;
            if (d < minDist) { minDist = d; closestIdx = i; }
        }
        
        let collided = false;
        this.ctx.save();
        this.ctx.lineWidth = CONFIG.pathWidth * CONFIG.tolerance;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        const effectiveRadius = CONFIG.ballRadius - CONFIG.collisionSlackPx;
        const samples = 12; 
        const angleStep = (Math.PI * 2) / samples;
        
        if (!this.ctx.isPointInStroke(this.path2D, x, y)) {
            collided = true;
        } else {
            for (let i = 0; i < samples; i++) {
                const angle = i * angleStep;
                const sx = x + Math.cos(angle) * effectiveRadius;
                const sy = y + Math.sin(angle) * effectiveRadius;
                if (!this.ctx.isPointInStroke(this.path2D, sx, sy)) { collided = true; break; }
            }
        }
        this.ctx.restore();
        return { collided, closestIdx, dist: Math.sqrt(minDist) };
    },

    checkProgress(x: number, y: number) {
        const info = this.checkCollision(x, y);
        this.updateProgressFromInfo(info);
    },
    
    updateProgressFromInfo(info: { collided: boolean, closestIdx: number, dist: number }) {
        const currentLen = STATE.pathPoints[info.closestIdx].len;
        const percent = (currentLen / STATE.totalLength) * 100;
        if (percent > STATE.progress) STATE.progress = percent;
        if (percent >= 98.5) { STATE.progress = 100; this.finishGame(); }
    },

    handleDragEnd(e: PointerEvent) {
        if (STATE.status === 'PLAYING') {
            STATE.isDragging = false;
            ui.els.playerGroup.style.cursor = 'grab';
            ui.els.playerHandle.style.cursor = 'grab';
        }
    },

    failGame() {
        STATE.status = 'FINISHED';
        clearInterval(STATE.timerId);
        ui.els.playerBall.classList.add('bg-red-600');
        setTimeout(() => {
            ui.els.playerBall.classList.remove('bg-red-600');
            ui.enableResultBtn(true);
            ui.showResult();
        }, 600);
    },

    finishGame() {
        STATE.status = 'FINISHED';
        clearInterval(STATE.timerId);
        ui.enableResultBtn(true);
        ui.showResult();
    },

    restart() {
        clearInterval(STATE.timerId);
        STATE.timeLeft = CONFIG.duration;
        STATE.progress = 0;
        STATE.isDragging = false;
        STATE.status = 'COUNTDOWN';
        
        ui.updateTimer(STATE.timeLeft);
        ui.enableResultBtn(false);
        ui.toggleHint(false);
        ui.els.playerBall.classList.remove('bg-red-600');
        
        if(STATE.pathPoints.length > 0) {
            const start = STATE.pathPoints[0];
            ui.updateBallPosition(start.x, start.y);
        }
        
        ui.showCountdown(() => { 
            window.scrollTo(0, 0);
            this.startPlaying(); 
        });
    },

    calculateResult() {
        const p = Math.round(STATE.progress);
        if (p >= 75) return { score: 3, message: '脾胃強健，動作靈巧', subMessage: '手部肌肉非常穩定，表現亮眼。' };
        else if (p >= 40) return { score: 2, message: '脾胃不錯，穩中帶進', subMessage: '穩定度不錯，下次就能走得更遠。' };
        else return { score: 1, message: '脾胃警告，需多調養', subMessage: '深呼吸，讓肌肉放鬆，下一次會更穩的。' };
    }
};

game.init();
