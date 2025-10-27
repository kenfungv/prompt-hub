/**
 * Security Review Filter Service
 * Implements Prompt Red Team / Filter functionality
 * Integrates NLP-based malicious content detection and sensitive word classification
 */

import { createHash } from 'crypto';

// Severity levels for security issues
export enum SecuritySeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  SAFE = 'SAFE'
}

// Security check result interface
export interface SecurityCheckResult {
  id: string;
  promptText: string;
  severity: SecuritySeverity;
  issues: SecurityIssue[];
  score: number; // 0-100, higher is safer
  timestamp: Date;
  recommendations: string[];
}

export interface SecurityIssue {
  type: string;
  description: string;
  severity: SecuritySeverity;
  position?: { start: number; end: number };
  matchedPattern?: string;
}

// Sensitive word categories
export const SENSITIVE_CATEGORIES = {
  HATE_SPEECH: {
    patterns: ['hate', 'discriminat', 'racist', 'sexist', 'bigot'],
    severity: SecuritySeverity.CRITICAL
  },
  VIOLENCE: {
    patterns: ['kill', 'murder', 'attack', 'harm', 'destroy', 'weapon'],
    severity: SecuritySeverity.HIGH
  },
  PERSONAL_INFO: {
    patterns: ['ssn', 'credit card', 'password', 'api key', 'secret key'],
    severity: SecuritySeverity.HIGH
  },
  MALICIOUS_INTENT: {
    patterns: ['bypass', 'jailbreak', 'ignore instructions', 'disregard', 'override'],
    severity: SecuritySeverity.MEDIUM
  },
  SPAM: {
    patterns: ['click here', 'buy now', 'limited offer', 'act fast'],
    severity: SecuritySeverity.LOW
  }
};

/**
 * Main filter service class
 */
export class SecurityFilterService {
  /**
   * Perform comprehensive security check on a single prompt
   */
  async checkPrompt(promptText: string): Promise<SecurityCheckResult> {
    const issues: SecurityIssue[] = [];
    const id = this.generateCheckId(promptText);
    
    // Run all security checks
    issues.push(...this.checkSensitiveWords(promptText));
    issues.push(...this.checkInjectionPatterns(promptText));
    issues.push(...this.checkPrivacyLeaks(promptText));
    issues.push(...this.checkToxicity(promptText));
    
    // Calculate overall severity and score
    const severity = this.calculateSeverity(issues);
    const score = this.calculateSecurityScore(issues);
    const recommendations = this.generateRecommendations(issues);
    
    return {
      id,
      promptText,
      severity,
      issues,
      score,
      timestamp: new Date(),
      recommendations
    };
  }
  
  /**
   * Batch security check for multiple prompts
   */
  async checkBatch(prompts: string[]): Promise<SecurityCheckResult[]> {
    return Promise.all(prompts.map(prompt => this.checkPrompt(prompt)));
  }
  
