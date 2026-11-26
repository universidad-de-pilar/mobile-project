import { Injectable } from "@nestjs/common";
import { IPasswordHasher } from "../application/ports/password-hasher";
import * as bcrypt from 'bcrypt';

@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher{
    private readonly saltRounds = 12;
    hash(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }
    compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}