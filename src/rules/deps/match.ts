import picomatch from "picomatch";

export function matchAny(name: string, patterns: string[]): boolean {
	if (patterns.length === 0) return false;
	const isMatch = picomatch(patterns, { nocase: false });
	return isMatch(name);
}
