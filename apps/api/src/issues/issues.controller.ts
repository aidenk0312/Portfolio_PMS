import { Controller, Get, Query, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Controller('issues')
export class IssuesController {
    constructor(private readonly issues: IssuesService) {}

    @Get()
    findMany(@Query('workspaceId') workspaceId?: string, @Query('columnId') columnId?: string) {
        return this.issues.findMany({ workspaceId, columnId });
    }

    @Post()
    create(@Body() dto: CreateIssueDto) {
        return this.issues.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateIssueDto) {
        return this.issues.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.issues.remove(id);
    }
}