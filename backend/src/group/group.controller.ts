import { Controller, Post, Body, Param, Get, Req, Patch } from '@nestjs/common';
import { GroupService } from './group.service';

@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  create(@Body() body: any, @Req() req:any) {
    return this.groupService.createGroup(body, req.user.walletAddress);
  }

  @Patch(':id/add-member')
  addMember(@Param('id') id: string, @Body('wallet') wallet :string, @Body('role') role :string, @Req() req:any) {
    return this.groupService.addMember(id, wallet, req.user.walletAddress);
  }

  @Patch(':id/remove-member')
  removeMember(@Param('id') id: string, @Body('wallet') wallet:string, @Req() req:any) {
    return this.groupService.removeMember(id, wallet, req.user.walletAddress);
  }

  @Post(':id/split')
  createSplit(@Param('id') id: string, @Req() req:any) {
    return this.groupService.createSplitFromGroup(
      id,
      req.user.walletAddress,
    );
  }

  @Get(':id/activity')
  activity(@Param('id') id: string) {
    return this.groupService.getActivity(id);
  }
}
