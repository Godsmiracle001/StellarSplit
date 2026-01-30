# Analytics Module

Basic analytics module providing spending trends and materialized views.

Endpoints:

- GET /api/analytics/spending-trends

Scheduled jobs:

- Refresh materialized views hourly (`AnalyticsScheduler.refreshMaterializedViews`)

Notes:

- Materialized views are created by migration `20260129000000-CreateAnalyticsMaterializedViews.ts`.
- Caching is implemented via CacheModule (Redis-backed by default).
- Exports and advanced features (CSV, PDF) are implemented. ML/predictive features are future work.

Performance & DB tuning 🔧

- Added recommended indexes to support analytics queries (see migration `20260129120000-AddAnalyticsIndexes.ts`).
- To verify query plans run the developer script: `ANALYTICS_TEST_USER=<userId> npm run analytics:analyze` (runs EXPLAIN ANALYZE on category, top-partners, and materialized view queries).
- Recommended next steps: run `EXPLAIN ANALYZE` on your production-ish dataset, review the planner output, and add additional indexes or rewrite queries as needed. Consider streaming large exports and monitoring materialized view refresh times.
