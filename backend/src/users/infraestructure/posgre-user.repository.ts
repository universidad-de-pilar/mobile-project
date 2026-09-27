import { Injectable } from "@nestjs/common";
import { CreateUserData, IUserRepository } from "../domain/user.repository";
import { User } from "../domain/user.entity";

@Injectable()
export class PostgreUserRepository implements IUserRepository{
    async create(users: CreateUserData): Promise<User> {
        throw new Error("Method not implemented.");
    }
    update(users: User): Promise<User> {
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
    getByEmail(email:string): Promise<User> {
        throw new Error("Method not implemented.");
    }
    
} 