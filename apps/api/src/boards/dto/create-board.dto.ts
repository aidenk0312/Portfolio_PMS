import { IsNotEmpty, IsString } from 'class-validator';
import { IsCuid } from '../../common/validators/is-cuid.validator';

export class CreateBoardDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    @IsCuid()
    workspaceId!: string;
}
