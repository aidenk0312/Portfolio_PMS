import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Controller('columns')
export class ColumnsController {
    constructor(private readonly columnsService: ColumnsService) {}

    @Get()
    findMany(@Query('boardId') boardId: string) {
        return this.columnsService.findMany(boardId);
    }

    @Post()
    create(@Body() dto: CreateColumnDto) {
        return this.columnsService.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateColumnDto) {
        return this.columnsService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.columnsService.remove(id);
    }

    @Post(':id/reorder')
    reorder(@Param('id') id: string, @Body() body: { issueIds: string[] }) {
        return this.columnsService.reorder(id, body);
    }
}
