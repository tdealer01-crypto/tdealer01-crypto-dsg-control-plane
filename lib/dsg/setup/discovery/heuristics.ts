/**
 * Heuristic patterns for fast service detection
 * Runs before AI for instant results
 */

export interface DetectionPattern {
  service: string;
  confidence: number;
  patterns: {
    packageJson?: string[];
    dockerCompose?: string[];
    dockerfile?: string[];
    envExample?: string[];
    workflows?: string[];
  };
}

const DETECTION_PATTERNS: DetectionPattern[] = [
  {
    service: 'Next.js',
    confidence: 0.99,
    patterns: {
      packageJson: ['next', 'react', 'react-dom'],
      dockerCompose: ['next', 'node:'],
      dockerfile: ['next build', 'next start'],
    },
  },
  {
    service: 'FastAPI',
    confidence: 0.98,
    patterns: {
      packageJson: ['fastapi'],
      dockerfile: ['fastapi', 'uvicorn'],
      envExample: ['FASTAPI_', 'DATABASE_URL'],
    },
  },
  {
    service: 'Django',
    confidence: 0.98,
    patterns: {
      packageJson: ['django'],
      dockerfile: ['django', 'manage.py'],
    },
  },
  {
    service: 'PostgreSQL',
    confidence: 0.95,
    patterns: {
      dockerCompose: ['postgres', 'postgresql'],
      envExample: ['DATABASE_URL', 'POSTGRES_PASSWORD'],
    },
  },
  {
    service: 'Redis',
    confidence: 0.9,
    patterns: {
      dockerCompose: ['redis'],
      envExample: ['REDIS_URL', 'REDIS_PASSWORD'],
    },
  },
  {
    service: 'MongoDB',
    confidence: 0.9,
    patterns: {
      dockerCompose: ['mongo'],
      envExample: ['MONGO_URI', 'MONGODB_URL'],
    },
  },
  {
    service: 'Stripe',
    confidence: 0.85,
    patterns: {
      packageJson: ['stripe'],
      envExample: ['STRIPE_API_KEY', 'STRIPE_SECRET_KEY'],
      workflows: ['stripe'],
    },
  },
  {
    service: 'OpenAI',
    confidence: 0.85,
    patterns: {
      packageJson: ['openai'],
      envExample: ['OPENAI_API_KEY'],
      workflows: ['openai', 'gpt'],
    },
  },
  {
    service: 'GitHub Actions',
    confidence: 0.9,
    patterns: {
      workflows: ['github.com/actions', 'runs-on'],
    },
  },
  {
    service: 'Kubernetes',
    confidence: 0.88,
    patterns: {
      dockerCompose: ['kubernetes', 'k8s'],
      dockerfile: ['kubectl'],
      workflows: ['helm', 'kubectl'],
    },
  },
];

export class HeuristicMatcher {
  private patterns = DETECTION_PATTERNS;

  matchPackageJson(content: string): string[] {
    const detected = new Set<string>();
    const packageData = this.tryParseJson(content);

    if (!packageData) return [];

    const allDeps = {
      ...packageData.dependencies,
      ...packageData.devDependencies,
    };
    const depNames = Object.keys(allDeps);

    for (const pattern of this.patterns) {
      if (!pattern.patterns.packageJson) continue;

      const matches = pattern.patterns.packageJson.some((p) =>
        depNames.some((d) => d.includes(p) || p.includes(d)),
      );

      if (matches) {
        detected.add(pattern.service);
      }
    }

    return Array.from(detected);
  }

  matchDockerCompose(content: string): string[] {
    const detected = new Set<string>();
    const lowerContent = content.toLowerCase();

    for (const pattern of this.patterns) {
      if (!pattern.patterns.dockerCompose) continue;

      const matches = pattern.patterns.dockerCompose.some((p) => lowerContent.includes(p));

      if (matches) {
        detected.add(pattern.service);
      }
    }

    return Array.from(detected);
  }

  matchDockerfile(content: string): string[] {
    const detected = new Set<string>();
    const lowerContent = content.toLowerCase();

    for (const pattern of this.patterns) {
      if (!pattern.patterns.dockerfile) continue;

      const matches = pattern.patterns.dockerfile.some((p) => lowerContent.includes(p));

      if (matches) {
        detected.add(pattern.service);
      }
    }

    return Array.from(detected);
  }

  matchEnvExample(content: string): string[] {
    const detected = new Set<string>();
    const lowerContent = content.toLowerCase();

    for (const pattern of this.patterns) {
      if (!pattern.patterns.envExample) continue;

      const matches = pattern.patterns.envExample.some((p) => lowerContent.includes(p));

      if (matches) {
        detected.add(pattern.service);
      }
    }

    return Array.from(detected);
  }

  matchWorkflows(content: string): string[] {
    const detected = new Set<string>();
    const lowerContent = content.toLowerCase();

    for (const pattern of this.patterns) {
      if (!pattern.patterns.workflows) continue;

      const matches = pattern.patterns.workflows.some((p) => lowerContent.includes(p));

      if (matches) {
        detected.add(pattern.service);
      }
    }

    return Array.from(detected);
  }

  private tryParseJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
