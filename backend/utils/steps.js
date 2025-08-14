// Kalibracija po korisniku je idealna: npr. u User profilu čuvaj stepLengthWalk i stepLengthRun.
// Za sada default heuristike:
const DEFAULT_STEP_LEN_WALK = 0.78; // m/step
const DEFAULT_STEP_LEN_RUN  = 1.20; // m/step

function stepsFromCadence(avgCad, moving_s) {
  // Napomena: U Stravi cadence za trčanje zna biti "per-leg" ili "steps/min" ovisno o izvoru.
  // Radi sigurnosti, podržimo dvije interpretacije:
  // 1) Ako broj izgleda realno kao "steps per minute" (npr. 150–200), koristimo direktno.
  // 2) Ako izgleda kao "per-leg" (npr. 75–95), pomnožimo s 2.
  if (!avgCad || !moving_s) return null;

  const spm = avgCad < 100 ? avgCad * 2 : avgCad; // heuristika
  const minutes = moving_s / 60.0;
  return Math.round(spm * minutes);
}

function stepsFromDistance(distance_m, mode = 'walk') {
  const stepLen = mode === 'run' ? DEFAULT_STEP_LEN_RUN : DEFAULT_STEP_LEN_WALK;
  if (!distance_m) return 0;
  return Math.round(distance_m / stepLen);
}

function inferMode(type) {
  // Grubo: Run/TrailRun => run, Walk/Hike => walk
  const t = String(type || '').toLowerCase();
  if (t.includes('run')) return 'run';
  if (t.includes('walk') || t.includes('hike')) return 'walk';
  return 'walk';
}

function computeSteps(actNorm) {
  const cadSteps = stepsFromCadence(actNorm.avg_cad, actNorm.moving_s);
  if (cadSteps) return cadSteps;
  const mode = inferMode(actNorm.type);
  return stepsFromDistance(actNorm.distance_m, mode);
}

module.exports = { computeSteps };
