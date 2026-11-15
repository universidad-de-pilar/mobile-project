export class Product {
    product_id: string;
    store_id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: string;
    image_path: string | null;
    is_available: boolean;
    sort_order: number;
    sku: string | null;
    gluten_free: boolean;
    created_at: Date;
    updated_at: Date;
}

export const toProductResponse = ({ image_path, ...product }: Product) => ({
    ...product,
    image_url: image_path ? `/media/${image_path}` : null,
});
