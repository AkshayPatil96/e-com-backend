/**
 * @fileoverview Log Management Utility
 *
 * This module provides utilities for log management, cleanup, and monitoring.
 * It helps maintain optimal log file sizes and provides insights into logging patterns.
 *
 * @author E-commerce API Team
 * @version 1.0.0
 */

import fs from "fs";
import path from "path";
import { promisify } from "util";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

/**
 * Log management configuration
 */
export interface LogManagementConfig {
  logsDirectory: string;
  retentionPolicies: {
    error: number; // days
    security: number; // days
    business: number; // days
    performance: number; // days
    debug: number; // days
  };
  maxTotalSize: number; // MB
  compressionEnabled: boolean;
}

const defaultConfig: LogManagementConfig = {
  logsDirectory: path.join(process.cwd(), "logs"),
  retentionPolicies: {
    error: 30,
    security: 90,
    business: 14,
    performance: 7,
    debug: 3,
  },
  maxTotalSize: 1000, // 1GB
  compressionEnabled: true,
};

/**
 * Log file information
 */
export interface LogFileInfo {
  filename: string;
  path: string;
  size: number;
  created: Date;
  category: string;
  age: number; // days
}

/**
 * Log management statistics
 */
export interface LogStats {
  totalFiles: number;
  totalSize: number; // bytes
  sizeByCategory: Record<string, number>;
  oldestFile: LogFileInfo | null;
  newestFile: LogFileInfo | null;
  filesForCleanup: LogFileInfo[];
}

/**
 * Log Management Class
 */
export class LogManager {
  private config: LogManagementConfig;

