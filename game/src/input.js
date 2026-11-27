// Gobble's Great Escape — keyboard and mouse input.
// Keys are read as edges: pressing jump or hide fires once, holding the
// key does not repeat it. The main loop drains the edges each frame.
export function createInput(canvas) {
  const input = {
    jumpPressed: false,
    hidePressed: false,
    startPressed: false,
    restartPressed: false,
    clickX: 0,
    clickY: 0,
    clicked: false,
    muted: false,
  };

  function pressJump() { input.jumpPressed = true; }
  function pressHide() { input.hidePressed = true; }
  function pressStart() { input.startPressed = true; }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key;
    if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') {
      event.preventDefault();
      pressJump();
      pressStart();
    } else if (key === 'Enter') {
      pressStart();
    } else if (key === 'h' || key === 'H') {
      pressHide();
    } else if (key === 'r' || key === 'R') {
      input.restartPressed = true;
    } else if (key === 'm' || key === 'M') {
      input.muted = !input.muted;
    }
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.clickX = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.clickY = (event.clientY - rect.top) * (canvas.height / rect.height);
    input.clicked = true;
    pressStart();
  });

  // Take the edges pressed since the last frame; each is true at most once.
  input.drain = function drain() {
    const edges = {
      jump: input.jumpPressed,
      hide: input.hidePressed,
      start: input.startPressed,
      restart: input.restartPressed,
      click: input.clicked,
      clickX: input.clickX,
      clickY: input.clickY,
    };
    input.jumpPressed = false;
    input.hidePressed = false;
    input.startPressed = false;
    input.restartPressed = false;
    input.clicked = false;
    return edges;
  };
  return input;
}
