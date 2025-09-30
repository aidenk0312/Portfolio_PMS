import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderIssuesInColumnDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    issueIds!: string[];
}
