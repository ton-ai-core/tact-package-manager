import * as fs from 'fs-extra';
import * as path from 'path';
import { GitHandler, GitError } from './git-handler';
import { AliasSync, AliasSyncError } from './alias-sync';
import { PackageAlias, PackageState, CommandOptions } from './types';

export class PackageManagerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PackageManagerError';
    }
}

export class PackageManager {
    private gitHandler: GitHandler;
    private aliasSync: AliasSync;
    private aliasPath: string;
    private statePath: string;
    private aliases: PackageAlias;
    private state: PackageState;

    constructor() {
        this.gitHandler = new GitHandler();
        this.aliasPath = path.join(__dirname, 'tact-aliases.json');
        this.aliasSync = new AliasSync(this.aliasPath);
        this.statePath = path.join(process.cwd(), 'tact-packages.json');
        this.aliases = {};
        this.state = {};
    }

    public async initialize(): Promise<void> {
        try {
            // Сначала пытаемся синхронизировать файл алиасов
            await this.aliasSync.sync();
        } catch (error) {
            // Если синхронизация не удалась, проверяем наличие локального файла
            if (!fs.existsSync(this.aliasPath)) {
                if (error instanceof Error) {
                    throw new PackageManagerError(`Failed to initialize: ${error.message}`);
                }
                throw new PackageManagerError('Failed to initialize: Unable to sync or find aliases file');
            }
            // Если локальный файл есть, продолжаем работу с ним
            console.warn('Failed to sync aliases, using local file');
        }

        // Загружаем конфигурацию
        this.loadConfig();
    }

    private loadConfig(): void {
        try {
            if (fs.existsSync(this.aliasPath)) {
                this.aliases = fs.readJSONSync(this.aliasPath) as PackageAlias;
            } else {
                throw new PackageManagerError(`Aliases file not found at ${this.aliasPath}`);
            }
            if (fs.existsSync(this.statePath)) {
                this.state = fs.readJSONSync(this.statePath) as PackageState;
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new PackageManagerError(`Failed to load config: ${error.message}`);
            }
            throw new PackageManagerError('Failed to load config: Unknown error');
        }
    }

    private saveState(): void {
        try {
            fs.writeJSONSync(this.statePath, this.state, { spaces: 2 });
        } catch (error) {
            if (error instanceof Error) {
                throw new PackageManagerError(`Failed to save state: ${error.message}`);
            }
            throw new PackageManagerError('Failed to save state: Unknown error');
        }
    }

    public async syncAliases(): Promise<void> {
        try {
            await this.aliasSync.sync();
            // Перезагружаем конфигурацию после синхронизации
            this.loadConfig();
        } catch (error) {
            if (error instanceof AliasSyncError) {
                throw new PackageManagerError(`Failed to sync aliases: ${error.message}`);
            }
            if (error instanceof Error) {
                throw new PackageManagerError(`Failed to sync aliases: ${error.message}`);
            }
            throw new PackageManagerError('Failed to sync aliases: Unknown error');
        }
    }

    async install(alias: string, options: CommandOptions = {}): Promise<void> {
        // Синхронизируем алиасы перед установкой
        try {
            await this.syncAliases();
        } catch (error) {
            console.warn('Failed to sync aliases, using local file');
        }

        if (!this.aliases[alias]) {
            throw new PackageManagerError(`Alias "${alias}" not found in tact-aliases.json`);
        }

        try {
            const url = this.aliases[alias];
            const commitHash = await this.gitHandler.cloneRepository(url, alias, options.commit);

            this.state[alias] = {
                url,
                commitHash,
                installedAt: new Date().toISOString()
            };

            this.saveState();
            console.log(`Successfully installed ${alias} at commit ${commitHash}`);
        } catch (error) {
            if (error instanceof GitError) {
                throw new PackageManagerError(`Installation failed: ${error.message}`);
            }
            if (error instanceof Error) {
                throw new PackageManagerError(`Installation failed: ${error.message}`);
            }
            throw new PackageManagerError('Installation failed: Unknown error');
        }
    }

    async update(alias?: string): Promise<void> {
        const packagesToUpdate = alias ? [alias] : Object.keys(this.state);

        for (const pkg of packagesToUpdate) {
            if (!this.state[pkg]) {
                console.warn(`Package ${pkg} not found in state`);
                continue;
            }

            try {
                const modulePath = path.join(process.cwd(), 'node_modules', 'tact_modules', pkg);
                const hasUpdates = await this.gitHandler.checkForUpdates(
                    modulePath,
                    this.state[pkg].commitHash
                );

                if (hasUpdates) {
                    await this.install(pkg);
                    console.log(`Updated ${pkg} to latest version`);
                } else {
                    console.log(`${pkg} is already up to date`);
                }
            } catch (error) {
                if (error instanceof Error) {
                    throw new PackageManagerError(`Update failed for ${pkg}: ${error.message}`);
                }
                throw new PackageManagerError(`Update failed for ${pkg}: Unknown error`);
            }
        }
    }

    async remove(alias: string): Promise<void> {
        if (!this.state[alias]) {
            throw new PackageManagerError(`Package "${alias}" is not installed`);
        }

        try {
            const modulePath = path.join(process.cwd(), 'node_modules', 'tact_modules', alias);
            await fs.remove(modulePath);

            delete this.state[alias];
            this.saveState();
            console.log(`Successfully removed ${alias}`);
        } catch (error) {
            if (error instanceof Error) {
                throw new PackageManagerError(`Failed to remove ${alias}: ${error.message}`);
            }
            throw new PackageManagerError(`Failed to remove ${alias}: Unknown error`);
        }
    }
} 