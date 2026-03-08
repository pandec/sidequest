# BigQuery SQL Best Practices

A comprehensive guide to writing clean, efficient, and cost-effective BigQuery SQL. This is the expanded version of the starter content shipped with SQL Sidekick's Best Practices Editor.

---

## Naming Conventions

- Use `snake_case` for all table and column names
- Prefix tables by layer:
  - `stg_` for staging tables (raw data, minimal transformation)
  - `dim_` for dimension tables (descriptive attributes)
  - `fact_` for fact tables (measurable events/transactions)
  - `agg_` for pre-aggregated summary tables
- Use descriptive, unambiguous column names:
  - Good: `order_created_at`, `customer_email`, `total_revenue_usd`
  - Bad: `created`, `email`, `total`
- Avoid SQL reserved words as identifiers (`date`, `table`, `select`, etc.)
- Boolean columns should read as questions: `is_active`, `has_subscription`, `is_deleted`
- Foreign key columns should match the referenced table: `customer_id` references `dim_customers`
- Timestamp columns should include the time context: `created_at`, `updated_at`, `deleted_at`

---

## Partitioning and Clustering

### Partitioning

Partitioning divides a table into segments by a column value, so queries only scan relevant partitions.

```sql
CREATE TABLE project.dataset.fact_orders (
  order_id STRING,
  customer_id STRING,
  order_total NUMERIC,
  created_at TIMESTAMP
)
PARTITION BY DATE(created_at);
```

**Guidelines:**
- Always partition large tables (>1 GB) by a date or timestamp column
- Use `PARTITION BY DATE(column)` for timestamp columns
- Use `PARTITION BY column` for DATE or integer range columns
- For append-only tables (logs, events), prefer ingestion-time partitioning: `PARTITION BY _PARTITIONDATE`
- Always include a partition filter in WHERE clauses to avoid full table scans:
  ```sql
  WHERE DATE(created_at) BETWEEN '2025-01-01' AND '2025-03-31'
  ```
- Set partition expiration for temporary data: `OPTIONS (partition_expiration_days = 90)`

### Clustering

Clustering sorts data within partitions by up to 4 columns, speeding up filtered queries.

```sql
CREATE TABLE project.dataset.fact_orders (
  order_id STRING,
  customer_id STRING,
  region STRING,
  order_total NUMERIC,
  created_at TIMESTAMP
)
PARTITION BY DATE(created_at)
CLUSTER BY customer_id, region;
```

**Guidelines:**
- Cluster on columns you frequently filter or group by
- Order clustering columns from highest to lowest cardinality
- Clustering is most effective on columns used in WHERE, JOIN, and GROUP BY
- Re-cluster periodically if you heavily update data (BigQuery auto-re-clusters, but large updates may fragment)

---

## JOINs Best Practices

### Basics

- Always qualify columns with table aliases to avoid ambiguity:
  ```sql
  SELECT
    o.order_id,
    c.customer_name
  FROM fact_orders AS o
  INNER JOIN dim_customers AS c ON o.customer_id = c.customer_id
  ```
- Use meaningful, short aliases: `o` for orders, `c` for customers, `p` for products

### Performance

- Place the **largest table first** in the FROM clause. BigQuery uses the first table as the "left" side, and smaller tables are broadcast:
  ```sql
  -- Good: large table first
  FROM fact_orders AS o
  INNER JOIN dim_products AS p ON o.product_id = p.product_id

  -- Bad: small table first with large table joined
  FROM dim_products AS p
  INNER JOIN fact_orders AS o ON o.product_id = p.product_id
  ```
- Use `INNER JOIN` over `CROSS JOIN` when possible. Cross joins produce cartesian products and can explode row counts.
- Avoid joining on expressions. Pre-compute in a CTE:
  ```sql
  -- Bad
  FROM orders AS o
  JOIN products AS p ON LOWER(o.product_code) = LOWER(p.product_code)

  -- Good
  WITH normalized_orders AS (
    SELECT *, LOWER(product_code) AS product_code_lower FROM orders
  )
  SELECT * FROM normalized_orders AS o
  JOIN products AS p ON o.product_code_lower = p.product_code_lower
  ```
