import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({name: 'permissions'})
export class PermissionOrmEntity {
    @PrimaryGeneratedColumn('uuid', {name: 'permission_id'})
    permission_id: string;

    @Column({type: 'varchar', length: 100, unique: true})
    code: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    description: string | null;

    @CreateDateColumn({type: 'timestamptz', name: 'created_at'})
    created_at: Date;
}