  /**
   * Check for sensitive words and categorize them
   */
  private checkSensitiveWords(text: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lowerText = text.toLowerCase();
    
    for (const [category, config] of Object.entries(SENSITIVE_CATEGORIES)) {
      for (const pattern of config.patterns) {
        const regex = new RegExp(`\\b${pattern}\\w*`, 'gi');
        const matches = [...text.matchAll(regex)];
        
        for (const match of matches) {
          issues.push({
            type: `SENSITIVE_WORD_${category}`,
            description: `Detected potentially sensitive content related to ${category.toLowerCase().replace('_', ' ')}`,
            severity: config.severity,
            position: { start: match.index!, end: match.index! + match[0].length },
            matchedPattern: match[0]
          });
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Check for prompt injection patterns
   */
  private checkInjectionPatterns(text: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const injectionPatterns = [
      { pattern: /ignore (previous|above|all) instructions?/i, desc: 'Instruction override attempt' },
      { pattern: /disregard (previous|above|all)/i, desc: 'Disregard instruction attempt' },
      { pattern: /new instructions?:/i, desc: 'Instruction replacement attempt' },
      { pattern: /system (prompt|message|role):/i, desc: 'System prompt manipulation' },
      { pattern: /\[\s*SYSTEM\s*\]/i, desc: 'System tag injection' },
      { pattern: /you are now/i, desc: 'Role redefinition attempt' }
    ];
    
    for (const { pattern, desc } of injectionPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        issues.push({
          type: 'PROMPT_INJECTION',
          description: `Potential prompt injection detected: ${desc}`,
          severity: SecuritySeverity.CRITICAL,
          position: { start: match.index!, end: match.index! + match[0].length },
          matchedPattern: match[0]
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Check for privacy leaks (PII, credentials, etc.)
   */
  private checkPrivacyLeaks(text: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const privacyPatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, desc: 'SSN pattern detected', severity: SecuritySeverity.CRITICAL },
      { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, desc: 'Credit card pattern', severity: SecuritySeverity.CRITICAL },
      { pattern: /password\s*[:=]\s*[^\s]+/i, desc: 'Password exposure', severity: SecuritySeverity.CRITICAL },
      { pattern: /api[_\s-]?key\s*[:=]\s*[^\s]+/i, desc: 'API key exposure', severity: SecuritySeverity.HIGH },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, desc: 'Email address', severity: SecuritySeverity.MEDIUM }
    ];
    
    for (const { pattern, desc, severity } of privacyPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        issues.push({
          type: 'PRIVACY_LEAK',
          description: `Privacy concern: ${desc}`,
          severity,
          position: { start: match.index!, end: match.index! + match[0].length },
          matchedPattern: '***REDACTED***' // Don't log actual sensitive data
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Basic toxicity check using keyword analysis
   */
  private checkToxicity(text: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const toxicPatterns = [
      'idiot', 'stupid', 'dumb', 'moron', 'fool',
      'hate', 'disgusting', 'terrible', 'awful'
    ];
    
    const lowerText = text.toLowerCase();
    for (const pattern of toxicPatterns) {
      if (lowerText.includes(pattern)) {
        const index = lowerText.indexOf(pattern);
        issues.push({
          type: 'TOXICITY',
          description: 'Potentially toxic or offensive language detected',
          severity: SecuritySeverity.MEDIUM,
          position: { start: index, end: index + pattern.length },
          matchedPattern: pattern
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Calculate overall severity from issues
   */
  private calculateSeverity(issues: SecurityIssue[]): SecuritySeverity {
    if (issues.length === 0) return SecuritySeverity.SAFE;
    
    const severityOrder = [
      SecuritySeverity.CRITICAL,
      SecuritySeverity.HIGH,
      SecuritySeverity.MEDIUM,
      SecuritySeverity.LOW
    ];
    
    for (const severity of severityOrder) {
      if (issues.some(issue => issue.severity === severity)) {
        return severity;
      }
    }
    
    return SecuritySeverity.SAFE;
  }
  
  /**
   * Calculate security score (0-100)
   */
  private calculateSecurityScore(issues: SecurityIssue[]): number {
    if (issues.length === 0) return 100;
    
    const severityWeights = {
      [SecuritySeverity.CRITICAL]: 40,
      [SecuritySeverity.HIGH]: 25,
      [SecuritySeverity.MEDIUM]: 15,
      [SecuritySeverity.LOW]: 5
    };
    
    let deduction = 0;
    for (const issue of issues) {
      deduction += severityWeights[issue.severity] || 0;
    }
    
    return Math.max(0, 100 - deduction);
  }
  
  /**
   * Generate remediation recommendations
   */
  private generateRecommendations(issues: SecurityIssue[]): string[] {
    const recommendations: string[] = [];
    const issueTypes = new Set(issues.map(i => i.type));
    
    if (issueTypes.has('PROMPT_INJECTION')) {
      recommendations.push('Remove attempts to override or bypass system instructions');
      recommendations.push('Rephrase requests without using system-level commands');
    }
    
    if (issueTypes.has('PRIVACY_LEAK')) {
      recommendations.push('Remove all personally identifiable information (PII)');
      recommendations.push('Replace sensitive data with placeholder values');
      recommendations.push('Never include passwords, API keys, or credentials');
    }
    
    if (issueTypes.has('TOXICITY')) {
      recommendations.push('Use respectful and professional language');
      recommendations.push('Rephrase to remove potentially offensive terms');
    }
    
    if (issues.some(i => i.type.startsWith('SENSITIVE_WORD'))) {
      recommendations.push('Review content for sensitive topics');
      recommendations.push('Consider using more neutral terminology');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('No major security concerns detected');
    }
    
    return recommendations;
  }
  
  /**
   * Generate unique check ID
   */
  private generateCheckId(text: string): string {
    const hash = createHash('sha256').update(text + Date.now()).digest('hex');
    return `sec_${hash.substring(0, 16)}`;
  }
}

// Export singleton instance
export const securityFilter = new SecurityFilterService();
