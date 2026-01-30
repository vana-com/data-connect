import type { ExportedData } from '../types';

/**
 * Normalized export summary for UI display.
 * Provides a consistent interface regardless of platform-specific data shapes.
 */
export interface NormalizedExportSummary {
  itemsExported: number;
  itemLabel: string;
}

/**
 * Extended export data type that includes the exportSummary field
 * sent by connectors that implement the standard summary protocol.
 */
interface ExportDataWithSummary extends ExportedData {
  exportSummary?: { count: number; label: string };
  // Platform-specific fields (not in base ExportedData type)
  posts?: unknown[];
  memories?: unknown[];
  experience?: unknown[];
  education?: unknown[];
  skills?: unknown[];
}

/**
 * Normalizes export data from various connector formats into a consistent summary.
 *
 * Priority order:
 * 1. exportSummary (standard protocol for new connectors)
 * 2. totalConversations (ChatGPT-style exports)
 * 3. conversations.length (ChatGPT-style exports)
 * 4. Platform-specific arrays: posts, memories, experience, education, skills
 * 5. Fallback: 0 items
 *
 * @param data - Raw export data from connector
 * @returns Normalized summary with itemsExported count and itemLabel
 */
export function normalizeExportData(data: ExportedData): NormalizedExportSummary {
  const exportData = data as ExportDataWithSummary;

  // 1. Check for standard exportSummary protocol
  if (exportData.exportSummary) {
    return {
      itemsExported: exportData.exportSummary.count,
      itemLabel: exportData.exportSummary.label,
    };
  }

  // 2. ChatGPT-style: totalConversations
  if (typeof exportData.totalConversations === 'number') {
    return {
      itemsExported: exportData.totalConversations,
      itemLabel: 'conversations',
    };
  }

  // 3. ChatGPT-style: conversations array
  if (Array.isArray(exportData.conversations) && exportData.conversations.length > 0) {
    return {
      itemsExported: exportData.conversations.length,
      itemLabel: 'conversations',
    };
  }

  // 4. Platform-specific arrays
  if (Array.isArray(exportData.posts) && exportData.posts.length > 0) {
    return {
      itemsExported: exportData.posts.length,
      itemLabel: 'posts',
    };
  }

  if (Array.isArray(exportData.memories) && exportData.memories.length > 0) {
    return {
      itemsExported: exportData.memories.length,
      itemLabel: 'memories',
    };
  }

  if (Array.isArray(exportData.experience) && exportData.experience.length > 0) {
    return {
      itemsExported: exportData.experience.length,
      itemLabel: 'experience',
    };
  }

  if (Array.isArray(exportData.education) && exportData.education.length > 0) {
    return {
      itemsExported: exportData.education.length,
      itemLabel: 'education',
    };
  }

  if (Array.isArray(exportData.skills) && exportData.skills.length > 0) {
    return {
      itemsExported: exportData.skills.length,
      itemLabel: 'skills',
    };
  }

  // 5. Fallback
  return {
    itemsExported: 0,
    itemLabel: 'items',
  };
}
