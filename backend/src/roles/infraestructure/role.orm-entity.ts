import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({name: 'roles'})
export class RoleOrmEntity {
    @PrimaryGeneratedColumn('uuid', {name: 'role_id'})
    role_id: string;

    @Column({type: 'varchar', length: 50, unique: true})
    name: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    description: string | null;

    @CreateDateColumn({type: 'timestamptz', name: 'created_at'})
    created_at: Date;
}
