import type { DepsEcosystem } from "../types.js";

export interface PackageInfo {
	name: string;
	ecosystem: DepsEcosystem;
	exists: boolean;
	publishedAt?: string;
	downloads?: number;
}

export interface RegistryClient {
	lookup(name: string, ecosystem: DepsEcosystem): Promise<PackageInfo>;
	lookupAcross(name: string): Promise<PackageInfo[]>;
}

export class RegistryLookupError extends Error {}
