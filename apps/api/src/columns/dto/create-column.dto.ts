import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsCuid } from '../../common/validators/is-cuid.validator';

export class CreateColumnDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsCuid()
    boardId!: string;

    @IsInt()
    @IsOptional()
    order?: number;
}
