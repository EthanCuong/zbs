export const globals = {
  score: 0,
  bestScore: Number(localStorage.getItem('bestScore') || 0),
  bestTime: Number(localStorage.getItem('bestTime') || 0),
  updateBestRecords(newScore, newTime) {
    if (newScore > this.bestScore) {
      this.bestScore = newScore;
      localStorage.setItem('bestScore', newScore);
    }
    if (newTime > this.bestTime) {
      this.bestTime = newTime;
      localStorage.setItem('bestTime', newTime);
    }
  }
};
