import { describe, expect, it } from 'vitest';
import { normalizeExportData } from './export-data';
import type { ExportedData } from '../types';

describe('normalizeExportData', () => {
  const baseExportData: ExportedData = {
    platform: 'test',
    company: 'Test Co',
    exportedAt: '2024-01-01T00:00:00Z',
  };

  it('uses exportSummary when present (highest priority)', () => {
    const data = {
      ...baseExportData,
      exportSummary: { count: 42, label: 'photos' },
      totalConversations: 10, // should be ignored
    };

    const result = normalizeExportData(data as ExportedData);
    expect(result).toEqual({ itemsExported: 42, itemLabel: 'photos' });
  });

  it('guards exportSummary count/label fallbacks', () => {
    const data = {
      ...baseExportData,
      exportSummary: { count: Number.NaN, label: '' },
    };

    const result = normalizeExportData(data as ExportedData);
    expect(result).toEqual({ itemsExported: 0, itemLabel: 'items' });
  });

  it('uses totalConversations when exportSummary is absent', () => {
    const data = {
      ...baseExportData,
      totalConversations: 25,
      conversations: [{ id: '1', title: 'Test', url: '', scrapedAt: '' }],
    };

    const result = normalizeExportData(data as ExportedData);
    expect(result).toEqual({ itemsExported: 25, itemLabel: 'conversations' });
  });

  it('uses conversations.length when totalConversations is absent', () => {
    const data = {
      ...baseExportData,
      conversations: [
        { id: '1', title: 'Test 1', url: '', scrapedAt: '' },
        { id: '2', title: 'Test 2', url: '', scrapedAt: '' },
      ],
    };

    const result = normalizeExportData(data as ExportedData);
    expect(result).toEqual({ itemsExported: 2, itemLabel: 'conversations' });
  });

  it('uses posts array for social platforms', () => {
    const data = {
      ...baseExportData,
      posts: [{ id: '1' }, { id: '2' }, { id: '3' }],
    };

    const result = normalizeExportData(data as ExportedData);
    expect(result).toEqual({ itemsExported: 3, itemLabel: 'posts' });
  });

  it('uses memories array for memory platforms', () => {
    const data = {
      ...baseExportData,
      memories: [{ id: '1' }],
    };

    const result = normalizeExportData(data as ExportedData);
    expect(result).toEqual({ itemsExported: 1, itemLabel: 'memories' });
  });

  it('uses experience array for LinkedIn-style platforms', () => {
    const data = {
      ...baseExportData,
      experience: [{ id: '1' }, { id: '2' }],
    };

    const result = normalizeExportData(data as ExportedData);
    expect(result).toEqual({ itemsExported: 2, itemLabel: 'experience' });
  });

  it('uses education array when experience is empty', () => {
    const data = {
      ...baseExportData,
      experience: [],
      education: [{ id: '1' }],
    };

    const result = normalizeExportData(data as ExportedData);
    expect(result).toEqual({ itemsExported: 1, itemLabel: 'education' });
  });

  it('uses skills array as last platform-specific fallback', () => {
    const data = {
      ...baseExportData,
      skills: [{ name: 'TypeScript' }, { name: 'React' }],
    };

    const result = normalizeExportData(data as ExportedData);
    expect(result).toEqual({ itemsExported: 2, itemLabel: 'skills' });
  });

  it('returns zero items with generic label when no data fields present', () => {
    const result = normalizeExportData(baseExportData);
    expect(result).toEqual({ itemsExported: 0, itemLabel: 'items' });
  });

  it('ignores empty arrays and falls through to next option', () => {
    const data = {
      ...baseExportData,
      conversations: [],
      posts: [],
      memories: [{ id: '1' }],
    };

    const result = normalizeExportData(data as ExportedData);
    expect(result).toEqual({ itemsExported: 1, itemLabel: 'memories' });
  });
});
