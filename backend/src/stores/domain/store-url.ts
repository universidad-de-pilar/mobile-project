import { webOrigin } from "src/tenants/domain/web-origin";
import { StoreRow } from "./store.repository";

export const withSelfOrderUrl = (tenantSlug: string, store: StoreRow) =>
    ({ ...store, self_order_url: `${webOrigin(tenantSlug)}/${store.slug}` });
