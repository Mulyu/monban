export function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	const m = a.length;
	const n = b.length;
	if (m === 0) return n;
	if (n === 0) return m;

	const prev = new Array<number>(n + 1);
	for (let j = 0; j <= n; j++) prev[j] = j;
	for (let i = 1; i <= m; i++) {
		let prevDiag = prev[0];
		prev[0] = i;
		for (let j = 1; j <= n; j++) {
			const temp = prev[j];
			if (a[i - 1] === b[j - 1]) {
				prev[j] = prevDiag;
			} else {
				prev[j] = 1 + Math.min(prev[j - 1], prev[j], prevDiag);
			}
			prevDiag = temp;
		}
	}
	return prev[n];
}
