import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res, BadRequestException, Headers } from '@nestjs/common';
import type { Response } from 'express';
import { IssuesService } from './issues.service';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { ScopeRole } from '../auth/scope-role.decorator';

@Controller('issues')
export class IssuesController {
    constructor(private readonly issues: IssuesService) {}

    @Get()
    findMany(@Query('workspaceId') workspaceId?: string, @Query('columnId') columnId?: string) {
        return this.issues.findMany({ workspaceId, columnId });
    }

    @Post()
    @ScopeRole('workspace', 'MEMBER')
    create(
        @Body() body: any,
        @Query('workspaceId') qWs?: string,
        @Headers('x-workspace-id') hWs?: string,
    ) {
        const title = (body?.title ?? body?.name)?.toString()?.trim();
        const columnId = body?.columnId?.toString();
        const workspaceId = (body?.workspaceId ?? qWs ?? hWs ?? process.env.DEFAULT_WORKSPACE_ID)?.toString();
        if (!title) throw new BadRequestException('title is required');
        if (!columnId) throw new BadRequestException('columnId is required');
        if (!workspaceId) throw new BadRequestException('workspaceId is required');
        return this.issues.create({
            title,
            columnId,
            workspaceId,
            description: body?.description ?? '',
        });
    }

    @Patch(':id')
    @ScopeRole('board', 'MEMBER')
    update(@Param('id') id: string, @Body() dto: UpdateIssueDto) {
        return this.issues.update(id, dto);
    }

    @Delete(':id')
    @ScopeRole('board', 'MEMBER')
    async remove(@Param('id') id: string, @Res() res: Response): Promise<void> {
        await this.issues.remove(id);
        res.status(HttpStatus.NO_CONTENT).send();
    }
}
