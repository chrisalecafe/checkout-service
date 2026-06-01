import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutItemDto {
  @ApiProperty({ example: 'Widget A', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 49.99, description: 'Unit price in dollars' })
  @IsNumber()
  @IsPositive()
  unit_price!: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CheckoutRequestDto {
  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];
}

export class CheckoutResponseDto {
  @ApiProperty({ example: 99.98 })
  subtotal!: number;

  @ApiProperty({ example: 13.0 })
  taxes!: number;

  @ApiProperty({ example: 0 })
  discount!: number;

  @ApiProperty({ example: 112.98 })
  total!: number;
}
