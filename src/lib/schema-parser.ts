import { Parser } from "node-sql-parser";

export interface ParsedColumn {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
}

export interface ParsedTable {
  name: string;
  columns: ParsedColumn[];
}

export interface ParsedRelationship {
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
}

export interface ParsedSchema {
  tables: ParsedTable[];
  relationships: ParsedRelationship[];
}

/**
 * Parse BigQuery DDL (CREATE TABLE statements) and extract tables, columns,
 * types, primary keys, and foreign key relationships.
 *
 * Uses node-sql-parser with BigQuery dialect. On parse errors it falls back to
 * a lightweight regex-based extractor so callers always get partial results.
 */
export function parseDDL(ddl: string): ParsedSchema {
  const tables: ParsedTable[] = [];
  const relationships: ParsedRelationship[] = [];

  // Try structured parsing first
  try {
    const parser = new Parser();
    const ast = parser.astify(ddl, { database: "BigQuery" });
    const statements = Array.isArray(ast) ? ast : [ast];

    for (const stmt of statements) {
      try {
        processStatement(stmt, tables, relationships);
      } catch {
        // Skip individual statements that fail
      }
    }
  } catch {
    // Full parse failed — fall back to regex extraction
    parseWithRegex(ddl, tables, relationships);
  }

  // If structured parsing returned nothing, try regex as well
  if (tables.length === 0) {
    parseWithRegex(ddl, tables, relationships);
  }

  return { tables, relationships };
}

// ---------------------------------------------------------------------------
// AST-based extraction
// ---------------------------------------------------------------------------

function processStatement(
  stmt: any,
  tables: ParsedTable[],
  relationships: ParsedRelationship[],
) {
  if (!stmt || stmt.type !== "create" || stmt.keyword !== "table") return;

  const tableName = extractTableName(stmt);
  if (!tableName) return;

  const columns: ParsedColumn[] = [];
  const pkColumns = new Set<string>();

  // Collect column definitions
  const createDefs: any[] = stmt.create_definitions ?? [];
  for (const def of createDefs) {
    if (def.resource === "column") {
      const col = extractColumn(def);
      if (col) columns.push(col);
    }

    // Inline PRIMARY KEY constraint on a column
    if (def.resource === "column" && def.primary_key) {
      pkColumns.add(def.column?.column ?? "");
    }

    // Table-level PRIMARY KEY constraint
    if (def.resource === "constraint" && def.constraint_type === "primary key") {
      const keys: any[] = def.definition ?? [];
      for (const k of keys) {
        pkColumns.add(k.column ?? "");
      }
    }

    // FOREIGN KEY constraint
    if (def.resource === "constraint" && def.constraint_type === "FOREIGN KEY") {
      extractForeignKey(def, tableName, relationships);
    }
  }

  // Mark primary keys
  for (const col of columns) {
    if (pkColumns.has(col.name)) col.primaryKey = true;
  }

  if (columns.length > 0) {
    tables.push({ name: tableName, columns });
  }
}

function extractTableName(stmt: any): string | null {
  const tbl = stmt.table?.[0];
  if (!tbl) return null;
  // May have schema/dataset prefix
  const parts = [tbl.db, tbl.table].filter(Boolean);
  return parts.join(".");
}

function extractColumn(def: any): ParsedColumn | null {
  const name = def.column?.column;
  if (!name) return null;

  const type = resolveType(def.definition);
  const nullable = !def.nullable || def.nullable?.value !== "not null";
  const primaryKey = !!def.primary_key;

  return { name, type, nullable, primaryKey };
}

function resolveType(typeDef: any): string {
  if (!typeDef) return "UNKNOWN";
  const dataType: string = typeDef.dataType ?? typeDef.data_type ?? "";
  const length = typeDef.length ?? typeDef.precision;
  const scale = typeDef.scale;

  let result = dataType.toUpperCase();
  if (length != null) {
    result += scale != null ? `(${length},${scale})` : `(${length})`;
  }
  return result || "UNKNOWN";
}

