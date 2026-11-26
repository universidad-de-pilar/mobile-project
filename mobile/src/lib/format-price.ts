export function formatPrice(price: string): string {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(price);
  if (!match) return price;
  const whole = match[1].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cents = (match[2] ?? '').slice(0, 2).padEnd(2, '0');
  return cents === '00' ? `$${whole}` : `$${whole},${cents}`;
}

export const formatCents = (cents: number) => formatPrice((cents / 100).toFixed(2));
