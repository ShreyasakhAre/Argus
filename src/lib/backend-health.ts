// Backend Health Check & Circuit Breaker
interface CircuitState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

class BackendCircuitBreaker {
  private state: CircuitState = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    nextRetryTime: 0,
  };

  private readonly failureThreshold = 3;
  private readonly recoveryTimeout = 30000; // 30 seconds
  private readonly monitoringPeriod = 60000; // 1 minute

  async checkHealth(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${url}/health`, {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  async execute<T>(operation: () => Promise<T>, backendUrl: string): Promise<T> {
    const now = Date.now();

    // Check if circuit should be half-open for retry
    if (this.state.isOpen && now >= this.state.nextRetryTime) {
      console.log(`[Circuit] Attempting to close circuit for ${backendUrl}`);
      this.state.isOpen = false;
      this.state.failureCount = 0;
    }

    // If circuit is open, fail fast
    if (this.state.isOpen) {
      throw new Error(`Circuit breaker open for ${backendUrl}. Next retry in ${Math.ceil((this.state.nextRetryTime - now) / 1000)}s`);
    }

    try {
      const result = await operation();
      
      // Reset on success
      if (this.state.failureCount > 0) {
        console.log(`[Circuit] Circuit closed for ${backendUrl} after successful operation`);
        this.state.failureCount = 0;
        this.state.isOpen = false;
      }
      
      return result;
    } catch (error) {
      this.state.failureCount++;
      this.state.lastFailureTime = now;

      console.warn(`[Circuit] Operation failed for ${backendUrl}. Failure count: ${this.state.failureCount}`);

      // Open circuit if threshold reached
      if (this.state.failureCount >= this.failureThreshold) {
        this.state.isOpen = true;
        this.state.nextRetryTime = now + this.recoveryTimeout;
        console.error(`[Circuit] Circuit OPENED for ${backendUrl}. Next retry in ${this.recoveryTimeout / 1000}s`);
      }

      throw error;
    }
  }

  getState() {
    return { ...this.state };
  }

  reset() {
    this.state = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      nextRetryTime: 0,
    };
  }
}

export const backendCircuitBreaker = new BackendCircuitBreaker();

// Enhanced fetch with retry and circuit breaker
export async function safeFetch(
  url: string, 
  options: RequestInit = {},
  retries = 2,
  delay = 1000
): Promise<Response> {
  const backendUrl = url.split('/')[0] + '//' + url.split('/')[2];
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await backendCircuitBreaker.execute(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      }, backendUrl);
    } catch (error) {
      const isLastAttempt = attempt === retries;
      
      if (isLastAttempt) {
        console.error(`[SafeFetch] Final attempt failed for ${url}:`, error instanceof Error ? error.message : error);
        throw error;
      }
      
      console.warn(`[SafeFetch] Attempt ${attempt} failed for ${url}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Exponential backoff
    }
  }
  
  throw new Error(`All ${retries} attempts failed for ${url}`);
}
