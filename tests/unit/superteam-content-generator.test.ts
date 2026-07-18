import { describe, expect, it } from 'vitest';
import {
  ContentGenerator,
  type ContentRequest,
} from '../../lib/superteam/content-generator';

describe('ContentGenerator.generateTwitterThread', () => {
  const baseRequest: ContentRequest = {
    bountyId: 'bounty-1',
    title: 'Write a Twitter thread',
    type: 'twitter-thread',
  };

  it('returns thread content with tweet count and word count', () => {
    const result = ContentGenerator.generateTwitterThread(baseRequest);

    expect(result.content).toContain('Write a Twitter thread');
    expect(result.tweetCount).toBe(9);
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.wordCount).toBe(result.content.split(/\s+/).length);
    expect(result.quality).toBe('ready');
    expect(result.proof).toBe('Generated Twitter thread about: Write a Twitter thread');
  });

  it('falls back to topic when title is empty', () => {
    const result = ContentGenerator.generateTwitterThread({
      ...baseRequest,
      title: '',
      topic: 'Fallback Topic',
    });

    expect(result.content).toContain('Fallback Topic');
  });

  it('is deterministic for the same input', () => {
    const a = ContentGenerator.generateTwitterThread(baseRequest);
    const b = ContentGenerator.generateTwitterThread(baseRequest);
    expect(a).toEqual(b);
  });
});

describe('ContentGenerator.generateAnalysis', () => {
  const baseRequest: ContentRequest = {
    bountyId: 'bounty-2',
    title: 'Solana DeFi Landscape',
    type: 'analysis',
  };

  it('returns markdown with all eight section headings', () => {
    const result = ContentGenerator.generateAnalysis(baseRequest);

    expect(result.content).toContain('# Solana DeFi Landscape');
    for (const heading of [
      'Introduction',
      'Background & Context',
      'Key Players & Ecosystem',
      'Technical Deep Dive',
      'Market Opportunity',
      'Challenges & Risks',
      'Future Outlook',
      'Conclusion',
    ]) {
      expect(result.content).toContain(`## ${heading}`);
    }
    expect(result.quality).toBe('ready');
    expect(result.proof).toBe('Generated analysis: Solana DeFi Landscape');
    expect(result.tweetCount).toBeUndefined();
  });

  it('includes keywords in introduction and ecosystem sections when provided', () => {
    const result = ContentGenerator.generateAnalysis({
      ...baseRequest,
      keywords: ['DePIN', 'RWA', 'Payments', 'Ignored4th'],
    });

    expect(result.content).toContain('focusing on DePIN and RWA');
    expect(result.content).toContain('DePIN, RWA, Payments');
    expect(result.content).not.toContain('Ignored4th');
  });

  it('uses generic ecosystem text when no keywords are provided', () => {
    const result = ContentGenerator.generateAnalysis(baseRequest);
    expect(result.content).toContain('various platforms and protocols');
  });

  it('word count matches the generated content', () => {
    const result = ContentGenerator.generateAnalysis(baseRequest);
    expect(result.wordCount).toBe(result.content.split(/\s+/).length);
    expect(result.wordCount).toBeGreaterThan(300);
  });
});
