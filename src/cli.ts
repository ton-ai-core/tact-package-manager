#!/usr/bin/env node

import { Command } from 'commander';
import { PackageManager } from './package-manager';

const program = new Command();
const manager = new PackageManager();

program
    .name('tpm')
    .description('Tact Package Manager')
    .version('1.0.0');

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

program.parse(); 