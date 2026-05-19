export interface MysqlPoolLike {
  query: (sql: string, values?: unknown[]) => Promise<[unknown, unknown]>;
}

let pool: MysqlPoolLike | null = null;

export function configureMysqlPool(customPool: MysqlPoolLike) {
  pool = customPool;
}

export function getMysqlPool(): MysqlPoolLike | null {
  return pool;
}
