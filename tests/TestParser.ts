import { ParsedTest, ParsedTestStep } from '../agent/types.js';
import { promises as fs } from 'fs';

const parseList = (block: string | undefined): string[] => {
  if (!block) {
    return [];
  }
  return block
    .split(/\n-/)
    .map((line) => line.replace(/^[-\s]+/, '').trim())
    .filter(Boolean);
};

export class TestParser {
  async parseFile(filePath: string): Promise<ParsedTest> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parse(content);
  }

  parse(content: string): ParsedTest {
    const id = this.capture(content, /^TEST:\s*(.+)$/m);
    const title = this.capture(content, /^TITLE:\s*(.+)$/m);
    const url = this.capture(content, /^URL:\s*(.+)$/m);
    const preconditions = parseList(this.captureBlock(content, 'PRECONDITIONS'));
    const steps = this.parseSteps(this.captureBlock(content, 'STEPS'));
    const assertions = parseList(this.captureBlock(content, 'ASSERTIONS'));
    const tags = this.capture(content, /^TAGS:\s*(.+)$/m)?.split(/,\s*/).filter(Boolean) ?? [];

    if (!id || !title) {
      throw new Error('Test definition missing TEST or TITLE');
    }

    return {
      id,
      title,
      url,
      preconditions,
      steps,
      assertions,
      tags
    };
  }

  private parseSteps(block: string | undefined): ParsedTestStep[] {
    if (!block) {
      return [];
    }
    const lines = block.split(/\n/).map((line) => line.trim());
    return lines
      .map((line) => line.match(/^(\d+)\.\s*(.+)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => ({ index: Number(match[1]), description: match[2] }));
  }

  private capture(content: string, pattern: RegExp): string | undefined {
    const match = content.match(pattern);
    return match?.[1]?.trim();
  }

  private captureBlock(content: string, label: string): string | undefined {
    const regex = new RegExp(`${label}:\n([\\s\\S]*?)(?:\n\n|$)`, 'i');
    const match = content.match(regex);
    return match?.[1]?.trim();
  }
}
