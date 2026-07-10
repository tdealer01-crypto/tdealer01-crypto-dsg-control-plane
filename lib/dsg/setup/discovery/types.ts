export interface ProjectFiles {
  packageJson?: string;
  dockerCompose?: string;
  dockerfile?: string;
  envExample?: string;
  workflows?: string[];
}

export type AnalysisScanMode = 'heuristic' | 'ai' | 'both';

export interface AnalyzeProjectOptions {
  projectName: string;
  githubUrl?: string;
  files: ProjectFiles;
  mode?: AnalysisScanMode;
}
