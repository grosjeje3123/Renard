// Alignement temporel dynamique (DTW), extrémité libre côté gabarit.
// Sert à comparer le sens du geste : on aligne le tracé de l'enfant sur le gabarit,
// dans le sens normal et dans le sens inverse, et on compare les coûts.

export function dtwOpenEnd(A, B) { return dtwOpenEndAt(A, B).cost; }

/** Comme dtwOpenEnd, et donne aussi jusqu'où le tracé a parcouru le gabarit : `reach` de 0 (départ) à 1 (arrivée). */
export function dtwOpenEndAt(A, B) {
  const n = A.length, m = B.length;
  let prev = new Float64Array(m), cur = new Float64Array(m);
  const d = (i, j) => Math.hypot(A[i].x - B[j].x, A[i].y - B[j].y);
  prev[0] = d(0, 0);
  for (let j = 1; j < m; j++) prev[j] = prev[j - 1] + d(0, j);
  for (let i = 1; i < n; i++) {
    cur[0] = prev[0] + d(i, 0);
    for (let j = 1; j < m; j++) cur[j] = d(i, j) + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    [prev, cur] = [cur, prev];
  }
  let best = Infinity, bj = 0;
  for (let j = 0; j < m; j++) {
    const c = prev[j] / (n + j + 1);
    if (c < best) { best = c; bj = j; }
  }
  return { cost: best, reach: bj / Math.max(1, m - 1) };
}
