import { User } from "./user.entity";

export const USER_REPOSITORY = Symbol('USER_REPOSITORY')

export interface CreateUserData {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
}

export interface ResponseUserData {
    user_id:string;
    email: string;
    first_name: string;
    last_name: string;
    created_at:string;
}

export interface ResponseUserDataWithPass extends ResponseUserData {
    password_hash: string;
    is_active:boolean;
}

export interface IUserRepository{
    create(users:CreateUserData):Promise<ResponseUserData>;
    update(users:User):Promise<ResponseUserData>;
    delete(id:string):boolean;
    getAll():Promise<User[]>;
    getById(id:string):Promise<User>;
    getByEmail(email:string):Promise<ResponseUserData | null>;
    getByEmailWithPassword(email:string):Promise<ResponseUserDataWithPass | null>;
}
