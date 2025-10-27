/**
 * Prompt Lint Service - Automatic Quality Control for Prompts
 * Validates syntax, naming, length, and content quality
 */

export interface LintRule {
  id: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  check: (prompt: string) => boolean;
  message: string;
  autoFix?: (prompt: string) => string;
}

export interface LintResult {
  passed: boolean;
  violations: LintViolation[];
  score: number;
  fixable: boolean;
}

export interface LintViolation {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  position?: { start: number; end: number };
  autoFixable: boolean;
}

export interface LintConfig {
  maxLength: number;
  minLength: number;
  requireContext: boolean;
  forbiddenPatterns: string[];
  namingConvention: 'camelCase' | 'snake_case' | 'kebab-case' | 'PascalCase';
  requireRoleDefinition: boolean;
  checkForSensitiveData: boolean;
  maxConsecutiveSpaces: number;
}

export class PromptLintService {
  private config: LintConfig;
  private rules: LintRule[];

  constructor(config?: Partial<LintConfig>) {
    this.config = {
      maxLength: 8000,
      minLength: 10,
      requireContext: true,
      forbiddenPatterns: ['<script>', 'eval(', 'javascript:'],
      namingConvention: 'camelCase',
      requireRoleDefinition: true,
      checkForSensitiveData: true,
      maxConsecutiveSpaces: 2,
      ...config,
    };
    this.rules = this.initializeRules();
  }

