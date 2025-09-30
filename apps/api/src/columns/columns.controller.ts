import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { ReorderColumnsDto } from './dto/reorder-columns.dto';
import { ReorderIssuesInColumnDto } from './dto/reorder-issues-in-column.dto';

@Controller('columns')
export class ColumnsController {
    constructor(private readonly columns: ColumnsService) {}

    @Get()
    findMany(@Query('boardId') boardId: string) {
        return this.columns.findMany(boardId);
    }

    @Post()
    create(@Body() dto: CreateColumnDto) {
        return this.columns.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateColumnDto) {
        return this.columns.update(id, dto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Res() res: Response): Promise<void> {
        await this.columns.remove(id);
        res.status(HttpStatus.NO_CONTENT).send();
    }

    @Post(':id/reorder')
    reorder(@Param('id') columnId: string, @Body() dto: ReorderIssuesInColumnDto) {
        return this.columns.reorder(columnId, dto);
    }

    @Post('/reorder')
    reorderColumns(@Body() dto: ReorderColumnsDto) {
        return this.columns.reorderColumns(dto.boardId, dto.columnIds);
    }
}
