const levels = 6; // número total de níveis
const container = document.getElementById('level-buttons');

// obtém os níveis desbloqueados reais
const progress = getProgress();

for (let i = 1; i <= levels; i++) {
  const levelName = `level-${i}`;
  const btn = document.createElement('button');
  btn.textContent = i;
  btn.classList.add('level-btn');

  if (isLevelUnlocked(levelName)) {
    btn.classList.add('unlocked');
    btn.onclick = () => window.location.href = `game.html?level=${levelName}`;
  } else {
    btn.classList.add('locked');
    btn.disabled = true;
  }

  container.appendChild(btn);
}
