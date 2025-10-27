/**
 * CI/CD Service - GitHub Actions API Integration
 * Fetches and processes CI/CD pipeline data from GitHub Actions
 */

import axios from 'axios';

const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = process.env.REACT_APP_GITHUB_OWNER || 'kenfungv';
const REPO_NAME = process.env.REACT_APP_GITHUB_REPO || 'prompt-hub';
const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;

// Types
export interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  workflow_id: number;
  run_number: number;
  event: string;
  actor: {
    login: string;
    avatar_url: string;
  };
}

export interface WorkflowJob {
  id: number;
  run_id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string;
  steps: JobStep[];
}

export interface JobStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string;
  completed_at: string;
}

export interface CICDStats {
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  failedRuns: number;
  pendingRuns: number;
}

export interface ProcessedRun {
  id: string;
  workflow: string;
  branch: string;
  status: 'success' | 'failure' | 'pending' | 'cancelled';
  duration: number;
  timestamp: string;
  commitSha: string;
  author: string;
  jobs: ProcessedJob[];
}

export interface ProcessedJob {
  name: string;
  status: 'success' | 'failure' | 'pending' | 'skipped';
  duration: number;
  steps: number;
}

// API Client Configuration
const apiClient = axios.create({
  baseURL: GITHUB_API_BASE,
  headers: {
    Accept: 'application/vnd.github.v3+json',
    ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
  },
});

/**
 * Fetch workflow runs from GitHub Actions
 */
export const fetchWorkflowRuns = async (
  page: number = 1,
  perPage: number = 10
): Promise<{ runs: WorkflowRun[]; total_count: number }> => {
  try {
    const response = await apiClient.get(
      `/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs`,
      {
        params: {
          page,
          per_page: perPage,
          status: 'completed',
        },
      }
    );

    return {
      runs: response.data.workflow_runs,
      total_count: response.data.total_count,
    };
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    throw error;
  }
};

/**
 * Fetch jobs for a specific workflow run
 */
export const fetchWorkflowJobs = async (runId: number): Promise<WorkflowJob[]> => {
  try {
    const response = await apiClient.get(
      `/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}/jobs`
    );

    return response.data.jobs;
  } catch (error) {
    console.error(`Error fetching jobs for run ${runId}:`, error);
    throw error;
  }
};

/**
 * Calculate duration in seconds between two timestamps
 */
const calculateDuration = (start: string, end: string): number => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.floor((endTime - startTime) / 1000);
};

/**
 * Map GitHub status/conclusion to our simplified status
 */
const mapStatus = (status: string, conclusion: string | null): ProcessedJob['status'] => {
  if (status === 'completed') {
    if (conclusion === 'success') return 'success';
    if (conclusion === 'failure') return 'failure';
    if (conclusion === 'skipped') return 'skipped';
  }
  return 'pending';
};

/**
 * Process raw workflow run into our format
 */
const processWorkflowRun = async (run: WorkflowRun): Promise<ProcessedRun> => {
  const jobs = await fetchWorkflowJobs(run.id);
  
  const processedJobs: ProcessedJob[] = jobs.map((job) => ({
    name: job.name,
    status: mapStatus(job.status, job.conclusion),
    duration: job.started_at && job.completed_at
      ? calculateDuration(job.started_at, job.completed_at)
      : 0,
    steps: job.steps?.length || 0,
  }));

  const duration = run.run_started_at && run.updated_at
    ? calculateDuration(run.run_started_at, run.updated_at)
    : 0;

  return {
    id: run.id.toString(),
    workflow: run.name,
    branch: run.head_branch,
    status: mapStatus(run.status, run.conclusion) as ProcessedRun['status'],
    duration,
    timestamp: run.created_at,
    commitSha: run.head_sha.substring(0, 7),
    author: run.actor.login,
    jobs: processedJobs,
  };
};

/**
 * Get processed CI/CD dashboard data
 */
export const getCICDDashboardData = async (
  page: number = 1,
  perPage: number = 20
): Promise<ProcessedRun[]> => {
  try {
    const { runs } = await fetchWorkflowRuns(page, perPage);
    
    // Process all runs in parallel
    const processedRuns = await Promise.all(
      runs.map((run) => processWorkflowRun(run))
    );

    return processedRuns;
  } catch (error) {
    console.error('Error getting CI/CD dashboard data:', error);
    // Return empty array on error instead of throwing
    return [];
  }
};

/**
 * Calculate statistics from processed runs
 */
export const calculateCICDStats = (runs: ProcessedRun[]): CICDStats => {
  const totalRuns = runs.length;
  const successRuns = runs.filter((run) => run.status === 'success').length;
  const failedRuns = runs.filter((run) => run.status === 'failure').length;
  const pendingRuns = runs.filter((run) => run.status === 'pending').length;
  
  const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0;
  const avgDuration = totalRuns > 0
    ? runs.reduce((sum, run) => sum + run.duration, 0) / totalRuns
    : 0;

  return {
    totalRuns,
    successRate,
    avgDuration,
    failedRuns,
    pendingRuns,
  };
};

/**
 * Get workflow statistics by name
 */
export const getWorkflowStats = async (
  workflowName: string
): Promise<{ successRate: number; avgDuration: number; totalRuns: number }> => {
  try {
    const { runs } = await fetchWorkflowRuns(1, 100);
    const filteredRuns = runs.filter((run) => run.name === workflowName);
    
    const processedRuns = await Promise.all(
      filteredRuns.map((run) => processWorkflowRun(run))
    );
    
    const stats = calculateCICDStats(processedRuns);
    
    return {
      successRate: stats.successRate,
      avgDuration: stats.avgDuration,
      totalRuns: stats.totalRuns,
    };
  } catch (error) {
    console.error(`Error getting stats for workflow ${workflowName}:`, error);
    return {
      successRate: 0,
      avgDuration: 0,
      totalRuns: 0,
    };
  }
};

/**
 * Get latest workflow run for a specific workflow
 */
export const getLatestWorkflowRun = async (
  workflowName: string
): Promise<ProcessedRun | null> => {
  try {
    const { runs } = await fetchWorkflowRuns(1, 10);
    const latestRun = runs.find((run) => run.name === workflowName);
    
    if (!latestRun) return null;
    
    return await processWorkflowRun(latestRun);
  } catch (error) {
    console.error(`Error getting latest run for ${workflowName}:`, error);
    return null;
  }
};

export default {
  fetchWorkflowRuns,
  fetchWorkflowJobs,
  getCICDDashboardData,
  calculateCICDStats,
  getWorkflowStats,
  getLatestWorkflowRun,
};
