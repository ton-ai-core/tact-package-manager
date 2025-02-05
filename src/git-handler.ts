import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import * as fs from 'fs-extra';
import * as path from 'path';
import { TactModuleConfig } from './types';

export class GitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GitError';
    }
}

export class GitHandler {
    private git: SimpleGit;
    private modulesPath: string;

    constructor() {
        this.git = simpleGit();
        this.modulesPath = path.join(process.cwd(), 'tact_modules');
    }

    private async cleanupRepository(targetPath: string): Promise<void> {
        // Список файлов и директорий для удаления
        const toRemove = [
            'node_modules',
            '.github',
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',
            '.npmrc',
            '.yarnrc',
            '.pnpmrc',
            'jest.config.js',
            'jest.setup.js',
            'jest.teardown.js',
            'tests',
            '.env',
            '.gitattributes',
            '.prettierrc.json',
            'tsconfig.json'
        ];

        for (const item of toRemove) {
            const itemPath = path.join(targetPath, item);
            if (await fs.pathExists(itemPath)) {
                await fs.remove(itemPath);
            }
        }
    }

    private async updatePackageJson(targetPath: string, moduleName: string): Promise<void> {
        const packageJsonPath = path.join(targetPath, 'package.json');
        
        try {
            // Проверяем существование package.json
            if (await fs.pathExists(packageJsonPath)) {
                // Читаем текущий package.json
                const packageJson = await fs.readJSON(packageJsonPath) as TactModuleConfig;
                
                // Проверяем и добавляем обязательные поля
                const updatedPackageJson = {
                    ...packageJson,
                    name: packageJson.name || moduleName,
                    version: packageJson.version || '1.0.0',
                    private: true
                };

                // Сохраняем обновленный package.json
                await fs.writeJSON(packageJsonPath, updatedPackageJson, { spaces: 2 });
                console.log(`Updated package.json for module ${moduleName}`);
            } else {
                throw new GitError('package.json not found in the repository');
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new GitError(`Failed to update package.json: ${error.message}`);
            }
            throw new GitError('Failed to update package.json: Unknown error');
        }
    }

    async cloneRepository(url: string, alias: string, commit?: string): Promise<string> {
        const targetPath = path.join(this.modulesPath, alias);
        
        try {
            // Создаем директорию если её нет
            await fs.ensureDir(this.modulesPath);
            
            // Удаляем существующую директорию если она есть
            if (await fs.pathExists(targetPath)) {
                await fs.remove(targetPath);
            }

            // Клонируем репозиторий
            await this.git.clone(url, targetPath);
            
            // Если указан конкретный коммит, переключаемся на него
            if (commit) {
                const localGit = simpleGit(targetPath);
                await localGit.checkout(commit);
            }

            // Получаем текущий хеш коммита
            const localGit = simpleGit(targetPath);
            const log: LogResult = await localGit.log();
            
            if (!log.latest) {
                throw new GitError('Failed to get commit hash');
            }

            // Проверяем наличие необходимых файлов
            const requiredFiles = ['package.json', 'tact.config.json'];
            const missingFiles = [];
            
            for (const file of requiredFiles) {
                if (!await fs.pathExists(path.join(targetPath, file))) {
                    missingFiles.push(file);
                }
            }

            if (!await fs.pathExists(path.join(targetPath, 'sources'))) {
                missingFiles.push('sources/');
            }

            if (missingFiles.length > 0) {
                throw new GitError(`Repository is missing required files: ${missingFiles.join(', ')}`);
            }

            // Обновляем package.json
            await this.updatePackageJson(targetPath, alias);

            // Очищаем репозиторий от лишних файлов
            await this.cleanupRepository(targetPath);
            
            return log.latest.hash;
        } catch (error) {
            if (error instanceof Error) {
                throw new GitError(`Failed to clone repository: ${error.message}`);
            }
            throw new GitError('Failed to clone repository: Unknown error');
        }
    }

    async getLatestCommitHash(repoPath: string): Promise<string> {
        try {
            const localGit = simpleGit(repoPath);
            const log: LogResult = await localGit.log();
            
            if (!log.latest) {
                throw new GitError('Failed to get commit hash');
            }
            
            return log.latest.hash;
        } catch (error) {
            if (error instanceof Error) {
                throw new GitError(`Failed to get latest commit hash: ${error.message}`);
            }
            throw new GitError('Failed to get latest commit hash: Unknown error');
        }
    }

    async checkForUpdates(repoPath: string, currentHash: string): Promise<boolean> {
        try {
            const localGit = simpleGit(repoPath);
            await localGit.fetch();
            const latestHash = await this.getLatestCommitHash(repoPath);
            return latestHash !== currentHash;
        } catch (error) {
            if (error instanceof Error) {
                throw new GitError(`Failed to check for updates: ${error.message}`);
            }
            throw new GitError('Failed to check for updates: Unknown error');
        }
    }
} 