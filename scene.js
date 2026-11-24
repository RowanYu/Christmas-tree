export class ParticleTree {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.particles = [];
    this.decorations = [];
    this.mode = 'tree';
    this.angle = 0;
    this.swipeVelocity = 0;
    this.height = 12;
    this.makeParticles();
    this.makeDecorations();
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.last = 0;
    requestAnimationFrame(time => this.frame(time));
  }

  makeParticles() {
    const count = 6800;
    const tau = Math.PI * 2;
    const color = () => {
      const warm = Math.random() < .22;
      return warm ? `rgba(255,${195 + Math.random() * 55|0},${137 + Math.random() * 65|0},${.65 + Math.random() * .35})` : `rgba(${202 + Math.random() * 53|0},${207 + Math.random() * 48|0},${218 + Math.random() * 37|0},${.45 + Math.random() * .5})`;
    };
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const h = Math.pow(u, 1.55);
      const y = h * this.height;
      const isLight = i < count * .42;
      let radius = (1 - h) * (isLight ? 3.6 : 4.1);
      radius *= 1 + .32 * Math.max(0, Math.sin((h * 6 + .1) * tau));
      const a = isLight ? u * 9 * tau + (Math.random() - .5) * .38 : Math.random() * tau;
      radius *= isLight ? .88 + Math.random() * .2 : Math.sqrt(Math.random());
      const tree = [Math.cos(a) * radius, y, Math.sin(a) * radius];
      const d = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1];
      const length = Math.hypot(...d) || 1;
      const spread = 5 + Math.random() * 11;
      const burst = [d[0] / length * spread, d[1] / length * spread + 5, d[2] / length * spread];
      this.particles.push({ p: tree.slice(), tree, burst, color: color(), size: .65 + Math.random() * 1.2, phase: Math.random() * tau });
    }
    // A glowing star above the tree and a soft ring of ground lights.
    for (let i = 0; i < 430; i++) {
      const a = Math.random() * tau;
      const r = 4.8 + Math.random() * 5.5;
      const tree = [Math.cos(a) * r, -.22, Math.sin(a) * r];
      const d = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1];
      const length = Math.hypot(...d) || 1;
      const spread = 5 + Math.random() * 11;
      this.particles.push({ p: tree.slice(), tree, burst: [d[0] / length * spread, d[1] / length * spread + 5, d[2] / length * spread], color: `rgba(164,190,255,${.25 + Math.random() * .35})`, size: .6 + Math.random() * .7, phase: Math.random() * tau });
    }
  }

  makeDecorations() {
    const tau = Math.PI * 2;
    const ornamentColors = ['#e84b4b', '#f0c96e', '#8faed4', '#f0e5c9', '#d97a86'];
    for (let i = 0; i < 62; i++) {
      const y = .8 + Math.random() * 10.2;
      const h = y / this.height;
      const a = Math.random() * tau;
      const radius = (1 - h) * 4.05 * (1 + .27 * Math.max(0, Math.sin((h * 6 + .1) * tau))) + .12;
      const tree = [Math.cos(a) * radius, y, Math.sin(a) * radius];
      this.decorations.push(this.makeDecoration('ornament', tree, {
        color: ornamentColors[i % ornamentColors.length], size: .18 + Math.random() * .17,
      }));
    }
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * tau + .15;
      const radius = 2.55 + (i % 3) * .7;
      const tree = [Math.cos(a) * radius, -.58 + (i % 2) * .12, Math.sin(a) * radius];
      this.decorations.push(this.makeDecoration('gift', tree, {
        color: ['#a52e3d', '#cfad63', '#254a43', '#e4d4ae'][i % 4], size: .7 + (i % 3) * .14, twist: a,
      }));
    }
    const frameTones = [['#e9a878', '#45677a'], ['#d88b62', '#637953'], ['#e9c37d', '#87515a'], ['#879eb1', '#db9d75'], ['#e8c88b', '#42636c']];
    for (let i = 0; i < frameTones.length; i++) {
      const y = 2.5 + i * 1.3;
      const a = i * 2.2 + .5;
      const radius = (1 - y / this.height) * 4.2 + .35;
      this.decorations.push(this.makeDecoration('frame', [Math.cos(a) * radius, y, Math.sin(a) * radius], {
        tones: frameTones[i], size: .5,
      }));
    }
  }

  makeDecoration(kind, tree, details) {
    const d = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1];
    const length = Math.hypot(...d) || 1;
    const spread = 5 + Math.random() * 11;
    return { kind, p: tree.slice(), tree, burst: [d[0] / length * spread, d[1] / length * spread + 5, d[2] / length * spread], ...details };
  }

  resize() {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    this.width = Math.max(1, Math.floor(this.canvas.clientWidth * ratio));
    this.heightPx = Math.max(1, Math.floor(this.canvas.clientHeight * ratio));
    this.canvas.width = this.width;
    this.canvas.height = this.heightPx;
  }

  setMode(mode) { this.mode = mode; }

  swipe(direction) {
    this.mode = 'scatter';
    // Sign convention: screen-right gesture increases the world yaw.
    this.swipeVelocity = direction * 2.8;
  }

  frame(time) {
    const dt = this.last ? Math.min((time - this.last) / 1000, .04) : .016;
    this.last = time;
    this.angle += (.075 + this.swipeVelocity) * dt;
    this.swipeVelocity *= Math.exp(-dt * 2.4);
    if (Math.abs(this.swipeVelocity) < .025) this.swipeVelocity = 0;

    const ctx = this.ctx;
    const w = this.width, h = this.heightPx;
    ctx.fillStyle = '#080b13';
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w * .67, h * .48, 0, w * .67, h * .48, h * .65);
    glow.addColorStop(0, '#152231'); glow.addColorStop(.48, '#0e1621'); glow.addColorStop(1, '#080b13');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

    const cx = w * (w < h ? .5 : .56);
    const cy = h * .57;
    const focal = w < h ? Math.min(h * .55, w * 1.5) : Math.min(h * 1.08, w * .6);
    const cos = Math.cos(this.angle), sin = Math.sin(this.angle);
    const alpha = this.mode === 'scatter' ? 1 : 0;
    const projected = [];
    for (const particle of this.particles.concat(this.decorations)) {
      const destination = alpha ? particle.burst : particle.tree;
      const ease = Math.min(1, dt * (alpha ? 5.4 : 4.2));
      for (let axis = 0; axis < 3; axis++) particle.p[axis] += (destination[axis] - particle.p[axis]) * ease;
      const x = particle.p[0] * cos - particle.p[2] * sin;
      const z = particle.p[0] * sin + particle.p[2] * cos;
      const y = particle.p[1];
      const cameraDepth = 17 + z - y * .14;
      const scale = focal / cameraDepth;
      const sx = cx + x * scale * (w < h ? 1.08 : 1.34);
      const sy = cy - (y - 5.7) * scale;
      if (sx < -5 || sx > w + 5 || sy < -5 || sy > h + 5) continue;
      projected.push({ ...particle, sx, sy, depth: cameraDepth, scale });
    }
    projected.sort((a, b) => b.depth - a.depth);
    for (const p of projected) {
      ctx.globalAlpha = Math.max(.22, Math.min(1, 20 / p.depth));
      if (p.kind === 'ornament') this.drawOrnament(ctx, p);
      else if (p.kind === 'gift') this.drawGift(ctx, p);
      else if (p.kind === 'frame') this.drawFrame(ctx, p);
      else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(.65, p.size * p.scale * .035), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    const treeTop = cy - (this.height - 5.7) * focal / (17 - this.height * .14);
    this.drawStar(ctx, cx, treeTop - h * .055, Math.max(10, h * .022));
    this.drawSnow(ctx, time / 1000, w, h);
    requestAnimationFrame(next => this.frame(next));
  }

  drawOrnament(ctx, p) {
    const r = Math.max(2.1, p.size * p.scale * .62);
    const glow = ctx.createRadialGradient(p.sx - r * .28, p.sy - r * .32, .2, p.sx, p.sy, r * 1.8);
    glow.addColorStop(0, '#fff9df'); glow.addColorStop(.2, p.color); glow.addColorStop(1, `${p.color}00`);
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 1.8, 0, Math.PI * 2); ctx.fill();
    const orb = ctx.createRadialGradient(p.sx - r * .35, p.sy - r * .38, .2, p.sx, p.sy, r);
    orb.addColorStop(0, '#fff8e5'); orb.addColorStop(.23, p.color); orb.addColorStop(1, '#351d2a');
    ctx.fillStyle = orb; ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff9e4'; ctx.globalAlpha *= .8; ctx.beginPath(); ctx.arc(p.sx - r * .3, p.sy - r * .35, Math.max(1, r * .13), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawGift(ctx, p) {
    const size = p.size * p.scale * .68;
    const w = Math.max(12, size), h = w * .72, d = w * .2;
    const x = p.sx, y = p.sy;
    ctx.fillStyle = '#070a0dbb'; ctx.fillRect(x - w * .55, y - h * .35, w * 1.2, h * .9);
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x + w / 2, y - h / 2); ctx.lineTo(x + w / 2, y + h / 2); ctx.lineTo(x - w / 2, y + h / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x - w / 2 + d, y - h / 2 - d); ctx.lineTo(x + w / 2 + d, y - h / 2 - d); ctx.lineTo(x + w / 2, y - h / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.moveTo(x + w / 2, y - h / 2); ctx.lineTo(x + w / 2 + d, y - h / 2 - d); ctx.lineTo(x + w / 2 + d, y + h / 2 - d); ctx.lineTo(x + w / 2, y + h / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4dda0'; ctx.fillRect(x - w * .09, y - h / 2 - d * .25, w * .18, h + d * .25); ctx.fillRect(x - w / 2, y - h * .11, w + d, h * .17);
    ctx.strokeStyle = '#f4dda0'; ctx.lineWidth = Math.max(1, w * .055); ctx.beginPath(); ctx.ellipse(x, y - h / 2 - d * .1, w * .15, h * .14, -.4, Math.PI, Math.PI * 2); ctx.stroke();
  }

  drawFrame(ctx, p) {
    const size = Math.max(12, p.size * p.scale * .66);
    const w = size, h = size * .78, x = p.sx - w / 2, y = p.sy - h / 2;
    ctx.fillStyle = '#d7bf85'; ctx.shadowColor = '#f5dfac'; ctx.shadowBlur = 8;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6); ctx.shadowBlur = 0;
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, p.tones[0]); grad.addColorStop(1, p.tones[1]);
    ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(249,241,218,.8)'; ctx.beginPath(); ctx.arc(x + w * .7, y + h * .28, h * .12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.tones[1]; ctx.beginPath(); ctx.moveTo(x, y + h * .78); ctx.lineTo(x + w * .42, y + h * .3); ctx.lineTo(x + w * .7, y + h * .62); ctx.lineTo(x + w, y + h * .36); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  }

  drawStar(ctx, x, y, size) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3.2);
    glow.addColorStop(0, 'rgba(255,237,180,.9)'); glow.addColorStop(.25, 'rgba(255,214,116,.4)'); glow.addColorStop(1, 'rgba(255,199,80,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, size * 3.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff3c5'; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 ? size * .38 : size;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }

  drawSnow(ctx, now, w, h) {
    ctx.fillStyle = 'rgba(255,255,255,.56)';
    for (let i = 0; i < 70; i++) {
      const x = ((i * 127.13 + Math.sin(now * .23 + i) * 38) % w + w) % w;
      const y = ((i * 91.7 + now * (16 + i % 7) * .2) % h + h) % h;
      const r = i % 9 === 0 ? 1.5 : .8;
      ctx.globalAlpha = .2 + (i % 7) * .07;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