function extractForeignKey(
  def: any,
  fromTable: string,
  relationships: ParsedRelationship[],
) {
  const fkCols: any[] = def.definition ?? [];
  const refCols: any[] = def.reference_definition?.definition ?? [];
  const refTable = def.reference_definition?.table?.[0];
  if (!refTable) return;

  const toTable = [refTable.db, refTable.table].filter(Boolean).join(".");

  for (let i = 0; i < fkCols.length; i++) {
    const fromCol = fkCols[i]?.column;
    const toCol = refCols[i]?.column;
    if (fromCol && toCol) {
      relationships.push({
        from: fromTable,
        fromColumn: fromCol,
        to: toTable,
        toColumn: toCol,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Regex fallback — handles common CREATE TABLE patterns when the parser chokes
// ---------------------------------------------------------------------------

function parseWithRegex(
  ddl: string,
  tables: ParsedTable[],
  relationships: ParsedRelationship[],
) {
  const existingNames = new Set(tables.map((t) => t.name));

  // Find CREATE TABLE header + table name, then locate the opening '('
  const headerRe =
    /CREATE\s+(?:OR\s+REPLACE\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(`[^`]+`|"[^"]+"|[^\s(]+)\s*\(/gi;

  let headerMatch: RegExpExecArray | null;
  while ((headerMatch = headerRe.exec(ddl)) !== null) {
    const rawName = headerMatch[1]!.replace(/`/g, "").replace(/"/g, "");
    if (existingNames.has(rawName)) continue;

    // Walk from the opening '(' using balanced-paren counting
    const openParenIdx = headerMatch.index + headerMatch[0].length - 1;
    const body = extractBalancedParens(ddl, openParenIdx);
    if (body === null) continue;

    const columns: ParsedColumn[] = [];

    // Split body by top-level commas (respecting nested parens)
    const lines = splitTopLevelCommas(body);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip constraint lines
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)/i.test(trimmed)) {
        extractFKFromLine(trimmed, rawName, relationships);
        continue;
      }

      const colMatch = trimmed.match(
        /^[`"]?(\w+)[`"]?\s+([A-Za-z0-9_]+(?:\([^)]*\))?)/,
      );
      if (colMatch) {
        const name = colMatch[1]!;
        const type = colMatch[2]!.toUpperCase();
        const nullable = !/NOT\s+NULL/i.test(trimmed);
        const primaryKey = /PRIMARY\s+KEY/i.test(trimmed);
        columns.push({ name, type, nullable, primaryKey });
      }
    }

    if (columns.length > 0) {
      tables.push({ name: rawName, columns });
      existingNames.add(rawName);
    }
  }
}

/** Walk from an opening '(' and return the content between balanced parens. */
function extractBalancedParens(s: string, openIdx: number): string | null {
  if (s[openIdx] !== "(") return null;
  let depth = 1;
  let i = openIdx + 1;
  while (i < s.length && depth > 0) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    i++;
  }
  if (depth !== 0) return null;
  return s.slice(openIdx + 1, i - 1);
}

/** Split a string by commas that are not inside nested parentheses. */
function splitTopLevelCommas(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    else if (s[i] === "," && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

function extractFKFromLine(
  line: string,
  fromTable: string,
  relationships: ParsedRelationship[],
) {
  const fkRe =
    /FOREIGN\s+KEY\s*\(\s*[`"]?(\w+)[`"]?\s*\)\s*REFERENCES\s+[`"]?([^\s(`"]+)[`"]?\s*\(\s*[`"]?(\w+)[`"]?\s*\)/i;
  const m = line.match(fkRe);
  if (m) {
    relationships.push({
      from: fromTable,
      fromColumn: m[1]!,
      to: m[2]!.replace(/`/g, "").replace(/"/g, ""),
      toColumn: m[3]!,
    });
  }
}
