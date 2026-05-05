export interface DockerfileInstruction {
	name: string;
	args: string;
	line: number;
}

export function parseDockerfile(text: string): DockerfileInstruction[] {
	const out: DockerfileInstruction[] = [];
	const rawLines = text.split(/\r?\n/);

	let i = 0;
	while (i < rawLines.length) {
		const startLine = i + 1;
		let line = rawLines[i] ?? "";
		i++;

		const stripped = line.replace(/^\s+/, "");
		if (stripped.length === 0 || stripped.startsWith("#")) continue;

		while (line.endsWith("\\") && i < rawLines.length) {
			line = `${line.slice(0, -1)} ${(rawLines[i] ?? "").trim()}`;
			i++;
		}

		const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s+([\s\S]*)$/);
		if (!match) continue;

		out.push({
			name: match[1].toUpperCase(),
			args: match[2].trim(),
			line: startLine,
		});
	}

	return out;
}

export interface FromImage {
	raw: string;
	image: string;
	tag: string | null;
	digest: string | null;
	stageAlias: string | null;
	stageReference: boolean;
}

export function parseFromArgs(
	args: string,
	knownStages: Set<string>,
): FromImage {
	const tokens = args.split(/\s+/).filter((t) => t.length > 0);

	let imageRef = "";
	let stageAlias: string | null = null;
	for (let idx = 0; idx < tokens.length; idx++) {
		const token = tokens[idx];
		if (token.startsWith("--")) continue;
		if (imageRef === "") {
			imageRef = token;
			continue;
		}
		if (token.toUpperCase() === "AS" && idx + 1 < tokens.length) {
			stageAlias = tokens[idx + 1];
			break;
		}
	}

	const stageReference = knownStages.has(imageRef);

	let image = imageRef;
	let tag: string | null = null;
	let digest: string | null = null;

	const digestSep = imageRef.indexOf("@");
	if (digestSep >= 0) {
		image = imageRef.slice(0, digestSep);
		digest = imageRef.slice(digestSep + 1);
		const tagSep = image.indexOf(":");
		if (tagSep >= 0) {
			tag = image.slice(tagSep + 1);
			image = image.slice(0, tagSep);
		}
	} else {
		const lastColon = imageRef.lastIndexOf(":");
		const lastSlash = imageRef.lastIndexOf("/");
		if (lastColon > lastSlash) {
			image = imageRef.slice(0, lastColon);
			tag = imageRef.slice(lastColon + 1);
		}
	}

	return {
		raw: imageRef,
		image,
		tag,
		digest,
		stageAlias,
		stageReference,
	};
}
