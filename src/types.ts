export interface PackageAlias {
    [key: string]: string;
}

export interface PackageState {
    [key: string]: {
        url: string;
        commitHash: string;
        installedAt: string;
    };
}

export interface CommandOptions {
    commit?: string;
    force?: boolean;
} 