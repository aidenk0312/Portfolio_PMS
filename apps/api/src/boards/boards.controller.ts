import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

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
    getBoardFull(@Param('id') id: string) {
        return this.boards.getBoardFull(id);
    }

    @Post()
    create(@Body() dto: CreateBoardDto) {
        return this.boards.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
        return this.boards.update(id, dto);
    }

    @Delete(':id')
    async deleteBoard(@Param('id') id: string, @Query('cascade') cascade: string | undefined, @Res() res: Response): Promise<void> {
        await this.boards.deleteBoard(id, cascade === 'true');
        res.status(HttpStatus.NO_CONTENT).send();
    }
}
