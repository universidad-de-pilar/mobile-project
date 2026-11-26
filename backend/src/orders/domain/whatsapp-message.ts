export const WHATSAPP_MAX_PART_CHARS = 1500;

export interface WhatsappStore { name: string; whatsapp_number: string | null }
export interface WhatsappOrder { order_number: number; customer_name: string | null; note: string | null; total: string }
export interface WhatsappLine { product_name: string; quantity: number; unit_price: string; line_total: string }
export interface WhatsappPart { part: number; total: number; text: string; url: string }

const money = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatMoney = (amount: string) => `$${money.format(Number(amount))}`;

// Greedy fill; the header (with the part count) counts toward each part's limit.
function split(head: (i: number) => string, items: string[], totalLine: string): string[] {
    const parts: string[] = [];
    let i = 0;
    let current = head(0);
    let count = 0;
    for (const item of items) {
        const candidate = `${current}${count === 0 ? '\n\n' : '\n'}${item}`;
        if (candidate.length > WHATSAPP_MAX_PART_CHARS && count > 0) {
            parts.push(current);
            current = `${head(++i)}\n\n${item}`;
        } else {
            current = candidate;
        }
        count++;
    }
    const withTotal = `${current}\n\n${totalLine}`;
    if (withTotal.length <= WHATSAPP_MAX_PART_CHARS) {
        parts.push(withTotal);
    } else {
        parts.push(current, `${head(++i)}\n\n${totalLine}`);
    }
    return parts;
}

export function buildWhatsappParts(store: WhatsappStore, order: WhatsappOrder, lines: WhatsappLine[]): WhatsappPart[] {
    if (!store.whatsapp_number) {
        return [];
    }
    const title = `Pedido #${order.order_number}`;
    const intro = [
        `Local: ${store.name}`,
        ...(order.customer_name ? [`Cliente: ${order.customer_name}`] : []),
        ...(order.note ? [`Nota: ${order.note}`] : []),
    ].join('\n');
    const items = lines.map((l) => `${l.quantity} x ${l.product_name} — ${formatMoney(l.line_total)}`);
    const totalLine = `Total: ${formatMoney(order.total)}`;
    // Only the first part carries the store, customer and note lines.
    const headFor = (header: string) => (i: number) => (i === 0 ? `${header}\n${intro}` : header);

    let texts = split(headFor(title), items, totalLine);
    if (texts.length > 1) {
        for (let m = 2; ; m++) {
            texts = split((i) => headFor(`${title} — parte ${i + 1}/${m}`)(i), items, totalLine);
            if (texts.length <= m) break;
        }
    }

    const digits = store.whatsapp_number.replace(/^\+/, '');
    return texts.map((text, i) => ({
        part: i + 1,
        total: texts.length,
        text,
        url: `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
    }));
}
