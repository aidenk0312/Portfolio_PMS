import { Controller, Get, Query, Param, Post, Body, Patch, Delete } from '@nestjs/common';
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

    @Post()
    create(@Body() dto: CreateBoardDto) {
        return this.boards.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
        return this.boards.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.boards.remove(id);
    }
}