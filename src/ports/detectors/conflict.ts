export interface ConflictMarker {
	pattern: RegExp;
	label: string;
}

export const CONFLICT_MARKERS: ConflictMarker[] = [
	{ pattern: /^<{7}(?:\s|$)/, label: "start marker (<<<<<<<)" },
	{ pattern: /^={7}$/, label: "separator (=======)" },
	{ pattern: /^>{7}(?:\s|$)/, label: "end marker (>>>>>>>)" },
];
