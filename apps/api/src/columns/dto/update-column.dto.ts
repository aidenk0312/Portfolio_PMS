import { PartialType } from '@nestjs/mapped-types';
import { CreateColumnDto } from './create-column.dto';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateColumnDto extends PartialType(CreateColumnDto) {
    @IsOptional()
    @IsInt()
    @Min(0)
    order?: number;
}