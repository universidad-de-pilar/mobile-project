import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({name: 'users'})
export class UserOrmEntity {
    @PrimaryGeneratedColumn('uuid', {name: 'user_id'})
    user_id: string;

    @Column({type: 'varchar', length: 320, unique:true})
    email:string;

    @Column({type: 'varchar', name: 'password_hash'})
    password_hash: string;

    @Column({ type: 'varchar', name: 'first_name' })
    first_name: string;

    @Column({ type: 'varchar', name: 'last_name' })
    last_name: string;

    @Column({type: 'boolean', default:true, name:'is_active'})
    is_active:boolean;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updated_at: Date;
 
}