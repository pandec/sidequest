/** Extract the last SQL code block from a markdown/AI response */
export function extractSqlFromResponse(text: string): string | null {
  // Try ```sql blocks first
  const sqlBlocks = [...text.matchAll(/```sql\s*\n([\s\S]*?)```/gi)];
  if (sqlBlocks.length > 0) {
    return sqlBlocks[sqlBlocks.length - 1]![1]!.trim();
  }
  // Fallback: generic code blocks
  const codeBlocks = [...text.matchAll(/```\s*\n([\s\S]*?)```/gi)];
  if (codeBlocks.length > 0) {
    return codeBlocks[codeBlocks.length - 1]![1]!.trim();
  }
  return null;
}

/** Generate a unique message ID using crypto.randomUUID */
export function nextMessageId(): string {
  return crypto.randomUUID();
}
