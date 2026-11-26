export const webOrigin = (tenantSlug: string) =>
    (process.env.WEB_ORIGIN_TEMPLATE ?? 'http://{slug}.localhost:8081').replace('{slug}', tenantSlug);
