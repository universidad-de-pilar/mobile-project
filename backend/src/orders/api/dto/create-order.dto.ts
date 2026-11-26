import { Type } from "class-transformer";
import {
    ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested,
} from "class-validator";

export class OrderItemDto {
    @IsUUID()
    product_id: string;

    @IsInt()
    @Min(1)
    @Max(50)
    quantity: number;
}

// Prices or totals sent by the client are dropped by the global ValidationPipe (whitelist).
export class CreateOrderDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(50)
    @ArrayUnique((item: OrderItemDto) => item.product_id)
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsOptional()
    @IsString()
    @MaxLength(50)
    customer_name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    note?: string;

    @IsOptional()
    @IsUUID()
    source_screen_id?: string;
}
