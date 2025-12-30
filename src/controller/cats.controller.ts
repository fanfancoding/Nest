import { Controller, Get, Req, Query, Param, Post, Body } from '@nestjs/common';
@Controller('cats')
export class CatsController {
  @Get('query')
  findAllQuery(@Query() query: { age: number }): string {
    const age = query.age;
    return `Looking for cats with age: ${age}`;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return `This action returns cat with ID: ${id}`;
  }

  @Post()
  create(@Body() createCatDto: any) {
    return `Created a cat named ${createCatDto.name}`;
  }
}
