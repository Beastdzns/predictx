/**
 * x402 Protocol - Job Store
 * 
 * In-memory store for pending payment jobs
 * In production, use Redis or a database
 */

import { PendingJob, CONTENT_PRICES } from './types';
import { randomUUID } from 'crypto';

// In-memory store (use Redis in production)
const pendingJobs = new Map<string, PendingJob>();

// Job expiry time (5 minutes)
const JOB_TIMEOUT_SECONDS = 300;

/**
 * Create a new pending job requiring payment
 */
export function createPendingJob(
  contentType: string,
  contentId: string,
  walletAddress: string
): PendingJob {
  const jobId = randomUUID();
  const price = CONTENT_PRICES[contentType] || '100000';
  const now = new Date();
  const expiresAt = new Date(now.getTime() + JOB_TIMEOUT_SECONDS * 1000);

  const job: PendingJob = {
    job_id: jobId,
    content_type: contentType,
    content_id: contentId,
    price,
    wallet_address: walletAddress,
    created_at: now,
    expires_at: expiresAt,
    paid: false,
  };

  pendingJobs.set(jobId, job);
  
  console.log(`[x402] Created job ${jobId} for ${contentType}/${contentId}, price: ${price}`);
  
  return job;
}

/**
 * Get a pending job by ID
 */
export function getPendingJob(jobId: string): PendingJob | null {
  const job = pendingJobs.get(jobId);
  
  if (!job) {
    return null;
  }

  // Check if expired
  if (new Date() > job.expires_at) {
    pendingJobs.delete(jobId);
    return null;
  }

  return job;
}

/**
 * Mark a job as paid
 */
export function markJobPaid(jobId: string, txHash: string): boolean {
  const job = pendingJobs.get(jobId);
  
  if (!job) {
    return false;
  }

  job.paid = true;
  job.tx_hash = txHash;
  pendingJobs.set(jobId, job);
  
  console.log(`[x402] Job ${jobId} marked as paid, tx: ${txHash}`);
  
  return true;
}

/**
 * Delete a job (after content delivered or expired)
 */
export function deleteJob(jobId: string): void {
  pendingJobs.delete(jobId);
}

/**
 * Clean up expired jobs (call periodically)
 */
export function cleanupExpiredJobs(): number {
  const now = new Date();
  let cleaned = 0;
  
  for (const [jobId, job] of pendingJobs.entries()) {
    if (now > job.expires_at) {
      pendingJobs.delete(jobId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[x402] Cleaned up ${cleaned} expired jobs`);
  }
  
  return cleaned;
}

/**
 * Check if content is already paid for (by wallet + content)
 */
export function findPaidJob(
  contentType: string,
  contentId: string,
  walletAddress: string
): PendingJob | null {
  for (const job of pendingJobs.values()) {
    if (
      job.paid &&
      job.content_type === contentType &&
      job.content_id === contentId &&
      job.wallet_address.toLowerCase() === walletAddress.toLowerCase()
    ) {
      return job;
    }
  }
  return null;
}

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredJobs, 60 * 1000);
}
