import { IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateIssueDto {
    @IsString()
    @MinLength(1)
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    assigneeId?: string;

    @IsString()
    @MinLength(1)
    workspaceId!: string;

    @IsOptional()
    @IsString()
    columnId?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsISO8601()
    dueAt?: string;
}