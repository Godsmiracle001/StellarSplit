import { AppDataSource } from "../src/database/data-source";

async function run() {
  await AppDataSource.initialize();
  const ds = AppDataSource;

  const userId = process.env.ANALYTICS_TEST_USER || null;
  const dateFrom = process.env.ANALYTICS_TEST_FROM || null;
  const dateTo = process.env.ANALYTICS_TEST_TO || null;

  console.log("Running EXPLAIN ANALYZE for analytics queries");

  // 1) Category breakdown base query (similar to getCategoryBreakdown)
  // Build category query safely to avoid template quoting issues
  let categorySql = `EXPLAIN ANALYZE
SELECT COALESCE(i.category, 'uncategorized') AS category, SUM(i."totalPrice"::numeric) AS amount
FROM items i
INNER JOIN splits sp ON i."splitId" = sp.id
INNER JOIN participants p ON p."splitId" = sp.id
WHERE 1=1`;
  const categoryParams: any[] = [];
  if (dateFrom) {
    categorySql += `\nAND sp."createdAt" >= $${categoryParams.length + 1}`;
    categoryParams.push(dateFrom);
  }
  if (dateTo) {
    categorySql += `\nAND sp."createdAt" <= $${categoryParams.length + 1}`;
    categoryParams.push(dateTo);
  }
  if (userId) {
    categorySql += `\nAND p."userId" = $${categoryParams.length + 1}`;
    categoryParams.push(userId);
  }
  categorySql += `\nGROUP BY category\nORDER BY amount DESC;`;

  console.log("\n--- Category breakdown EXPLAIN ---");
  try {
    const res = await ds.query(categorySql, categoryParams);
    console.log(res.map((r: any) => r["QUERY PLAN"] || r).join("\n"));
  } catch (err) {
    console.error("Category explain failed:", err);
  }

  // 2) Top partners query
  const topPartnersSql = `EXPLAIN ANALYZE
SELECT p_other."userId" AS partnerId, SUM(payment.amount::numeric) as totalAmount, COUNT(*) as interactions
FROM participants p_self
INNER JOIN participants p_other ON p_self."splitId" = p_other."splitId"
INNER JOIN payments payment ON payment."participantId" = p_other.id
WHERE p_self."userId" = $1
  AND p_other."userId" != $1
  AND payment.status = 'confirmed'
GROUP BY partnerId
ORDER BY totalAmount DESC
LIMIT 10;`;

  console.log("\n--- Top partners EXPLAIN ---");
  if (!userId) {
    console.log(
      "Skipping top partners explain: set ANALYTICS_TEST_USER=<uuid> to run this check",
    );
  } else {
    try {
      const res = await ds.query(topPartnersSql, [userId]);
      console.log(res.map((r: any) => r["QUERY PLAN"] || r).join("\n"));
    } catch (err) {
      console.error("Top partners explain failed:", err);
    }
  }

  // 3) Materialized view usage (spending trends)
  const trendsQuery = `EXPLAIN ANALYZE
SELECT * FROM analytics_spending_trends_monthly WHERE user_id = $1 ORDER BY period DESC LIMIT 24;`;

  console.log("\n--- Spending trends (materialized view) EXPLAIN ---");
  // Check if view exists first
  try {
    const exists = await ds.query(
      `SELECT to_regclass('public.analytics_spending_trends_monthly') AS reg`,
    );
    if (!exists || !exists[0] || !exists[0].reg) {
      console.log(
        "Materialized view analytics_spending_trends_monthly not found; run migrations or create the view before running this check.",
      );
    } else {
      try {
        const res = await ds.query(trendsQuery, [userId || null]);
        console.log(res.map((r: any) => r["QUERY PLAN"] || r).join("\n"));
      } catch (err) {
        console.error("Trends explain failed:", err);
      }
    }
  } catch (err) {
    console.error("Failed checking materialized view existence:", err);
  }

  await ds.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
