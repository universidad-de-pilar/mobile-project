export class Permission {
    constructor(
        public readonly permission_id: string,
        public readonly code: string,
        public readonly description: string | null,
    ){}
}
