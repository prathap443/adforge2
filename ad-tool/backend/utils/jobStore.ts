import { JobStatus } from '../types'

// In-memory store — fine for a personal tool
// Resets on server restart; use Redis if you need persistence
export const jobs = new Map<string, JobStatus>()
