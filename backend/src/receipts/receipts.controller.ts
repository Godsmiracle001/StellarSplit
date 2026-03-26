import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import {
  Permissions,
  RequirePermissions,
} from "../auth/decorators/permissions.decorator";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ReceiptsService } from "./receipts.service";

interface AuthRequest extends Request {
  user: { walletAddress: string };
}

@Controller("api/receipts")
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class ReceiptsController {
  constructor(private readonly service: ReceiptsService) {}

  @Post("upload/:splitId")
  @UseInterceptors(FileInterceptor("file"))
  @RequirePermissions(Permissions.CAN_CREATE_RECEIPT)
  async upload(
    @Param("splitId") splitId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    return this.service.uploadWithOcr(splitId, file, req.user.walletAddress);
  }

  @Post("upload-standalone")
  @UseInterceptors(FileInterceptor("file"))
  async uploadStandalone(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    return this.service.uploadStandalone(file, req.user.walletAddress);
  }

  @Get("split/:splitId")
  @RequirePermissions(Permissions.CAN_READ_RECEIPT)
  async listBySplit(@Param("splitId") splitId: string) {
    return this.service.listBySplit(splitId);
  }

  @Get(":receiptId/signed-url")
  @RequirePermissions(Permissions.CAN_READ_RECEIPT)
  async signedUrl(@Param("receiptId") receiptId: string) {
    return this.service.getSignedUrl(receiptId);
  }

  @Delete(":receiptId")
  @RequirePermissions(Permissions.CAN_DELETE_RECEIPT)
  async delete(@Param("receiptId") receiptId: string) {
    return this.service.softDelete(receiptId);
  }

  @Get(":receiptId/ocr-data")
  @RequirePermissions(Permissions.CAN_READ_RECEIPT)
  async ocrData(@Param("receiptId") receiptId: string) {
    return this.service.getOcrData(receiptId);
  }

  @Post(":receiptId/reprocess-ocr")
  @RequirePermissions(Permissions.CAN_READ_RECEIPT)
  async reprocessOcr(@Param("receiptId") receiptId: string) {
    return this.service.reprocessOcr(receiptId);
  }
}
