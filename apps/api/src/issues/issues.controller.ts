import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
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
    async remove(@Param('id') id: string, @Res() res: Response): Promise<void> {
        await this.issues.remove(id);
        res.status(HttpStatus.NO_CONTENT).send();
    }
}
