import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({name: 'tenants'})
export class TenantOrmEntity {
    @PrimaryGeneratedColumn('uuid', {name: 'tenant_id'})
    tenant_id: string;

    @Column({type: 'varchar', length: 150})
    name:string;

    @Column({type: 'varchar', length: 30, unique: true})
    slug:string;

    @Column({type: 'integer', default: 0, name: 'last_order_number'})
    last_order_number:number;

    @Column({type: 'boolean', default:true, name:'is_active'})
    is_active:boolean;
}