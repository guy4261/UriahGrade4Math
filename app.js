const $ = id => document.getElementById(id);
const canvas = $('board');
const ctx = canvas.getContext('2d');
let squares = [], squareValue = 1, width = 0, height = 0, size = 32, drag = null;
const randomDigit = () => 1 + Math.floor(Math.random() * 9);

let animation = 0, activeField = null;
const fields = [...document.querySelectorAll('.formula input')];
function calculate() {
  const values = fields.map(f => f.value);
  if (values.some(v => !v)) throw new Error('מלאו את כל חמשת השדות כדי להשלים את התרגיל.');
  const numbers = [values[0], values[2], values[4]].map(v => {
    if (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v))) throw new Error('הקלידו מספרים שלמים קטנים מספיק לחישוב.');
    return Number(v);
  });
  const ops = [values[1], values[3]];
  if (ops.some(op => !['+', '-', '*', '/'].includes(op))) throw new Error('בחרו פעולת חשבון בכל אחד משני הרווחים.');
  const terms = [numbers[0]], additions = [];
  for (let i = 0; i < 2; i++) {
    if (ops[i] === '*' || ops[i] === '/') {
      if (ops[i] === '/' && numbers[i+1] === 0) throw new Error('אי אפשר לחלק באפס. נסו מספר אחר.');
      terms[terms.length-1] = ops[i] === '*' ? terms.at(-1) * numbers[i+1] : terms.at(-1) / numbers[i+1];
    } else { additions.push(ops[i]); terms.push(numbers[i+1]); }
  }
  const result = terms.reduce((total, term, i) => i === 0 ? term : additions[i-1] === '+' ? total + term : total - term, 0);
  if (!Number.isFinite(result) || Math.abs(result) > Number.MAX_SAFE_INTEGER) throw new Error('המספרים בתרגיל גדולים מדי. נסו מספרים קטנים יותר.');
  return result;
}
function stopAnimation() { cancelAnimationFrame(animation); animation = 0; }
function clearFeedback() { $('feedback').textContent = ''; $('feedback').className = ''; }
function showKeypad(field) {
  activeField = field;
  fields.forEach(f => f.classList.toggle('active', f === field));
  const operator = field.classList.contains('operator-field');
  const pad = $('keypad'); pad.hidden = false; pad.classList.toggle('operators', operator); pad.replaceChildren();
  const keys = operator ? ['+', '-', '*', '/'] : ['1','2','3','4','5','6','7','8','9','ניקוי','0','⌫'];
  for (const key of keys) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = key;
    if (key === '⌫') button.setAttribute('aria-label', 'מחיקת הספרה האחרונה');
    button.onpointerdown = e => e.preventDefault();
    button.onclick = () => {
      if (operator) field.value = key;
      else if (key === 'ניקוי') field.value = '';
      else if (key === '⌫') field.value = field.value.slice(0,-1);
      else field.value += key;
      clearFeedback();
      if (operator) fields[fields.indexOf(field)+1].focus();
    };
    pad.append(button);
  }
}
fields.forEach(field => {
  field.onfocus = () => showKeypad(field);
  field.oninput = () => { field.value = field.value.replace(/[^0-9]/g,''); clearFeedback(); };
  field.onkeydown = event => {
    if (event.key === 'Enter') { event.preventDefault(); $('answer-form').requestSubmit(); }
    if (field.classList.contains('operator-field') && ['+','-','*','/'].includes(event.key)) { event.preventDefault(); field.value = event.key; clearFeedback(); }
  };
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.formula, #keypad')) { $('keypad').hidden = true; fields.forEach(f => f.classList.remove('active')); }
});
function draw() {
  ctx.clearRect(0, 0, width, height);
  for (const s of squares) {
    ctx.fillStyle = '#5d874e';
    ctx.beginPath(); ctx.roundRect(s.x, s.y + 3, size, size, 5); ctx.fill();
    ctx.fillStyle = s === drag?.square ? '#a5c484' : '#7ba76b';
    ctx.beginPath(); ctx.roundRect(s.x, s.y, size, size, 5); ctx.fill();
    ctx.strokeStyle = '#ffffff35'; ctx.stroke();
  }
}
function arrange(animated = false) {
  stopAnimation(); drag = null;
  const options = [];
  for (let rows = 1; rows <= squares.length; rows++) if (squares.length % rows === 0) {
    const columns = squares.length / rows;
    const fit = Math.min(34, (width-36)/columns-7, (height-90)/rows-7);
    if (fit >= 16) options.push({rows,columns,fit});
  }
  const best = options.length ? options : [{rows:1,columns:squares.length,fit:Math.min(34,(width-36)/squares.length-7)}];
  const layout = best[Math.floor(Math.random()*best.length)];
  size = Math.max(3,layout.fit);
  const gap = 7, left = (width-layout.columns*(size+gap)+gap)/2;
  const top = 60+(height-60-layout.rows*(size+gap)+gap)/2;
  const starts = squares.map(s => ({x:s.x,y:s.y}));
  const targets = squares.map((s,i) => ({x:left+i%layout.columns*(size+gap),y:top+Math.floor(i/layout.columns)*(size+gap)}));
  if (!animated) { squares.forEach((s,i) => Object.assign(s,targets[i])); draw(); return; }
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1,(now-start)/650), ease = 1-Math.pow(1-t,3);
    squares.forEach((s,i) => { s.x=starts[i].x+(targets[i].x-starts[i].x)*ease; s.y=starts[i].y+(targets[i].y-starts[i].y)*ease; });
    draw(); if (t<1) animation=requestAnimationFrame(frame); else animation=0;
  }
  animation=requestAnimationFrame(frame);
}
function explode() {
  stopAnimation(); drag=null;
  // Give every square a radial kick, then resolve wall and square collisions.
  squares.forEach(s => {
    const angle=Math.atan2(s.y+size/2-height/2,s.x+size/2-width/2)+(Math.random()-.5)*1.3;
    const speed=400+Math.random()*450;
    s.vx=Math.cos(angle)*speed; s.vy=Math.sin(angle)*speed;
  });
  let last=performance.now(), elapsed=0;
  function frame(now) {
    const dt=Math.min((now-last)/1000,.025); last=now; elapsed+=dt;
    for (let step=0;step<3;step++) {
      const delta=dt/3;
      squares.forEach(s => {
        s.x+=s.vx*delta; s.y+=s.vy*delta;
        if(s.x<0){s.x=0;s.vx=Math.abs(s.vx)*.8;} if(s.x>width-size){s.x=width-size;s.vx=-Math.abs(s.vx)*.8;}
        if(s.y<58){s.y=58;s.vy=Math.abs(s.vy)*.8;} if(s.y>height-size-3){s.y=height-size-3;s.vy=-Math.abs(s.vy)*.8;}
        const friction=Math.exp(-1.15*delta);s.vx*=friction;s.vy*=friction;
      });
      for(let i=0;i<squares.length;i++)for(let j=i+1;j<squares.length;j++){
        const a=squares[i],b=squares[j],dx=b.x-a.x,dy=b.y-a.y;
        const overlapX=size-Math.abs(dx),overlapY=size-Math.abs(dy);
        if(overlapX<=0||overlapY<=0)continue;
        const axis=overlapX<overlapY?'x':'y',velocity=axis==='x'?'vx':'vy',sign=(axis==='x'?dx:dy)>=0?1:-1;
        const overlap=axis==='x'?overlapX:overlapY;
        a[axis]-=sign*(overlap+.01)/2;b[axis]+=sign*(overlap+.01)/2;
        const relative=(b[velocity]-a[velocity])*sign;
        if(relative<0){const impulse=-relative*.85;a[velocity]-=sign*impulse;b[velocity]+=sign*impulse;}
      }
    }
    squares.forEach(s=>{s.x=Math.max(0,Math.min(width-size,s.x));s.y=Math.max(58,Math.min(height-size-3,s.y));});
    draw();
    if(elapsed<7 && squares.some(s=>Math.hypot(s.vx,s.vy)>2)) animation=requestAnimationFrame(frame);
    else {squares.forEach(s=>{s.vx=0;s.vy=0;});animation=0;}
  }
  animation=requestAnimationFrame(frame);
}
function resize() {
  stopAnimation();
  const previousWidth = width, previousHeight = height;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  width = rect.width; height = rect.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!previousWidth) arrange();
  else { squares.forEach(s => { s.x = Math.max(0, Math.min(width - size, s.x * width / previousWidth)); s.y = Math.max(0, Math.min(height - size - 3, s.y * height / previousHeight)); }); draw(); }
}
function newRound() {
  stopAnimation();
  squares = Array.from({length: randomDigit() * randomDigit()}, () => ({x:0,y:0}));
  squareValue = randomDigit(); drag = null;
  $('value').textContent = squareValue;
  $('count').hidden = true; $('count').textContent = '';
  fields.forEach(f => f.value = ''); $('keypad').hidden = true; clearFeedback();
  resize(); arrange();
}
$('start').onclick = () => { $('home').hidden = true; $('game').hidden = false; newRound(); };
function home() { stopAnimation(); $('game').hidden = true; $('home').hidden = false; }
$('back').onclick = home;
$('brand').onclick = event => { event.preventDefault(); home(); };
$('new-round').onclick = newRound;
$('reset').onclick = () => arrange(true);
$('order').onclick = () => arrange(true);
$('explode').onclick = explode;
$('answer-form').onsubmit = event => {
  event.preventDefault();
  const feedback = $('feedback');
  try {
    const result = calculate();
    const won = Math.abs(result - squares.length * squareValue) < 1e-9;
    if(won) { $('count').hidden=false; $('count').textContent=`${squares.length} ריבועים`; }
    feedback.className = won ? 'success' : 'error';
    feedback.textContent = won ? `כל הכבוד! פתרתם נכון! יש ${squares.length} ריבועים. \u2066${squares.length} × ${squareValue} = ${result}\u2069. יופי של גילוי! ✦` : `תוצאת התרגיל שלכם היא \u2066${result}\u2069. ספרו את הריבועים והיעזרו בערך של כל אחד מהם. נסו שוב!`;
  } catch (error) { feedback.className = 'error'; feedback.textContent = error.message; }
};
function point(event) { const rect = canvas.getBoundingClientRect(); return {x:event.clientX - rect.left,y:event.clientY - rect.top}; }
canvas.onpointerdown = event => {
  const p = point(event);
  const square = [...squares].reverse().find(s => p.x >= s.x && p.x <= s.x + size && p.y >= s.y && p.y <= s.y + size);
  if (!square) return;
  stopAnimation();
  drag = {square, dx:p.x-square.x,dy:p.y-square.y,pointerId:event.pointerId};
  squares.splice(squares.indexOf(square), 1); squares.push(square);
  canvas.setPointerCapture(event.pointerId); canvas.classList.add('dragging'); draw();
};
canvas.onpointermove = event => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const p = point(event);
  drag.square.x = Math.max(0, Math.min(width-size, p.x-drag.dx));
  drag.square.y = Math.max(58, Math.min(height-size-3, p.y-drag.dy)); draw();
};
function endDrag() { drag = null; canvas.classList.remove('dragging'); draw(); }
canvas.onpointerup = endDrag; canvas.onpointercancel = endDrag; canvas.onlostpointercapture = endDrag;
new ResizeObserver(resize).observe(canvas);
