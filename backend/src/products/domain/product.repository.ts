import { Product } from "./product.entity";

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY')

export interface ProductFilters {
    store_id: string;
    category_id?: string;
    is_available?: boolean;
}

export interface CreateProductData {
    store_id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: string;
    is_available: boolean;
    sort_order: number;
    sku: string;
    gluten_free: boolean;
}

export interface UpdateProductData {
    category_id?: string;
    name?: string;
    description?: string | null;
    price?: string;
    is_available?: boolean;
    sort_order?: number;
    sku?: string;
    gluten_free?: boolean;
    // Set only by the image use cases, never by the PATCH DTO.
    image_path?: string | null;
}

export interface CatalogLine {
    category_id: string;
    category_name: string;
    product_id: string;
    name: string;
    description: string | null;
    price: string;
    image_path: string | null;
    gluten_free: boolean;
}

export interface IProductRepository{
    findAll(tenantId:string, filters:ProductFilters):Promise<Product[]>;
    findOne(tenantId:string, productId:string):Promise<Product | null>;
    findCatalog(tenantId:string, storeId:string):Promise<CatalogLine[]>;
    countByStore(tenantId:string, storeId:string):Promise<number>;
    isCategoryOfStore(tenantId:string, categoryId:string, storeId:string):Promise<boolean>;
    skuTaken(tenantId:string, sku:string, exceptProductId?:string):Promise<boolean>;
    create(tenantId:string, data:CreateProductData):Promise<Product>;
    update(tenantId:string, productId:string, data:UpdateProductData):Promise<Product | null>;
    delete(tenantId:string, productId:string):Promise<Product | null>;
}
