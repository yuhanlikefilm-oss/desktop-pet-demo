const pet = document.getElementById('pet');
const bubble = document.getElementById('bubble');

const frameRateMs = { idle: 240, walk: 150, sleep: 380, eat: 170, clickReaction: 130 };
const aliases = {
  clickReaction: 'click-reaction'
};

let animations = {
  idle: ['idle-01.png'],
  walk: ['walk-01.png'],
  sleep: ['sleep-01.png'],
  eat: ['eat-01.png'],
  clickReaction: ['click-reaction-01.png']
};

const chatLines = ['别摸鱼啦！', '汪汪！', '本哈士奇今天没有拆家', '认真工作，摸我也行~', '我在看着你敲代码！'];

let currentState = 'idle';
let autonomousTimer = null;
let frameTimer = null;
let isBusy = false;
let facing = 1;
let dragging = false;
let lastPointer = null;
let standTimer = null;
let waterTimer = null;

function startReminderTimers(standMinutes, waterMinutes) {
  if (standTimer) clearInterval(standTimer);
  if (waterTimer) clearInterval(waterTimer);
  standTimer = setInterval(() => showBubble('主人，该站起来活动一下啦！', 3800), standMinutes * 60 * 1000);
  waterTimer = setInterval(() => showBubble('快喝口水，本哈士奇监督你！', 3800), waterMinutes * 60 * 1000);
}

function applyPetSize(px) {
  pet.style.width = `${px}px`;
  pet.style.height = `${px}px`;
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
  const frames = animations[state] || [];
  if (!frames.length) return;

  let i = 0;
  pet.src = `assets/${frames[0]}`;

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
    pet.src = `assets/${frames[i]}`;
  }, frameRateMs[state] || 180);
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

function bindEvents() {
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

  const stopDrag = () => {
    dragging = false;
    lastPointer = null;
  };

  pet.addEventListener('pointerup', stopDrag);
  pet.addEventListener('pointercancel', stopDrag);
}

function preloadFrames() {
  Object.values(animations).flat().forEach((fileName) => {
    const img = new Image();
    img.src = `assets/${fileName}`;
  });
}

async function init() {
  const manifest = await window.petAPI.getAnimationManifest();
  animations = {
    idle: manifest.idle || animations.idle,
    walk: manifest.walk || animations.walk,
    sleep: manifest.sleep || animations.sleep,
    eat: manifest.eat || animations.eat,
    clickReaction: manifest[aliases.clickReaction] || animations.clickReaction
  };

  const settings = await window.petAPI.getSettings();
  applyPetSize(settings.petSize);
  startReminderTimers(settings.standReminderMinutes, settings.waterReminderMinutes);

  window.petAPI.onSettingsUpdated((nextSettings) => {
    applyPetSize(nextSettings.petSize);
    startReminderTimers(nextSettings.standReminderMinutes, nextSettings.waterReminderMinutes);
    showBubble(`设置已更新：大小 ${nextSettings.petSize}px`, 1600);
  });

  preloadFrames();
  setFacing(-1);
  playAnimation('idle', { loop: true });
  autonomousTimer = setTimeout(scheduleAutonomous, 2000);
  bindEvents();
}

init();
