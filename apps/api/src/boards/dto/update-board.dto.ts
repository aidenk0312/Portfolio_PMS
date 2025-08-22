import { PartialType } from '@nestjs/mapped-types';
import { CreateBoardDto } from './create-board.dto';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateBoardDto extends PartialType(CreateBoardDto) {
    @IsOptional()
    @IsInt()
    @Min(0)
    order?: number;
}