import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateColumnDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsInt()
    @IsOptional()
    order?: number;
}
