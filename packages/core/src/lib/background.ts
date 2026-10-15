import { waitUntil } from "@vercel/functions";

/**
 * Let work that was started without being awaited run to completion.
 *
 * On a serverless platform a function can be frozen the moment its response is
 * sent, so `void sendEmail(...)` after the response may never finish — which is
 * how a "your doctor has started the call" message goes missing. waitUntil
 * tells the platform to keep the invocation alive until the promise settles.
 * Outside Vercel (local dev, tests, scripts) there is nothing to register with
 * and the promise simply runs as it always did, so this is safe everywhere.
 */
export function runInBackground(work: Promise<unknown>): void {
  try {
    waitUntil(work);
  } catch {
    /* no platform context — the promise is already running */
  }
}

/**
 * Wrap every function in a service so that any promise it returns is registered
 * with runInBackground. Callers that await the result are unaffected (they get
 * the same promise); callers that fire-and-forget now have their work protected.
 * One wrapper at the service boundary instead of editing every call site.
 */
export function backgrounded<T extends { [K in keyof T]: (...args: never[]) => unknown }>(service: T): T {
  const wrapped = {} as T;
  for (const key of Object.keys(service) as (keyof T)[]) {
    const fn = service[key] as unknown as (...args: unknown[]) => unknown;
    (wrapped as Record<keyof T, unknown>)[key] = (...args: unknown[]) => {
      const result = fn.apply(service, args);
      if (result instanceof Promise) runInBackground(result);
      return result;
    };
  }
  return wrapped;
}
