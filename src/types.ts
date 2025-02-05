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

export interface WorkspaceConfig {
    private: boolean;
    name: string;
    workspaces: string[];
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

export interface TactModuleConfig {
    name?: string;
    version?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
} 