- Filter early: apply WHERE conditions before JOINs when possible (use CTEs to pre-filter)

### Anti-patterns to avoid

- Joining on non-indexed columns without filtering first
- Using `SELECT *` through multiple joins (select only what you need)
- Chaining many LEFT JOINs when INNER JOINs would be correct -- left joins keep all rows from the left table even without a match

---

## CTEs (Common Table Expressions)

CTEs make complex queries readable by breaking them into named, logical steps.

```sql
WITH active_users AS (
  SELECT user_id, user_name
  FROM dim_users
  WHERE is_active = TRUE
),
user_orders AS (
  SELECT
    u.user_id,
    u.user_name,
    COUNT(*) AS order_count,
    SUM(o.order_total) AS total_spent
  FROM active_users AS u
  INNER JOIN fact_orders AS o ON u.user_id = o.user_id
  WHERE DATE(o.created_at) >= '2025-01-01'
  GROUP BY u.user_id, u.user_name
)
SELECT *
FROM user_orders
WHERE total_spent > 1000
ORDER BY total_spent DESC;
```

**Guidelines:**
- Name CTEs descriptively: `active_users`, `monthly_revenue`, `top_products`
- Each CTE should do one thing (filter, aggregate, join, transform)
- Avoid deeply nested subqueries -- refactor into sequential CTEs
- CTEs are not materialized in BigQuery (they are inlined). For heavy reuse of the same result, consider a temp table:
  ```sql
  CREATE TEMP TABLE active_users AS
  SELECT user_id FROM dim_users WHERE is_active = TRUE;
  ```
- Keep CTE chains linear when possible (each CTE references the previous one) for readability

---

## Window Functions

Window functions perform calculations across rows related to the current row, without collapsing them.

### Common patterns

```sql
-- Row numbering (deduplication, ranking)
SELECT *,
  ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS rn
FROM fact_orders
QUALIFY rn = 1;  -- BigQuery-specific: filter on window result

-- Running total
SELECT
  order_id,
  order_total,
  SUM(order_total) OVER (
    PARTITION BY customer_id
    ORDER BY created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM fact_orders;

-- Previous/next row values
SELECT
  order_id,
  order_total,
  LAG(order_total) OVER (PARTITION BY customer_id ORDER BY created_at) AS prev_order_total,
  LEAD(order_total) OVER (PARTITION BY customer_id ORDER BY created_at) AS next_order_total
FROM fact_orders;

-- Percentile buckets
SELECT
  customer_id,
  total_spent,
  NTILE(4) OVER (ORDER BY total_spent DESC) AS spending_quartile
FROM customer_summary;
```

**Guidelines:**
- Always define explicit `PARTITION BY` and `ORDER BY` in the `OVER` clause
- Use `QUALIFY` (BigQuery-specific) instead of wrapping in a subquery to filter window results
- Prefer window functions over self-joins for ranking, running totals, and comparisons between rows
- Common window functions: `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`, `LAG()`, `LEAD()`, `SUM() OVER`, `AVG() OVER`, `NTILE()`, `FIRST_VALUE()`, `LAST_VALUE()`
- When using `LAST_VALUE()`, specify the frame: `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`

---

## Cost Optimization

BigQuery charges by the amount of data scanned, so reducing scan size is the primary cost lever.

### Column selection

- **Never use `SELECT *`** in production queries. Always list the specific columns you need.
- This is especially important with wide tables (many columns) or tables with large STRING/JSON columns.

### Partition filters

- Always include partition filters in WHERE clauses. Without them, BigQuery scans the entire table.
- Use `_PARTITIONDATE` or `_PARTITIONTIME` for ingestion-time partitioned tables.

### Approximate functions

For analytics where exact precision isn't critical:

