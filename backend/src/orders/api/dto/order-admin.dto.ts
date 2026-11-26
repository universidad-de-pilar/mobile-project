import { Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from "class-validator";
import { ORDER_STATUSES, type OrderStatus } from "../../domain/order-status";

export class ListOrdersQueryDto {
    @IsUUID()
    store_id: string;

    @IsOptional()
    @IsIn(ORDER_STATUSES)
    status?: OrderStatus;

    @IsOptional()
    @IsISO8601()
    from?: string;

    @IsOptional()
    @IsISO8601()
    to?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}

export class ChangeOrderStatusDto {
    @IsIn(ORDER_STATUSES)
    status: OrderStatus;
}
