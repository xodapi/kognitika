import { preflightRustAnalyticsCanary } from '../src/server/config/rust-analytics-canary.ts';

const result = preflightRustAnalyticsCanary(process.env);
console.log(JSON.stringify(result));
if (!result.ready) process.exitCode = 2;
