import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({name: 'products'})
export class ProductOrmEntity {
    @PrimaryGeneratedColumn('uuid', {name: 'product_id'})
    product_id: string;

    @Column({type: 'uuid'})
    tenant_id: string;

    @Column({type: 'uuid'})
    store_id: string;

    @Column({type: 'uuid'})
    category_id: string;

    @Column({type: 'varchar', length: 80})
    name: string;

    @Column({type: 'varchar', length: 500, nullable: true})
    description: string | null;

    @Column({type: 'numeric', precision: 12, scale: 2})
    price: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    image_path: string | null;

    @Column({type: 'boolean', default: true})
    is_available: boolean;

    @Column({type: 'varchar', length: 64, nullable: true})
    sku: string | null;

    @Column({type: 'boolean', default: false})
    gluten_free: boolean;

    @Column({type: 'int', default: 0})
    sort_order: number;

    @CreateDateColumn({type: 'timestamptz', name: 'created_at'})
    created_at: Date;

    @UpdateDateColumn({type: 'timestamptz', name: 'updated_at'})
    updated_at: Date;
}
