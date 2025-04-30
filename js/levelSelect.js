const levels = 10; // Número total de níveis existentes (podes aumentar)
const unlockedLevel = parseInt(localStorage.getItem('unlockedLevel') || '1');
const container = document.getElementById('level-buttons');

for (let i = 1; i <= levels; i++) {
  const btn = document.createElement('button');
  btn.textContent = i;
  btn.classList.add('level-btn');

  if (i <= unlockedLevel) {
    btn.classList.add('unlocked');
    btn.onclick = () => window.location.href = `game.html?level=level-${i}`;
  } else {
    btn.classList.add('locked');
    btn.disabled = true;
  }

  container.appendChild(btn);
}
