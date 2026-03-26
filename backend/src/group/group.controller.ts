import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  Permissions,
  RequirePermissions,
} from "../auth/decorators/permissions.decorator";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GroupService } from "./group.service";

@Controller("groups")
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @RequirePermissions(Permissions.CAN_CREATE_GROUP)
  create(@Body() body: any, @Req() req: any) {
    return this.groupService.createGroup(body, req.user.walletAddress);
  }

  @Patch(":id/add-member")
  @RequirePermissions(Permissions.CAN_ADD_GROUP_MEMBER)
  addMember(
    @Param("id") id: string,
    @Body("wallet") wallet: string,
    @Body("role") role: string,
    @Req() req: any,
  ) {
    return this.groupService.addMember(id, wallet, req.user.walletAddress);
  }

  @Patch(":id/remove-member")
  @RequirePermissions(Permissions.CAN_REMOVE_GROUP_MEMBER)
  removeMember(
    @Param("id") id: string,
    @Body("wallet") wallet: string,
    @Req() req: any,
  ) {
    return this.groupService.removeMember(id, wallet, req.user.walletAddress);
  }

  @Post(":id/split")
  @RequirePermissions(Permissions.CAN_CREATE_GROUP_SPLIT)
  createSplit(@Param("id") id: string, @Req() req: any) {
    return this.groupService.createSplitFromGroup(id, req.user.walletAddress);
  }

  @Get(":id/activity")
  @RequirePermissions(Permissions.CAN_READ_GROUP)
  activity(@Param("id") id: string) {
    return this.groupService.getActivity(id);
  }
}
