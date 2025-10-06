// Performance monitoring utilities
class PerformanceTracker {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();

  // Mark the start of a performance measurement
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  // Measure the time between two marks
  measure(name: string, startMark?: string, endMark?: string): number {
    const end = endMark
      ? this.marks.get(endMark) || performance.now()
      : performance.now();
    const start = startMark ? this.marks.get(startMark) || 0 : 0;

    const duration = end - start;
    this.measures.set(name, duration);

    return duration;
  }

  // Get a performance measurement
  getMeasure(name: string): number | undefined {
    return this.measures.get(name);
  }

  // Log performance data to console (development only)
  log(name: string): void {
    if (process.env.NODE_ENV === 'development') {
      const measure = this.getMeasure(name);
      if (measure !== undefined) {
        console.log(`⚡ Performance [${name}]: ${measure.toFixed(2)}ms`);
      }
    }
  }

  // Clear all marks and measures
  clear(): void {
    this.marks.clear();
    this.measures.clear();
  }
}

// Global performance tracker instance
export const perf = new PerformanceTracker();

// Performance decorator for functions
export function measurePerformance(name: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value;

    if (!originalMethod) {
      return descriptor;
    }

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      perf.mark(`${name}_start`);

      try {
        const result = await originalMethod.apply(this, args);
        perf.measure(name, `${name}_start`);
        perf.log(name);
        return result;
      } catch (error) {
        perf.measure(`${name}_error`, `${name}_start`);
        perf.log(`${name}_error`);
        throw error;
      }
    } as T;

    return descriptor;
  };
}

// Track Core Web Vitals
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // Track Largest Contentful Paint (LCP)
  new PerformanceObserver(list => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // Track First Input Delay (FID)
  new PerformanceObserver(list => {
    const entries = list.getEntries();
    entries.forEach(entry => {
      const fidEntry = entry as any; // FID entries have processingStart
      console.log('FID:', fidEntry.processingStart - fidEntry.startTime);
    });
  }).observe({ entryTypes: ['first-input'] });

  // Track Cumulative Layout Shift (CLS)
  let clsValue = 0;
  new PerformanceObserver(list => {
    const entries = list.getEntries();
    entries.forEach(entry => {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    });
    console.log('CLS:', clsValue);
  }).observe({ entryTypes: ['layout-shift'] });
}

// Memory usage tracking (if available)
export function trackMemoryUsage(): void {
  if (typeof window === 'undefined' || !(performance as any).memory) return;

  const memory = (performance as any).memory;
  console.log('Memory Usage:', {
    used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
    total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
    limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
  });
}

// Resource timing analysis
export function analyzeResourceTiming(): void {
  if (typeof window === 'undefined') return;

  const resources = performance.getEntriesByType('resource');
  const analysis = resources.reduce(
    (acc, resource) => {
      const resourceEntry = resource as any; // Resource entries have initiatorType
      const type = resourceEntry.initiatorType;
      if (!acc[type]) {
        acc[type] = { count: 0, totalDuration: 0, totalSize: 0 };
      }

      acc[type].count++;
      acc[type].totalDuration += resource.duration;

      // Add transfer size if available
      if ('transferSize' in resourceEntry) {
        acc[type].totalSize += resourceEntry.transferSize;
      }

      return acc;
    },
    {} as Record<
      string,
      { count: number; totalDuration: number; totalSize: number }
    >
  );

  console.table(analysis);
}

// Bundle size analysis helper
export function logBundleInfo(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(
      '📦 Bundle Analysis - Check Next.js build output for detailed bundle sizes'
    );
  }
}
