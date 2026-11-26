import { Category } from "./category.entity";

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY')

export interface CreateCategoryData {
    store_id: string;
    name: string;
    sort_order: number;
}

export interface UpdateCategoryData {
    name?: string;
    sort_order?: number;
}

// create/update throw CategoryNameTakenError; delete throws CategoryHasProductsError.
export interface ICategoryRepository{
    findAll(tenantId:string, storeId:string):Promise<Category[]>;
    create(tenantId:string, data:CreateCategoryData):Promise<Category>;
    update(tenantId:string, categoryId:string, data:UpdateCategoryData):Promise<Category | null>;
    delete(tenantId:string, categoryId:string):Promise<boolean>;
}
