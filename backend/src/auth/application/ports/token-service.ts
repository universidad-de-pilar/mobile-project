export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface ITokenService {
    sign(payload: {sub:string;email:string}): Promise<string>;
}