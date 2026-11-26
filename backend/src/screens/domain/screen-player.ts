import { randomBytes } from "crypto";
import { webOrigin } from "src/tenants/domain/web-origin";
import { ScreenRow } from "./screen.repository";

// 32 random bytes as base64url: 43 chars, 256 bits.
export const generateScreenToken = () => randomBytes(32).toString('base64url');

export const withPlayerUrl = (slug: string, screen: ScreenRow) =>
    ({ ...screen, player_url: `${webOrigin(slug)}/screen/${screen.token}` });
