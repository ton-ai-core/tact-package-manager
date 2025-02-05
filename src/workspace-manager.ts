import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn } from 'child_process';
import { WorkspaceConfig, TactModuleConfig } from './types';

export class WorkspaceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WorkspaceError';
    }
}

export class WorkspaceManager {
    private rootPath: string;
    private workspaceConfig: WorkspaceConfig;

    constructor() {
        this.rootPath = process.cwd();
        this.workspaceConfig = {
            private: true,
            name: 'tact-project',
            workspaces: [],
            dependencies: {},
            devDependencies: {}
        };
    }

    public async initialize(): Promise<void> {
        const configPath = path.join(this.rootPath, 'package.json');

        try {
            if (await fs.pathExists(configPath)) {
                const config = await fs.readJSON(configPath);
                this.workspaceConfig = {
                    ...this.workspaceConfig,
                    ...config,
                    workspaces: config.workspaces || [],
                    dependencies: config.dependencies || {},
                    devDependencies: config.devDependencies || {}
                };
            } else {
                // Создаем базовый package.json если его нет
                await fs.writeJSON(configPath, this.workspaceConfig, { spaces: 2 });
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new WorkspaceError(`Failed to initialize workspace: ${error.message}`);
            }
            throw new WorkspaceError('Failed to initialize workspace: Unknown error');
        }
    }

    public async addModule(moduleName: string): Promise<void> {
        const modulePath = `tact_modules/${moduleName}`;
        
        if (!this.workspaceConfig.workspaces.includes(modulePath)) {
            this.workspaceConfig.workspaces.push(modulePath);
            
            // Обновляем package.json модуля
            await this.updateModulePackageJson(moduleName);

            // Добавляем модуль как зависимость в корневой package.json
            this.workspaceConfig.dependencies = {
                ...this.workspaceConfig.dependencies,
                [moduleName]: `file:./tact_modules/${moduleName}`
            };
            
            await this.saveConfig();
        }
    }

    private async updateModulePackageJson(moduleName: string): Promise<void> {
        const moduleConfigPath = path.join(this.rootPath, 'tact_modules', moduleName, 'package.json');
        
        try {
            let moduleConfig: TactModuleConfig = {};
            
            // Читаем существующий package.json если он есть
            if (await fs.pathExists(moduleConfigPath)) {
                moduleConfig = await fs.readJSON(moduleConfigPath);
            }
            
            // Проверяем и добавляем обязательные поля
            const updatedConfig = {
                ...moduleConfig,
                name: moduleConfig.name || moduleName,  // Используем просто имя модуля без @tact-modules/
                version: moduleConfig.version || '1.0.0',
                private: true,
                scripts: moduleConfig.scripts || {},
                dependencies: moduleConfig.dependencies || {},
                devDependencies: moduleConfig.devDependencies || {}
            };

            // Сохраняем обновленный package.json
            await fs.writeJSON(moduleConfigPath, updatedConfig, { spaces: 2 });
            
            console.log(`Updated package.json for module ${moduleName}`);
        } catch (error) {
            if (error instanceof Error) {
                throw new WorkspaceError(`Failed to update module package.json: ${error.message}`);
            }
            throw new WorkspaceError('Failed to update module package.json: Unknown error');
        }
    }

    public async removeModule(moduleName: string): Promise<void> {
        const modulePath = `tact_modules/${moduleName}`;
        
        this.workspaceConfig.workspaces = this.workspaceConfig.workspaces.filter(
            wp => wp !== modulePath
        );

        // Удаляем модуль из зависимостей
        if (this.workspaceConfig.dependencies) {
            delete this.workspaceConfig.dependencies[moduleName];
        }
        
        await this.saveConfig();
    }

    private async saveConfig(): Promise<void> {
        try {
            const configPath = path.join(this.rootPath, 'package.json');
            await fs.writeJSON(configPath, this.workspaceConfig, { spaces: 2 });
        } catch (error) {
            if (error instanceof Error) {
                throw new WorkspaceError(`Failed to save workspace config: ${error.message}`);
            }
            throw new WorkspaceError('Failed to save workspace config: Unknown error');
        }
    }

    public async runModuleScript(moduleName: string, script: string): Promise<void> {
        const modulePath = path.join(this.rootPath, 'tact_modules', moduleName);
        
        try {
            // Проверяем существование модуля
            if (!await fs.pathExists(modulePath)) {
                throw new WorkspaceError(`Module ${moduleName} not found`);
            }

            // Читаем package.json модуля
            const moduleConfigPath = path.join(modulePath, 'package.json');
            const moduleConfig = await fs.readJSON(moduleConfigPath) as TactModuleConfig;

            // Проверяем наличие скрипта
            if (!moduleConfig.scripts?.[script]) {
                throw new WorkspaceError(`Script '${script}' not found in module ${moduleName}`);
            }

            // Запускаем скрипт через npm
            return new Promise((resolve, reject) => {
                const npmProcess = spawn('npm', ['run', script, '--workspace', moduleName], {
                    stdio: 'inherit',
                    cwd: this.rootPath
                });

                npmProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new WorkspaceError(`Script '${script}' failed with code ${code}`));
                    }
                });

                npmProcess.on('error', (error) => {
                    reject(new WorkspaceError(`Failed to run script: ${error.message}`));
                });
            });
        } catch (error) {
            if (error instanceof Error) {
                throw new WorkspaceError(`Failed to run script: ${error.message}`);
            }
            throw new WorkspaceError('Failed to run script: Unknown error');
        }
    }

    public async installDependencies(): Promise<void> {
        return new Promise((resolve, reject) => {
            const npmProcess = spawn('npm', ['install'], {
                stdio: 'inherit',
                cwd: this.rootPath
            });

            npmProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new WorkspaceError(`npm install failed with code ${code}`));
                }
            });

            npmProcess.on('error', (error) => {
                reject(new WorkspaceError(`Failed to install dependencies: ${error.message}`));
            });
        });
    }
} 