import { IsString, MinLength } from 'class-validator';

export class CreateBoardDto {
    @IsString()
    @MinLength(1)
    name!: string;

    @IsString()
    @MinLength(1)
    workspaceId!: string;
}