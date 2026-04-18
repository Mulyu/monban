import type { DepsEcosystem } from "../types.js";
import type { PackageInfo, RegistryClient } from "./types.js";

export class OfflineRegistryClient implements RegistryClient {
	async lookup(name: string, ecosystem: DepsEcosystem): Promise<PackageInfo> {
		return { name, ecosystem, exists: true };
	}
	async lookupAcross(name: string): Promise<PackageInfo[]> {
		return [{ name, ecosystem: "npm", exists: true }];
	}
}
