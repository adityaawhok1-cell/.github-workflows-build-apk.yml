'use strict';
// ====== Mulai ======
loadSave();
enterScene('title');
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });
