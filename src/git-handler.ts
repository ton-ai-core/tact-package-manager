import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import * as fs from 'fs-extra';
import * as path from 'path';

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
        this.modulesPath = path.join(process.cwd(), 'node_modules', 'tact_modules');
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