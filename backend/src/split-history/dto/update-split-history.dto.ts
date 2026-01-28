import { PartialType } from '@nestjs/mapped-types';
import { CreateSplitHistoryDto } from './create-split-history.dto';

export class UpdateSplitHistoryDto extends PartialType(CreateSplitHistoryDto) {}
