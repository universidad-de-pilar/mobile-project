export class Role {
    constructor(
        public readonly role_id: string,
        public readonly name: string,
        public readonly description: string | null,
    ){}
}
