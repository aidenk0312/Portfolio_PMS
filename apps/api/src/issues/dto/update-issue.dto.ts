import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { IsCuid } from '../../common/validators/is-cuid.validator';
import { IssueStatus } from './create-issue.dto';

export class UpdateIssueDto {
    @IsString()
    @IsOptional()
    title?: string;

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

    @IsString()
    @IsCuid()
    @IsOptional()
    workspaceId?: string;

    @IsString()
    @IsCuid()
    @IsOptional()
    columnId?: string;
}
