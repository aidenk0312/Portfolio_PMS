import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import { IsCuid } from '../../common/validators/is-cuid.validator';

export class ReorderColumnsDto {
    @IsString()
    @IsCuid()
    boardId!: string;

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    columnIds!: string[];
}
