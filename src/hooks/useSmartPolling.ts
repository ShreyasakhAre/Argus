import { useEffect, useRef, useCallback } from 'react';

interface SmartPollingOptions {
  interval: number;
  enabled?: boolean;
  respectCircuitBreaker?: boolean;
  maxRetries?: number;
  backoffMultiplier?: number;
}

export function useSmartPolling(
  callback: () => Promise<void>,
  options: SmartPollingOptions
) {
  const {
    interval,
    enabled = true,
    respectCircuitBreaker = true,
    maxRetries = 3,
    backoffMultiplier = 2
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastFailureRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  const poll = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Check if we should respect circuit breaker and back off
    if (respectCircuitBreaker) {
      const now = Date.now();
      const timeSinceLastFailure = now - lastFailureRef.current;
      
      // Exponential backoff after failures
      if (retryCountRef.current > 0) {
        const backoffTime = Math.min(1000 * Math.pow(backoffMultiplier, retryCountRef.current), 30000);
        if (timeSinceLastFailure < backoffTime) {
          return; // Skip this poll, still in backoff period
        }
      }
    }

    try {
      await callback();
      
      // Reset retry count on success
      if (retryCountRef.current > 0) {
        console.log(`[SmartPolling] Recovery after ${retryCountRef.current} failures`);
        retryCountRef.current = 0;
      }
    } catch (error) {
      retryCountRef.current++;
      lastFailureRef.current = Date.now();
      
      console.warn(`[SmartPolling] Polling failed (attempt ${retryCountRef.current}/${maxRetries}):`, 
        error instanceof Error ? error.message : error);
      
      // Stop polling if max retries reached
      if (retryCountRef.current >= maxRetries) {
        console.error(`[SmartPolling] Max retries (${maxRetries}) reached, stopping polling`);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
    }
  }, [callback, respectCircuitBreaker, maxRetries, backoffMultiplier]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    isMountedRef.current = true;
    
    // Initial poll
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, interval);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, poll]);

  // Manual reset function
  const reset = useCallback(() => {
    retryCountRef.current = 0;
    lastFailureRef.current = 0;
    
    // Restart polling if it was stopped
    if (enabled && !intervalRef.current) {
      intervalRef.current = setInterval(poll, interval);
    }
  }, [enabled, interval, poll]);

  return { reset };
}
