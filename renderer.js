const pet = document.getElementById('pet');
const bubble = document.getElementById('bubble');

const frameRateMs = {
  idle: 240,
  walk: 150,
  sleep: 380,
  eat: 170,
  clickReaction: 130
};

const animations = {
  idle: ['idle-01', 'idle-02', 'idle-03', 'idle-04', 'idle-05', 'idle-06'],
  walk: ['walk-01', 'walk-02', 'walk-03', 'walk-04'],
  sleep: ['sleep-01', 'sleep-02', 'sleep-03', 'sleep-04'],
  eat: ['eat-01', 'eat-02', 'eat-03', 'eat-04'],
  clickReaction: ['click-reaction-01', 'click-reaction-02', 'click-reaction-03', 'click-reaction-04', 'click-reaction-05']
};

const chatLines = ['别摸鱼啦！', '汪汪！', '本哈士奇今天没有拆家', '认真工作，摸我也行~', '我在看着你敲代码！'];

let currentState = 'idle';
let autonomousTimer = null;
let frameTimer = null;
let isBusy = false;
let facing = 1;
let dragging = false;
let lastPointer = null;

function preloadFrames() {
  Object.values(animations).flat().forEach((name) => {
    const img = new Image();
    img.src = `assets/${name}.png`;
  });
}

function showBubble(text, duration = 2600) {
  bubble.textContent = text;
  bubble.classList.remove('hidden');
  clearTimeout(showBubble._timer);
  showBubble._timer = setTimeout(() => bubble.classList.add('hidden'), duration);
}

function setFacing(direction) {
  facing = direction >= 0 ? 1 : -1;
  pet.classList.toggle('flipped', facing < 0);
}

function playAnimation(state, { loop = true, onComplete } = {}) {
  clearInterval(frameTimer);
  currentState = state;
  const frames = animations[state];
  let i = 0;
  pet.src = `assets/${frames[0]}.png`;

  frameTimer = setInterval(() => {
    i += 1;
    if (i >= frames.length) {
      if (!loop) {
        clearInterval(frameTimer);
        onComplete?.();
        return;
      }
      i = 0;
    }
    pet.src = `assets/${frames[i]}.png`;
  }, frameRateMs[state]);
}

async function doWalkMotion(durationMs = 3800) {
  const startedAt = Date.now();
  const step = 4;
  while (Date.now() - startedAt < durationMs && currentState === 'walk' && !isBusy) {
    const bounds = await window.petAPI.getBounds();
    if (!bounds) break;
    const leftLimit = bounds.workArea.x;
    const rightLimit = bounds.workArea.x + bounds.workArea.width - bounds.width;
    if (bounds.x <= leftLimit + 2) setFacing(1);
    if (bounds.x >= rightLimit - 2) setFacing(-1);
    await window.petAPI.moveBy(step * facing, 0);
    await new Promise((r) => setTimeout(r, 40));
  }
}

function scheduleAutonomous() {
  clearTimeout(autonomousTimer);
  const states = ['idle', 'walk', 'sleep'];
  const next = states[Math.floor(Math.random() * states.length)];

  if (next === 'walk') {
    playAnimation('walk', { loop: true });
    doWalkMotion(3500 + Math.random() * 2500).finally(() => {
      if (!isBusy) {
        playAnimation('idle', { loop: true });
        autonomousTimer = setTimeout(scheduleAutonomous, 1200 + Math.random() * 2400);
      }
    });
    return;
  }

  playAnimation(next, { loop: true });
  autonomousTimer = setTimeout(scheduleAutonomous, 3000 + Math.random() * 4500);
}

function temporaryAction(state, text) {
  if (isBusy) return;
  isBusy = true;
  clearTimeout(autonomousTimer);
  if (text) showBubble(text);
  playAnimation(state, {
    loop: false,
    onComplete: () => {
      isBusy = false;
      playAnimation('idle', { loop: true });
      autonomousTimer = setTimeout(scheduleAutonomous, 1200);
    }
  });
}

pet.addEventListener('click', () => {
  temporaryAction('clickReaction', chatLines[Math.floor(Math.random() * chatLines.length)]);
});
pet.addEventListener('dblclick', () => temporaryAction('eat', '吧唧吧唧...真好吃！'));
pet.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  temporaryAction('eat', '吧唧吧唧...真好吃！');
});

pet.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastPointer = { x: e.screenX, y: e.screenY };
  pet.setPointerCapture(e.pointerId);
});
pet.addEventListener('pointermove', async (e) => {
  if (!dragging || !lastPointer) return;
  const dx = e.screenX - lastPointer.x;
  const dy = e.screenY - lastPointer.y;
  lastPointer = { x: e.screenX, y: e.screenY };
  await window.petAPI.moveBy(dx, dy);
});
function stopDrag() {
  dragging = false;
  lastPointer = null;
}
pet.addEventListener('pointerup', stopDrag);
pet.addEventListener('pointercancel', stopDrag);

setInterval(() => showBubble('主人，该站起来活动一下啦！', 3800), 60 * 60 * 1000);
setInterval(() => showBubble('快喝口水，本哈士奇监督你！', 3800), 2 * 60 * 60 * 1000);

preloadFrames();
setFacing(-1);
playAnimation('idle', { loop: true });
autonomousTimer = setTimeout(scheduleAutonomous, 2000);
