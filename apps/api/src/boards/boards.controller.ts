import { Body, Controller, Delete, Get, Headers, HttpStatus, Param, Patch, Post, Query, Res, BadRequestException, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { ScopeRole } from '../auth/scope-role.decorator';

@Controller('boards')
export class BoardsController {
    constructor(private readonly boards: BoardsService) {}

    @Get()
    findMany(@Query('workspaceId') workspaceId: string) {
        return this.boards.findMany(workspaceId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.boards.findOne(id);
    }

    @Get(':id/full')
    async getBoardFull(@Param('id') id: string, @Res() res: Response) {
        try {
            const data = await this.boards.getBoardFull(id);
            return res.status(HttpStatus.OK).json(data);
        } catch (e: any) {
            if (e instanceof NotFoundException || e?.status === 404) {
                return res.status(HttpStatus.OK).json({ deleted: true });
            }
            throw e;
        }
    }

    @Post()
    @ScopeRole('workspace', 'MEMBER')
    create(
        @Body() body: any,
        @Query('workspaceId') qWs?: string,
        @Headers('x-workspace-id') hWs?: string,
    ) {
        const name = (body?.name ?? body?.title)?.toString()?.trim();
        const workspaceId = (body?.workspaceId ?? qWs ?? hWs ?? process.env.DEFAULT_WORKSPACE_ID)?.toString();
        if (!name) throw new BadRequestException('name is required');
        if (!workspaceId) throw new BadRequestException('workspaceId is required');
        const dto: CreateBoardDto = { name, workspaceId };
        return this.boards.create(dto);
    }

    @Patch(':id')
    @ScopeRole('board', 'MEMBER')
    update(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
        return this.boards.update(id, dto);
    }

    @Delete(':id')
    @ScopeRole('board', 'ADMIN')
    async deleteBoard(
        @Param('id') id: string,
        @Query('cascade') cascadeQ: string | undefined,
        @Res() res: Response,
    ): Promise<void> {
        const allowCascade = ['true', '1', 'yes', 'on'].includes(String(cascadeQ ?? '').toLowerCase());
        await this.boards.deleteBoard(id, allowCascade);
        res.status(HttpStatus.NO_CONTENT).send();
    }
}
