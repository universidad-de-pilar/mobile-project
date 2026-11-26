import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CatalogLine, CreateProductData, IProductRepository, ProductFilters, UpdateProductData } from "../domain/product.repository";
import { Product } from "../domain/product.entity";
import { skuAlreadyExists } from "../domain/product.errors";
import { ProductOrmEntity } from "./product.orm-entity";

const UNIQUE_VIOLATION = '23505';
const pgCode = (error: any): string | undefined => error?.driverError?.code ?? error?.code;

const toProduct = (row: ProductOrmEntity): Product => ({
    product_id: row.product_id,
    store_id: row.store_id,
    category_id: row.category_id,
    name: row.name,
    description: row.description,
    price: row.price,
    image_path: row.image_path,
    is_available: row.is_available,
    sort_order: row.sort_order,
    sku: row.sku,
    gluten_free: row.gluten_free,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

@Injectable()
export class PostgreProductRepository implements IProductRepository{

    constructor(
        @InjectRepository(ProductOrmEntity)
        private readonly productDb: Repository<ProductOrmEntity>
    ){}

    async findAll(tenantId: string, filters: ProductFilters): Promise<Product[]> {
        const rows = await this.productDb.find({
            where: {
                tenant_id: tenantId,
                store_id: filters.store_id,
                ...(filters.category_id !== undefined && { category_id: filters.category_id }),
                ...(filters.is_available !== undefined && { is_available: filters.is_available }),
            },
            order: { sort_order: 'ASC', name: 'ASC' },
        });
        return rows.map(toProduct);
    }

    async findOne(tenantId: string, productId: string): Promise<Product | null> {
        const row = await this.productDb.findOne({ where: { product_id: productId, tenant_id: tenantId } });
        return row ? toProduct(row) : null;
    }

    // Inner join: categories without available products do not appear.
    findCatalog(tenantId: string, storeId: string): Promise<CatalogLine[]> {
        return this.productDb.manager.query(
            `SELECT c.category_id, c.name AS category_name, p.product_id, p.name, p.description, p.price, p.image_path, p.gluten_free
             FROM products p JOIN categories c ON c.category_id = p.category_id AND c.tenant_id = p.tenant_id
             WHERE p.tenant_id = $1 AND p.store_id = $2 AND p.is_available = true
             ORDER BY c.sort_order, c.name, c.category_id, p.sort_order, p.name, p.product_id`,
            [tenantId, storeId],
        );
    }

    countByStore(tenantId: string, storeId: string): Promise<number> {
        return this.productDb.count({ where: { tenant_id: tenantId, store_id: storeId } });
    }

    async isCategoryOfStore(tenantId: string, categoryId: string, storeId: string): Promise<boolean> {
        const rows = await this.productDb.manager.query(
            'SELECT 1 FROM categories WHERE category_id = $1 AND tenant_id = $2 AND store_id = $3 LIMIT 1',
            [categoryId, tenantId, storeId],
        );
        return rows.length > 0;
    }

    async skuTaken(tenantId: string, sku: string, exceptProductId?: string): Promise<boolean> {
        const rows = await this.productDb.manager.query(
            'SELECT 1 FROM products WHERE tenant_id = $1 AND lower(sku) = lower($2) AND ($3::uuid IS NULL OR product_id <> $3) LIMIT 1',
            [tenantId, sku, exceptProductId ?? null],
        );
        return rows.length > 0;
    }

    async create(tenantId: string, data: CreateProductData): Promise<Product> {
        const saved = await this.productDb.save(this.productDb.create({ ...data, tenant_id: tenantId })).catch(this.mapSkuConflict);
        // Reload so price comes back as NUMERIC(12,2) text ("1500" -> "1500.00").
        return (await this.findOne(tenantId, saved.product_id))!;
    }

    async update(tenantId: string, productId: string, data: UpdateProductData): Promise<Product | null> {
        // TypeORM binds undefined keys as NULL; drop them. null (e.g. description) is kept.
        const changes = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
        const result = await this.productDb.update({ product_id: productId, tenant_id: tenantId }, changes).catch(this.mapSkuConflict);
        if (result.affected === 0) {
            return null;
        }
        return this.findOne(tenantId, productId);
    }

    // Red de seguridad ante una carrera: el indice unico de sku es la garantia final.
    private mapSkuConflict(error: unknown): never {
        throw pgCode(error) === UNIQUE_VIOLATION ? skuAlreadyExists() : error;
    }

    async delete(tenantId: string, productId: string): Promise<Product | null> {
        const product = await this.findOne(tenantId, productId);
        if (!product) {
            return null;
        }
        const result = await this.productDb.delete({ product_id: productId, tenant_id: tenantId });
        return result.affected === 0 ? null : product;
    }
}
