export interface InvisibleCharInfo {
	char: string;
	codePoint: number;
	name: string;
}

const INVISIBLE_CODE_POINTS: { codePoint: number; name: string }[] = [
	{ codePoint: 0x200b, name: "Zero Width Space" },
	{ codePoint: 0x200c, name: "Zero Width Non-Joiner" },
	{ codePoint: 0x200d, name: "Zero Width Joiner" },
	{ codePoint: 0x2060, name: "Word Joiner" },
	{ codePoint: 0x00ad, name: "Soft Hyphen" },
	{ codePoint: 0xfeff, name: "Zero Width No-Break Space" },
	{ codePoint: 0x2061, name: "Function Application" },
	{ codePoint: 0x2062, name: "Invisible Times" },
	{ codePoint: 0x2063, name: "Invisible Separator" },
	{ codePoint: 0x2064, name: "Invisible Plus" },
];

export const INVISIBLE_CHARS: InvisibleCharInfo[] = INVISIBLE_CODE_POINTS.map(
	(p) => ({ char: String.fromCodePoint(p.codePoint), ...p }),
);

export const INVISIBLE_REGEX = new RegExp(
	`[${INVISIBLE_CHARS.map((c) => c.char).join("")}]`,
	"g",
);

export function lookupInvisible(char: string): InvisibleCharInfo | undefined {
	return INVISIBLE_CHARS.find((c) => c.char === char);
}
