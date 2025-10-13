import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateColumnDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    boardId!: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    order?: number;
}
