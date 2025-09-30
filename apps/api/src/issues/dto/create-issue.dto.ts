import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsCuid } from '../../common/validators/is-cuid.validator';

export enum IssueStatus {
    TODO = 'todo',
    DOING = 'doing',
    DONE = 'done',
}

export class CreateIssueDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsCuid()
    workspaceId!: string;

    @IsString()
    @IsCuid()
    @IsOptional()
    columnId?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsCuid()
    @IsOptional()
    assigneeId?: string;

    @IsEnum(IssueStatus)
    @IsOptional()
    status?: IssueStatus;

    @IsDateString()
    @IsOptional()
    dueAt?: string;
}
