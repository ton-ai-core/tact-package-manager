#!/usr/bin/env node

import { Command } from 'commander';
import { PackageManager } from './package-manager';
import { WorkspaceManager, WorkspaceError } from './workspace-manager';

const program = new Command();
const manager = new PackageManager();
const workspaceManager = new WorkspaceManager();

// Инициализируем менеджер перед запуском команд
const initialize = async () => {
    try {
        await manager.initialize();
    } catch (error) {
        if (error instanceof Error) {
            console.error('Initialization error:', error.message);
        } else {
            console.error('An unknown error occurred during initialization');
        }
        process.exit(1);
    }
};

program
    .name('tpm')
    .description('Tact Package Manager')
    .version('1.0.0')
    .hook('preAction', initialize);

program
    .command('install')
    .description('Install a package')
    .argument('<alias>', 'package alias')
    .option('--commit <hash>', 'specific commit hash to install')
    .action(async (alias: string, options: { commit?: string }) => {
        try {
            await manager.install(alias, { commit: options.commit });
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
            } else {
                console.error('An unknown error occurred');
            }
            process.exit(1);
        }
    });

program
    .command('update')
    .description('Update all packages or a specific package')
    .argument('[alias]', 'package alias (optional)')
    .action(async (alias?: string) => {
        try {
            await manager.update(alias);
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
            } else {
                console.error('An unknown error occurred');
            }
            process.exit(1);
        }
    });

program
    .command('remove')
    .description('Remove a package')
    .argument('<alias>', 'package alias')
    .action(async (alias: string) => {
        try {
            await manager.remove(alias);
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
            } else {
                console.error('An unknown error occurred');
            }
            process.exit(1);
        }
    });

program
    .command('sync')
    .description('Synchronize aliases with the remote repository')
    .action(async () => {
        try {
            await manager.syncAliases();
            console.log('Successfully synchronized aliases');
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
            } else {
                console.error('An unknown error occurred');
            }
            process.exit(1);
        }
    });

// Команда для установки зависимостей
program
    .command('deps')
    .description('Install dependencies for all modules')
    .action(async () => {
        try {
            await workspaceManager.installDependencies();
            console.log('Successfully installed dependencies');
        } catch (error) {
            if (error instanceof WorkspaceError) {
                console.error('Error:', error.message);
            } else if (error instanceof Error) {
                console.error('Error:', error.message);
            } else {
                console.error('An unknown error occurred');
            }
            process.exit(1);
        }
    });

// Новая команда для запуска скриптов модуля
program
    .command('run')
    .description('Run a script in a module')
    .argument('<module>', 'module name')
    .argument('<script>', 'script name')
    .action(async (moduleName: string, script: string) => {
        try {
            await manager.runScript(moduleName, script);
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
            } else {
                console.error('An unknown error occurred');
            }
            process.exit(1);
        }
    });

// Добавляем поддержку прямых команд (например, tpm jetton build)
program
    .arguments('<module> <script>')
    .description('Run a script in a module (shorthand syntax)')
    .action(async (moduleName: string, script: string) => {
        try {
            await manager.runScript(moduleName, script);
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
            } else {
                console.error('An unknown error occurred');
            }
            process.exit(1);
        }
    });

program.parse(); 