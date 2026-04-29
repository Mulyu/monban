export const INJECTION_PHRASES: RegExp[] = [
	/\bignore\s+(?:all\s+)?(?:previous|prior|above|preceding)\s+instructions?\b/i,
	/\bdisregard\s+(?:all\s+)?(?:previous|prior|above|the\s+system)\s+(?:instructions?|prompt|rules?)\b/i,
	/\byou\s+are\s+now\s+(?:a\s+|an\s+)?[a-z]/i,
	/\bforget\s+(?:everything|all)\s+(?:you\s+)?(?:know|were\s+told)\b/i,
	/\b(?:new|updated)\s+(?:system\s+)?(?:prompt|instructions?)[:\s]/i,
];

export const TAG_BLOCK_REGEX = /[\u{E0000}-\u{E007F}]/gu;
