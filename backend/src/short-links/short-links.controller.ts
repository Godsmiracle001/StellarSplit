import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  Optional,
} from "@nestjs/common";
import { Request } from "express";
import { ShortLinksService } from "./short-links.service";
import { GenerateLinkDto } from "./dto/generate-link.dto";
import { NfcPayloadService } from "./nfc-payload.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/types/auth-user.interface";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ShortLinkUrlBuilder } from "./short-link-url.builder";

@Controller("short-links")
export class ShortLinksController {
  constructor(
    private readonly service: ShortLinksService,
    private readonly nfcService: NfcPayloadService,
    private readonly urlBuilder: ShortLinkUrlBuilder,
  ) {}

  /**
   * Generate a short link for a split (requires authentication)
   */
  @Post("generate")
  @UseGuards(JwtAuthGuard)
  generate(@Body() dto: GenerateLinkDto, @CurrentUser() user: AuthUser) {
    return this.service.generate(dto, user.walletAddress);
  }

  /**
   * Resolve a short link and log access
   * Authentication is optional - tracking may collect optional user ID
   */
  @Get(":shortCode/resolve")
  resolve(
    @Param("shortCode") code: string,
    @Req() req: any,
    @Optional() @CurrentUser() user?: AuthUser,
  ) {
    return this.service.resolve(
      code,
      req.ip ?? "",
      Array.isArray(req.headers["user-agent"])
        ? (req.headers["user-agent"][0] ?? "")
        : (req.headers["user-agent"] ?? ""),
      user?.id,
    );
  }

  /**
   * View analytics for a short link (requires authentication and split ownership)
   */
  @Get(":shortCode/analytics")
  @UseGuards(JwtAuthGuard)
  analytics(@Param("shortCode") code: string, @CurrentUser() user: AuthUser) {
    return this.service.analytics(code, user.walletAddress);
  }

  /**
   * Generate NFC payload for a split (requires authentication and split access)
   */
  @Post("nfc-payload/:splitId")
  @UseGuards(JwtAuthGuard)
  async generateNfc(@Param("splitId") splitId: string, @CurrentUser() user: AuthUser) {
    await this.service.validateNfcAccess(user.walletAddress, splitId);
    const url = this.urlBuilder.buildNfcUrl(splitId);
    return this.nfcService.generateNdefPayload(url, splitId, user.walletAddress);
  }

  /**
   * Delete a short link (requires authentication and split ownership)
   */
  @Delete(":shortCode")
  @UseGuards(JwtAuthGuard)
  remove(@Param("shortCode") code: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(code, user.walletAddress);
  }
}