```sql
-- Instead of COUNT(DISTINCT user_id)  -- expensive
SELECT APPROX_COUNT_DISTINCT(user_id) FROM fact_events;

-- HyperLogLog for very large cardinality
SELECT HLL_COUNT.EXTRACT(HLL_COUNT.INIT(user_id)) FROM fact_events;
```

### Materialized views

For frequently run aggregations, create a materialized view:

```sql
CREATE MATERIALIZED VIEW project.dataset.mv_daily_revenue AS
SELECT
  DATE(created_at) AS order_date,
  region,
  SUM(order_total) AS daily_revenue,
  COUNT(*) AS order_count
FROM project.dataset.fact_orders
GROUP BY order_date, region;
```

BigQuery automatically uses materialized views when it detects a matching query pattern.

### Other cost tips

- Use `LIMIT` during development and testing to avoid scanning full tables
- Prefer `DATE` over `TIMESTAMP` when time precision isn't needed (smaller storage)
- Use `IF EXISTS` checks before creating/dropping tables in scripts
- Check query cost with dry run before executing (BigQuery console shows estimated bytes)
- Use batch loading over streaming inserts when real-time isn't required
- Set byte-billing limits on queries to prevent runaway costs:
  ```sql
  -- In BigQuery settings or API: maximumBytesBilled
  ```

---

## Error Handling Patterns

### SAFE functions

BigQuery provides `SAFE_` prefix versions of many functions that return NULL instead of errors:

```sql
-- Instead of failing on invalid cast:
SELECT SAFE_CAST('not_a_number' AS INT64);  -- Returns NULL

-- Instead of division by zero error:
SELECT SAFE_DIVIDE(revenue, order_count);  -- Returns NULL when order_count = 0

-- Safe date parsing:
SELECT SAFE.PARSE_TIMESTAMP('%Y-%m-%d', date_string);
```

### IFNULL and COALESCE

```sql
-- Default value for NULL
SELECT IFNULL(customer_name, 'Unknown') AS customer_name;

-- First non-null from multiple columns
SELECT COALESCE(preferred_name, full_name, email, 'Anonymous') AS display_name;
```

### Defensive aggregation

```sql
-- Handle empty groups
SELECT
  region,
  IFNULL(SUM(order_total), 0) AS total_revenue,
  IFNULL(COUNT(DISTINCT customer_id), 0) AS unique_customers
FROM fact_orders
GROUP BY region;
```

---

## Testing Patterns

### Validate row counts

```sql
-- After a transformation, compare input vs output counts
WITH source_count AS (
  SELECT COUNT(*) AS cnt FROM raw_orders
),
target_count AS (
  SELECT COUNT(*) AS cnt FROM stg_orders
)
SELECT
  s.cnt AS source_rows,
  t.cnt AS target_rows,
  s.cnt - t.cnt AS difference
FROM source_count AS s, target_count AS t;
```

### Check for duplicates

```sql
-- Find duplicate primary keys
SELECT order_id, COUNT(*) AS cnt
FROM fact_orders
GROUP BY order_id
HAVING cnt > 1;
```

### NULL auditing

```sql
-- Check NULL rates for critical columns
SELECT
  COUNTIF(customer_id IS NULL) AS null_customer_id,
  COUNTIF(order_total IS NULL) AS null_order_total,
  COUNT(*) AS total_rows,
  ROUND(COUNTIF(customer_id IS NULL) / COUNT(*) * 100, 2) AS null_pct_customer_id
FROM fact_orders;
```

### Schema validation

```sql
-- Verify expected columns exist (useful in automated pipelines)
SELECT column_name, data_type
FROM project.dataset.INFORMATION_SCHEMA.COLUMNS
WHERE table_name = 'fact_orders'
ORDER BY ordinal_position;
```

### Date range validation

```sql
-- Ensure data covers expected date range
SELECT
  MIN(DATE(created_at)) AS earliest_date,
  MAX(DATE(created_at)) AS latest_date,
  DATE_DIFF(MAX(DATE(created_at)), MIN(DATE(created_at)), DAY) AS span_days
FROM fact_orders;
```
