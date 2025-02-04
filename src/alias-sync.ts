import * as fs from 'fs-extra';
import * as path from 'path';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/ton-ai-core/tact-package-manager/main/tact-aliases.json';

export class AliasSyncError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AliasSyncError';
    }
}

export class AliasSync {
    private aliasPath: string;

    constructor(aliasPath: string) {
        this.aliasPath = aliasPath;
    }

    public async sync(): Promise<void> {
        try {
            const response = await fetch(GITHUB_RAW_URL);
            
            if (!response.ok) {
                throw new AliasSyncError(`Failed to fetch aliases: ${response.statusText}`);
            }

            const content = await response.text();
            
            // Проверяем, что контент - валидный JSON
            try {
                JSON.parse(content);
            } catch {
                throw new AliasSyncError('Invalid JSON in remote aliases file');
            }

            // Создаем директорию, если её нет
            await fs.ensureDir(path.dirname(this.aliasPath));
            
            // Сохраняем файл
            await fs.writeFile(this.aliasPath, content, 'utf-8');
        } catch (error) {
            if (error instanceof Error) {
                throw new AliasSyncError(`Sync failed: ${error.message}`);
            }
            throw new AliasSyncError('Sync failed: Unknown error');
        }
    }
} 