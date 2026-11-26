import { Inject, Injectable } from "@nestjs/common";
import { CreateUserData, IUserRepository, ResponseUserData, ResponseUserDataWithPass } from "../domain/user.repository";
import { User } from "../domain/user.entity";
import { Repository } from "typeorm";
import { UserOrmEntity } from "./user.orm-entity";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class PostgreUserRepository implements IUserRepository{

    constructor(
        @InjectRepository(UserOrmEntity)
        private readonly userDb: Repository<UserOrmEntity>
    ){}
    async create(user: CreateUserData): Promise<ResponseUserData> {
        const entity = this.userDb.create(user);
        const saved = await this.userDb.save(entity);
        return {
            user_id: saved.user_id,
            email: saved.email,
            first_name: saved.first_name,
            last_name: saved.last_name,
            created_at: saved.created_at.toISOString()
        }
    }
    async createRoot(user: CreateUserData): Promise<ResponseUserData | null> {
        return this.userDb.manager.transaction(async (tx) => {
            // Serializes concurrent first registrations: the second one waits and then sees the root.
            await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['mostrador.first-root']);
            const existing = await tx.query(
                "SELECT 1 FROM users_roles ur JOIN roles r ON r.role_id = ur.role_id WHERE r.name = 'root' LIMIT 1",
            );
            if (existing.length > 0) return null;

            const saved = await tx.save(tx.create(UserOrmEntity, user));
            const granted = await tx.query(
                "INSERT INTO users_roles (user_id, role_id) SELECT $1, role_id FROM roles WHERE name = 'root' RETURNING role_id",
                [saved.user_id],
            );
            if (granted.length === 0) throw new Error("Role 'root' is missing; run db:apply");
            return {
                user_id: saved.user_id,
                email: saved.email,
                first_name: saved.first_name,
                last_name: saved.last_name,
                created_at: saved.created_at.toISOString()
            };
        });
    }
    update(users: User): Promise<ResponseUserData> {
        throw new Error("Method not implemented.");
    }
    delete(id: string): boolean {
        throw new Error("Method not implemented.");
    }
    getAll(): Promise<User[]> {
        throw new Error("Method not implemented.");
    }
    async getById(id:string): Promise<ResponseUserData | null> {
        const user = await this.userDb.findOne({ where: {user_id: id} });
        if (!user) {
            return null;
        }
        return {
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            created_at: user.created_at.toISOString()
        }
    }
    async getByEmail(email:string): Promise<ResponseUserData | null> {
        const user = await this.userDb.findOne({
            where: {email}
        })
        if (!user) {
            return null;
        }
        return {
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            created_at: user.created_at.toISOString()
        }
    }

    async getByEmailWithPassword(email:string): Promise<ResponseUserDataWithPass | null>{
        const user = await this.userDb.findOne({
            where: {email}
        })
        if (!user) {
            return null;
        }
        return {
            user_id: user.user_id,
            email: user.email,
            password_hash: user.password_hash,
            first_name: user.first_name,
            last_name: user.last_name,
            created_at: user.created_at.toISOString(),
            is_active: user.is_active
        }
    }
    
} 