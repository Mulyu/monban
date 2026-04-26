export interface SecretDetector {
	name: string;
	pattern: RegExp;
}

export const SECRET_DETECTORS: SecretDetector[] = [
	{ name: "AWS Access Key ID", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
	{ name: "GitHub Personal Access Token", pattern: /\bghp_[0-9A-Za-z]{36}\b/ },
	{ name: "GitHub OAuth Token", pattern: /\bgho_[0-9A-Za-z]{36}\b/ },
	{ name: "GitHub App Token", pattern: /\b(?:ghu|ghs)_[0-9A-Za-z]{36}\b/ },
	{ name: "GitHub Refresh Token", pattern: /\bghr_[0-9A-Za-z]{36}\b/ },
	{ name: "Google API Key", pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
	{ name: "Slack Token", pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
	{
		name: "Stripe Live Key",
		pattern: /\b(?:sk|pk|rk)_live_[0-9A-Za-z]{24,}\b/,
	},
	{ name: "NPM Token", pattern: /\bnpm_[0-9A-Za-z]{36}\b/ },
	{
		name: "JWT",
		pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_\-+/=]{10,}\b/,
	},
	{
		name: "Private Key Block",
		pattern: /-----BEGIN (?:RSA|OPENSSH|DSA|EC|PGP) PRIVATE KEY-----/,
	},
];
