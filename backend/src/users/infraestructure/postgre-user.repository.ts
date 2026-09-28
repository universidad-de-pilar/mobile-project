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
    update(users: User): Promise<ResponseUserData> {
        throw new Error("Method not implemented.");
    }
    delete(id: string): boolean {
        throw new Error("Method not implemented.");
    }
    getAll(): Promise<User[]> {
        throw new Error("Method not implemented.");
    }
    getById(id:string): Promise<User> {
        throw new Error("Method not implemented.");
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