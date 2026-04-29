export interface BidiControlInfo {
	codePoint: number;
	name: string;
}

export const BIDI_CONTROLS: BidiControlInfo[] = [
	{ codePoint: 0x202a, name: "Left-to-Right Embedding" },
	{ codePoint: 0x202b, name: "Right-to-Left Embedding" },
	{ codePoint: 0x202c, name: "Pop Directional Formatting" },
	{ codePoint: 0x202d, name: "Left-to-Right Override" },
	{ codePoint: 0x202e, name: "Right-to-Left Override" },
	{ codePoint: 0x2066, name: "Left-to-Right Isolate" },
	{ codePoint: 0x2067, name: "Right-to-Left Isolate" },
	{ codePoint: 0x2068, name: "First Strong Isolate" },
	{ codePoint: 0x2069, name: "Pop Directional Isolate" },
];

export const BIDI_REGEX = new RegExp(
	`[${BIDI_CONTROLS.map((c) => `\\u${c.codePoint.toString(16).padStart(4, "0")}`).join("")}]`,
	"g",
);

export function lookupBidi(codePoint: number): BidiControlInfo | undefined {
	return BIDI_CONTROLS.find((c) => c.codePoint === codePoint);
}
