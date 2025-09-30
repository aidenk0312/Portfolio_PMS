import { IsInt, IsOptional, IsString } from 'class-validator';
import { IsCuid } from '../../common/validators/is-cuid.validator';

export class UpdateBoardDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsCuid()
    @IsOptional()
    workspaceId?: string;

    @IsInt()
    @IsOptional()
    order?: number;
}