  constructor(config?: Partial<LogManagementConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Get all log files with metadata (supports date-based folder structure)
   */
  async getLogFiles(): Promise<LogFileInfo[]> {
    try {
      const logFiles: LogFileInfo[] = [];
      const rootItems = await readdir(this.config.logsDirectory);

      for (const item of rootItems) {
        const itemPath = path.join(this.config.logsDirectory, item);
        const itemStats = await stat(itemPath);

        if (itemStats.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(item)) {
          // This is a date folder (YYYY-MM-DD format)
          const dateFolder = item;
          const dateFolderPath = itemPath;

          try {
            const dateFiles = await readdir(dateFolderPath);

            for (const filename of dateFiles) {
              if (!filename.endsWith(".log")) continue;

              const filePath = path.join(dateFolderPath, filename);
              const stats = await stat(filePath);

              // Extract category from filename (e.g., "error.log" -> "error")
              const category = filename.replace(".log", "");
              const age = Math.floor(
                (Date.now() - stats.mtime.getTime()) / (24 * 60 * 60 * 1000),
              );

              logFiles.push({
                filename: `${dateFolder}/${filename}`, // Include date folder in display name
                path: filePath,
                size: stats.size,
                created: stats.mtime,
                category,
                age,
              });
            }
          } catch (dateFolderError) {
            console.error(
              `Error reading date folder ${dateFolder}:`,
              dateFolderError,
            );
          }
        } else if (item.endsWith(".log")) {
          // Handle legacy log files in root directory
          const filePath = itemPath;
          const stats = itemStats;

          // Extract category from filename (e.g., "error-2024-01-15.log" -> "error")
          const category = item.split("-")[0];
          const age = Math.floor(
            (Date.now() - stats.mtime.getTime()) / (24 * 60 * 60 * 1000),
          );

          logFiles.push({
            filename: item,
            path: filePath,
            size: stats.size,
            created: stats.mtime,
            category,
            age,
          });
        }
      }

      return logFiles.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      console.error("Error reading log files:", error);
      return [];
    }
  }

  /**
   * Generate log statistics
   */
  async getLogStats(): Promise<LogStats> {
    const logFiles = await this.getLogFiles();

    const stats: LogStats = {
      totalFiles: logFiles.length,
      totalSize: logFiles.reduce((sum, file) => sum + file.size, 0),
      sizeByCategory: {},
      oldestFile: logFiles.length > 0 ? logFiles[logFiles.length - 1] : null,
      newestFile: logFiles.length > 0 ? logFiles[0] : null,
      filesForCleanup: [],
    };

    // Calculate size by category and identify files for cleanup
    for (const file of logFiles) {
      stats.sizeByCategory[file.category] =
        (stats.sizeByCategory[file.category] || 0) + file.size;

      const retentionDays =
        this.config.retentionPolicies[
          file.category as keyof typeof this.config.retentionPolicies
        ];
      if (retentionDays && file.age > retentionDays) {
        stats.filesForCleanup.push(file);
      }
    }

    return stats;
  }

  /**
   * Clean up old log files based on retention policies
   */
  async cleanupLogs(): Promise<{
    deleted: number;
    freedSpace: number;
    foldersDeleted: number;
  }> {
    const stats = await this.getLogStats();
    let deletedFiles = 0;
    let freedSpace = 0;

    console.log(
      `🧹 Starting log cleanup. Found ${stats.filesForCleanup.length} files for cleanup.`,
    );

    for (const file of stats.filesForCleanup) {
      try {
        await unlink(file.path);
        deletedFiles++;
        freedSpace += file.size;
        console.log(
          `  ✅ Deleted: ${file.filename} (${this.formatBytes(file.size)}, ${file.age} days old)`,
        );
      } catch (error) {
        console.error(`  ❌ Failed to delete ${file.filename}:`, error);
      }
    }

    // Also clean up empty date folders
    const folderCleanup = await this.cleanupDateFolders();

    console.log(
      `🎉 Cleanup completed: ${deletedFiles} files deleted, ${this.formatBytes(freedSpace)} freed, ${folderCleanup.foldersDeleted} folders removed`,
    );
    return {
      deleted: deletedFiles,
      freedSpace,
      foldersDeleted: folderCleanup.foldersDeleted,
    };
  }

  /**
   * Clean up empty date folders and old date folders based on maximum retention
   */
  async cleanupDateFolders(): Promise<{ foldersDeleted: number }> {
    try {
      const rootItems = await readdir(this.config.logsDirectory);
      let foldersDeleted = 0;

      // Find maximum retention policy to determine when to delete entire folders
      const maxRetentionDays = Math.max(
        ...Object.values(this.config.retentionPolicies),
      );

      for (const item of rootItems) {
        const itemPath = path.join(this.config.logsDirectory, item);
        const itemStats = await stat(itemPath);

        // Check if it's a date folder
        if (itemStats.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(item)) {
          const folderDate = new Date(item);
          const folderAge = Math.floor(
            (Date.now() - folderDate.getTime()) / (24 * 60 * 60 * 1000),
          );

          // Check if folder is older than max retention or is empty
          if (folderAge > maxRetentionDays) {
            try {
              // Check if folder is empty
              const folderContents = await readdir(itemPath);
              const logFiles = folderContents.filter((file) =>
                file.endsWith(".log"),
              );

              if (logFiles.length === 0) {
                // Remove empty folder
                await rmdir(itemPath);
                foldersDeleted++;
                console.log(`  📁 Deleted empty date folder: ${item}`);
              } else {
                console.log(
                  `  ⚠️  Date folder ${item} is ${folderAge} days old but still contains ${logFiles.length} log files`,
                );
              }
            } catch (error) {
              console.error(
                `  ❌ Failed to process date folder ${item}:`,
                error,
              );
            }
          }
        }
      }

      if (foldersDeleted > 0) {
        console.log(
          `📁 Date folder cleanup: ${foldersDeleted} empty folders removed`,
        );
      }

      return { foldersDeleted };
    } catch (error) {
      console.error("Error during date folder cleanup:", error);
      return { foldersDeleted: 0 };
    }
  }

  /**
   * Generate log summary report
   */
  async generateReport(): Promise<string> {
    const stats = await this.getLogStats();

    const report = `
📊 LOG MANAGEMENT REPORT
========================
Generated: ${new Date().toISOString()}

📁 OVERVIEW
-----------
Total Files: ${stats.totalFiles}
Total Size: ${this.formatBytes(stats.totalSize)}
Oldest File: ${stats.oldestFile ? `${stats.oldestFile.filename} (${stats.oldestFile.age} days)` : "N/A"}
Newest File: ${stats.newestFile ? stats.newestFile.filename : "N/A"}

📈 SIZE BY CATEGORY
------------------
${Object.entries(stats.sizeByCategory)
  .map(
    ([category, size]) => `${category.padEnd(12)}: ${this.formatBytes(size)}`,
  )
  .join("\n")}

🧹 CLEANUP CANDIDATES
---------------------
Files ready for cleanup: ${stats.filesForCleanup.length}
Space to be freed: ${this.formatBytes(stats.filesForCleanup.reduce((sum, f) => sum + f.size, 0))}

🚨 ALERTS
---------
${this.generateAlerts(stats)}

💡 RECOMMENDATIONS
------------------
${this.generateRecommendations(stats)}
`;

    return report;
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Generate alerts based on log statistics
   */
  private generateAlerts(stats: LogStats): string {
    const alerts: string[] = [];

    // Check total size
    const totalSizeMB = stats.totalSize / (1024 * 1024);
    if (totalSizeMB > this.config.maxTotalSize) {
      alerts.push(
        `⚠️  Total log size (${this.formatBytes(stats.totalSize)}) exceeds limit (${this.config.maxTotalSize}MB)`,
      );
    }

    // Check for large individual files
    const largeFileThreshold = 50 * 1024 * 1024; // 50MB
    for (const [category, size] of Object.entries(stats.sizeByCategory)) {
      if (size > largeFileThreshold) {
        alerts.push(
          `⚠️  ${category} logs are large (${this.formatBytes(size)})`,
        );
      }
    }

    // Check for cleanup candidates
    if (stats.filesForCleanup.length > 10) {
      alerts.push(
        `⚠️  Many old files found (${stats.filesForCleanup.length}) - consider running cleanup`,
      );
    }

    return alerts.length > 0 ? alerts.join("\n") : "✅ No alerts";
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(stats: LogStats): string {
    const recommendations: string[] = [];

    // Size-based recommendations
    const totalSizeMB = stats.totalSize / (1024 * 1024);
    if (totalSizeMB > this.config.maxTotalSize * 0.8) {
      recommendations.push(
        "• Consider running log cleanup or adjusting retention policies",
      );
    }

    // Frequency-based recommendations
    if (stats.totalFiles > 100) {
      recommendations.push(
        "• Consider implementing log rotation or compression",
      );
    }

    // Environment-based recommendations
    if (process.env.NODE_ENV === "production") {
      recommendations.push("• Ensure log sampling is enabled to reduce volume");
      recommendations.push(
        "• Consider external log aggregation (ELK stack, Splunk, etc.)",
      );
    }

    return recommendations.length > 0
      ? recommendations.join("\n")
      : "✅ System is well optimized";
  }

  /**
   * Schedule automatic cleanup (call this on server startup)
   */
  scheduleCleanup(intervalHours: number = 24): NodeJS.Timeout {
    console.log(`🕐 Scheduling log cleanup every ${intervalHours} hours`);

    return setInterval(
      async () => {
        try {
          console.log("🔄 Running scheduled log cleanup...");
          await this.cleanupLogs();
        } catch (error) {
          console.error("❌ Scheduled log cleanup failed:", error);
        }
      },
      intervalHours * 60 * 60 * 1000,
    );
  }
}

// Export default instance
export const logManager = new LogManager();

// Example usage function
export const runLogManagement = async (): Promise<void> => {
  try {
    console.log("📊 Generating log report...\n");
    const report = await logManager.generateReport();
    console.log(report);

    // Optionally run cleanup
    if (process.argv.includes("--cleanup")) {
      console.log("\n🧹 Running log cleanup...");
      await logManager.cleanupLogs();
    }
  } catch (error) {
    console.error("❌ Log management failed:", error);
  }
};
