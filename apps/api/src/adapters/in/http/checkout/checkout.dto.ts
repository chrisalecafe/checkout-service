import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CheckoutItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsPositive()
  unit_price: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CheckoutRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}
