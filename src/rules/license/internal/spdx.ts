const SPDX_TAG_RE = /SPDX-License-Identifier:\s*(\S[^\s]*)/i;

const TEMPLATE_PATTERNS: Array<{ id: string; re: RegExp }> = [
	{ id: "MIT", re: /\bMIT License\b/i },
	{ id: "Apache-2.0", re: /Apache License,?\s*Version\s*2\.0/i },
	{ id: "BSD-3-Clause", re: /\bBSD\s*3-?Clause\b/i },
	{ id: "BSD-2-Clause", re: /\bBSD\s*2-?Clause\b/i },
	{ id: "ISC", re: /\bISC License\b/i },
	{
		id: "GPL-3.0",
		re: /GNU GENERAL PUBLIC LICENSE[\s\S]{0,200}Version\s*3/i,
	},
	{
		id: "GPL-2.0",
		re: /GNU GENERAL PUBLIC LICENSE[\s\S]{0,200}Version\s*2/i,
	},
	{
		id: "LGPL-3.0",
		re: /GNU LESSER GENERAL PUBLIC LICENSE[\s\S]{0,200}Version\s*3/i,
	},
	{
		id: "MPL-2.0",
		re: /Mozilla Public License,?\s*Version\s*2\.0/i,
	},
	{ id: "Unlicense", re: /\bThe Unlicense\b/i },
	{ id: "CC0-1.0", re: /\bCC0 1\.0 Universal\b/i },
];

export interface DetectedLicense {
	id: string;
	source: "spdx-tag" | "template";
}

export function detectLicenseFromText(text: string): DetectedLicense | null {
	const tagMatch = text.match(SPDX_TAG_RE);
	if (tagMatch) {
		return { id: tagMatch[1], source: "spdx-tag" };
	}
	for (const tpl of TEMPLATE_PATTERNS) {
		if (tpl.re.test(text)) {
			return { id: tpl.id, source: "template" };
		}
	}
	return null;
}

export function extractSpdxTag(text: string): string | null {
	const m = text.match(SPDX_TAG_RE);
	return m ? m[1] : null;
}
