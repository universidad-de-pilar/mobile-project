export class User {
    constructor(
        public readonly user_id:string,
        public readonly email: string,
        private readonly password_hash: string,
        public readonly first_name:string,
        public readonly last_name:string,
        public readonly is_active:boolean,
        public readonly created_at:Date,
        public readonly updated_at:Date
    ){}

    getPasswordHash(): string{
        return this.password_hash;
    }

    getFullName(): string {
        return `${this.first_name} ${this.last_name}`;
    }
}