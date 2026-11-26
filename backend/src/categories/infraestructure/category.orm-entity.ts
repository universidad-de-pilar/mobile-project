import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({name: 'categories'})
export class CategoryOrmEntity {
    @PrimaryGeneratedColumn('uuid', {name: 'category_id'})
    category_id: string;

    @Column({type: 'uuid'})
    tenant_id: string;

    @Column({type: 'uuid'})
    store_id: string;

    @Column({type: 'varchar', length: 80})
    name: string;

    @Column({type: 'int', default: 0})
    sort_order: number;

    @CreateDateColumn({type: 'timestamptz', name: 'created_at'})
    created_at: Date;

    @UpdateDateColumn({type: 'timestamptz', name: 'updated_at'})
    updated_at: Date;
}
