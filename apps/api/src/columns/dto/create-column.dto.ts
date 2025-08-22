import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateColumnDto {
    @IsString()
    @MinLength(1)
    name!: string;

    @IsString()
    @MinLength(1)
    boardId!: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    order?: number;
}