  private initializeRules(): LintRule[] {
    return [
      {
        id: 'length-min',
        name: 'Minimum Length',
        severity: 'error',
        check: (prompt: string) => prompt.trim().length >= this.config.minLength,
        message: `Prompt must be at least ${this.config.minLength} characters`,
        autoFix: (prompt: string) => prompt,
      },
      {
        id: 'length-max',
        name: 'Maximum Length',
        severity: 'error',
        check: (prompt: string) => prompt.length <= this.config.maxLength,
        message: `Prompt exceeds maximum length of ${this.config.maxLength} characters`,
        autoFix: (prompt: string) => prompt.substring(0, this.config.maxLength),
      },
      {
        id: 'no-excessive-spaces',
        name: 'No Excessive Spaces',
        severity: 'warning',
        check: (prompt: string) => {
          const regex = new RegExp(`\\s{${this.config.maxConsecutiveSpaces + 1},}`);
          return !regex.test(prompt);
        },
        message: `No more than ${this.config.maxConsecutiveSpaces} consecutive spaces allowed`,
        autoFix: (prompt: string) => prompt.replace(/\s{2,}/g, ' '),
      },
      {
        id: 'no-trailing-whitespace',
        name: 'No Trailing Whitespace',
        severity: 'warning',
        check: (prompt: string) => !prompt.endsWith(' ') && !prompt.endsWith('\t'),
        message: 'Remove trailing whitespace',
        autoFix: (prompt: string) => prompt.trimEnd(),
      },
      {
        id: 'no-leading-whitespace',
        name: 'No Leading Whitespace',
        severity: 'warning',
        check: (prompt: string) => !prompt.startsWith(' ') && !prompt.startsWith('\t'),
        message: 'Remove leading whitespace',
        autoFix: (prompt: string) => prompt.trimStart(),
      },
      {
        id: 'forbidden-patterns',
        name: 'No Forbidden Patterns',
        severity: 'error',
        check: (prompt: string) => {
          return !this.config.forbiddenPatterns.some((pattern) =>
            prompt.toLowerCase().includes(pattern.toLowerCase())
          );
        },
        message: 'Prompt contains forbidden patterns (potential security risk)',
      },
      {
        id: 'role-definition',
        name: 'Role Definition Required',
        severity: 'warning',
        check: (prompt: string) => {
          if (!this.config.requireRoleDefinition) return true;
          const roleKeywords = ['you are', 'act as', 'role:', 'persona:', 'assistant'];
          return roleKeywords.some((keyword) =>
            prompt.toLowerCase().includes(keyword)
          );
        },
        message: 'Prompt should include a role definition (e.g., "You are...")',
      },
      {
        id: 'context-required',
        name: 'Context Required',
        severity: 'info',
        check: (prompt: string) => {
          if (!this.config.requireContext) return true;
          const contextKeywords = ['context:', 'background:', 'given', 'scenario'];
          return (
            contextKeywords.some((keyword) =>
              prompt.toLowerCase().includes(keyword)
            ) || prompt.length > 100
          );
        },
        message: 'Consider adding context to improve prompt effectiveness',
      },
      {
        id: 'sensitive-data',
        name: 'No Sensitive Data',
        severity: 'error',
        check: (prompt: string) => {
          if (!this.config.checkForSensitiveData) return true;
          const sensitivePatterns = [
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\b\d{16}\b/, // Credit card
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email (might be legitimate)
            /password\s*[:=]\s*[^\s]+/i,
            /api[_-]?key\s*[:=]\s*[^\s]+/i,
            /token\s*[:=]\s*[^\s]+/i,
          ];
          return !sensitivePatterns.some((pattern) => pattern.test(prompt));
        },
        message: 'Prompt may contain sensitive data (PII, credentials, etc.)',
      },
      {
        id: 'clear-instruction',
        name: 'Clear Instructions',
        severity: 'info',
        check: (prompt: string) => {
          const instructionKeywords = [
            'please',
            'must',
            'should',
            'need to',
            'required',
            'make sure',
            'ensure',
          ];
          return instructionKeywords.some((keyword) =>
            prompt.toLowerCase().includes(keyword)
          );
        },
        message: 'Consider using clear instruction words for better results',
      },
      {
        id: 'balanced-quotes',
        name: 'Balanced Quotes',
        severity: 'warning',
        check: (prompt: string) => {
          const singleQuotes = (prompt.match(/'/g) || []).length;
          const doubleQuotes = (prompt.match(/"/g) || []).length;
          return singleQuotes % 2 === 0 && doubleQuotes % 2 === 0;
        },
        message: 'Unbalanced quotes detected',
      },
      {
        id: 'balanced-brackets',
        name: 'Balanced Brackets',
        severity: 'warning',
        check: (prompt: string) => {
          const stack: string[] = [];
          const pairs: { [key: string]: string } = {
            '(': ')',
            '[': ']',
            '{': '}',
          };
          for (const char of prompt) {
            if (char in pairs) {
              stack.push(char);
            } else if (Object.values(pairs).includes(char)) {
              const last = stack.pop();
              if (!last || pairs[last] !== char) return false;
            }
          }
          return stack.length === 0;
        },
        message: 'Unbalanced brackets detected',
      },
    ];
  }

  public lint(prompt: string, promptName?: string): LintResult {
    const violations: LintViolation[] = [];
    let totalWeight = 0;
    let passedWeight = 0;

    // Check naming convention if prompt name is provided
    if (promptName && !this.checkNamingConvention(promptName)) {
      violations.push({
        ruleId: 'naming-convention',
        ruleName: 'Naming Convention',
        severity: 'warning',
        message: `Prompt name should follow ${this.config.namingConvention} convention`,
        autoFixable: false,
      });
    }

    // Run all lint rules
    for (const rule of this.rules) {
      const weight = rule.severity === 'error' ? 3 : rule.severity === 'warning' ? 2 : 1;
      totalWeight += weight;

      if (!rule.check(prompt)) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: rule.message,
          autoFixable: !!rule.autoFix,
        });
      } else {
        passedWeight += weight;
      }
    }

    const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100;
    const passed = violations.filter((v) => v.severity === 'error').length === 0;
    const fixable = violations.some((v) => v.autoFixable);

    return {
      passed,
      violations,
      score,
      fixable,
    };
  }

  public autoFix(prompt: string): { fixed: string; changes: string[] } {
    let fixed = prompt;
    const changes: string[] = [];

    for (const rule of this.rules) {
      if (rule.autoFix && !rule.check(fixed)) {
        const before = fixed;
        fixed = rule.autoFix(fixed);
        if (before !== fixed) {
          changes.push(`Applied: ${rule.name}`);
        }
      }
    }

    return { fixed, changes };
  }

  private checkNamingConvention(name: string): boolean {
    const conventions = {
      camelCase: /^[a-z][a-zA-Z0-9]*$/,
      snake_case: /^[a-z][a-z0-9_]*$/,
      'kebab-case': /^[a-z][a-z0-9-]*$/,
      PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
    };
    return conventions[this.config.namingConvention].test(name);
  }

  public updateConfig(config: Partial<LintConfig>): void {
    this.config = { ...this.config, ...config };
    this.rules = this.initializeRules();
  }

  public getConfig(): LintConfig {
    return { ...this.config };
  }

  public getRules(): LintRule[] {
    return [...this.rules];
  }

  public addCustomRule(rule: LintRule): void {
    this.rules.push(rule);
  }

  public removeRule(ruleId: string): void {
    this.rules = this.rules.filter((rule) => rule.id !== ruleId);
  }
}

// Export singleton instance with default config
export const promptLintService = new PromptLintService();
