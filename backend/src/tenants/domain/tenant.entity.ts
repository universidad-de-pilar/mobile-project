export class Tenant {
    constructor(
        public readonly tenant_id:string,
        public readonly name: string,
        public readonly slug: string,
        public readonly is_active:boolean,
    ){}
}