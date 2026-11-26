// DO Managed PostgreSQL uses its own CA; PGSSLMODE=require verifies against the public store and fails.
// Undefined keeps node-postgres reading PGSSLMODE, so local setups are unchanged.
export const dbSsl = (ca?: string) => (ca ? { ca, rejectUnauthorized: true } : undefined);
