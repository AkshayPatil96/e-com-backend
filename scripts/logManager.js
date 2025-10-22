#!/usr/bin/env node

/**
 * Log Management CLI Script
 * 
 * Usage:
 *   npm run logs:report  - Generate log report
 *   npm run logs:cleanup - Clean up old logs
 *   npm run logs:stats   - Show log statistics
 */

import { logManager, runLogManagement } from '../src/utils/logManagement';

const command = process.argv[2];

const main = async () => {
  switch (command) {
    case 'report':
      console.log('📊 Generating comprehensive log report...\n');
      const report = await logManager.generateReport();
      console.log(report);
      break;
      
    case 'cleanup':
      console.log('🧹 Starting log cleanup process...\n');
      const result = await logManager.cleanupLogs();
      console.log(`\n✨ Cleanup completed: ${result.deleted} files removed, ${(result.freedSpace / 1024 / 1024).toFixed(2)}MB freed`);
      break;
      
    case 'stats':
      console.log('📈 Generating log statistics...\n');
      const stats = await logManager.getLogStats();
      console.log(`Total Files: ${stats.totalFiles}`);
      console.log(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Files for Cleanup: ${stats.filesForCleanup.length}`);
      console.log('\nSize by Category:');
      Object.entries(stats.sizeByCategory).forEach(([category, size]) => {
        console.log(`  ${category}: ${(size / 1024 / 1024).toFixed(2)}MB`);
      });
      break;
      
    default:
      await runLogManagement();
  }
};

main().catch(console.error);