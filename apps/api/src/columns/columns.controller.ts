import { Controller, Get, Query, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Controller('columns')
export class ColumnsController {
    constructor(private readonly columns: ColumnsService) {}

    // GET /columns?boardId=xxx
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
    remove(@Param('id') id: string) {
        return this.columns.remove(id);
    }
}