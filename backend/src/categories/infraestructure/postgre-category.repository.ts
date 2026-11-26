import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCategoryData, ICategoryRepository, UpdateCategoryData } from "../domain/category.repository";
import { Category } from "../domain/category.entity";
import { CategoryHasProductsError, CategoryNameTakenError } from "../domain/category.errors";
import { CategoryOrmEntity } from "./category.orm-entity";

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

const toCategory = (row: CategoryOrmEntity): Category => ({
    category_id: row.category_id,
    store_id: row.store_id,
    name: row.name,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

const pgCode = (error: any): string | undefined => error?.driverError?.code ?? error?.code;

@Injectable()
export class PostgreCategoryRepository implements ICategoryRepository{

    constructor(
        @InjectRepository(CategoryOrmEntity)
        private readonly categoryDb: Repository<CategoryOrmEntity>
    ){}

    async findAll(tenantId: string, storeId: string): Promise<Category[]> {
        const rows = await this.categoryDb.find({
            where: { tenant_id: tenantId, store_id: storeId },
            order: { sort_order: 'ASC', name: 'ASC' },
        });
        return rows.map(toCategory);
    }

    async create(tenantId: string, data: CreateCategoryData): Promise<Category> {
        try {
            const saved = await this.categoryDb.save(this.categoryDb.create({ ...data, tenant_id: tenantId }));
            return toCategory(saved);
        } catch (error) {
            throw this.mapNameConflict(error);
        }
    }

    async update(tenantId: string, categoryId: string, data: UpdateCategoryData): Promise<Category | null> {
        const where = { category_id: categoryId, tenant_id: tenantId };
        // TypeORM binds undefined keys as NULL; drop them so a partial PATCH keeps the other columns.
        const changes = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
        if (Object.keys(changes).length > 0) {
            try {
                const result = await this.categoryDb.update(where, changes);
                if (result.affected === 0) {
                    return null;
                }
            } catch (error) {
                throw this.mapNameConflict(error);
            }
        }
        const row = await this.categoryDb.findOne({ where });
        return row ? toCategory(row) : null;
    }

    async delete(tenantId: string, categoryId: string): Promise<boolean> {
        try {
            const result = await this.categoryDb.delete({ category_id: categoryId, tenant_id: tenantId });
            return result.affected !== 0;
        } catch (error) {
            throw pgCode(error) === FOREIGN_KEY_VIOLATION ? new CategoryHasProductsError() : error;
        }
    }

    private mapNameConflict(error: unknown) {
        return pgCode(error) === UNIQUE_VIOLATION ? new CategoryNameTakenError() : error;
    }
}
