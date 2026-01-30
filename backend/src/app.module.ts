import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import * as dotenv from "dotenv";
import * as path from "path";
import databaseConfig from "./config/database.config";
import appConfig from "./config/app.config";
import { HealthModule } from "./modules/health/health.module";
import { StellarModule } from "./stellar/stellar.module";
import { PaymentsModule } from "./payments/payments.module";
import { CurrencyModule } from "./modules/currency/currency.module";
import { SplitsModule } from "./modules/splits/splits.module";
import { ItemsModule } from "./modules/items/items.module";
import { EmailModule } from "./email/email.module";
import { RecurringSplitsModule } from "./recurring-splits/recurring-splits.module";
import { ReceiptsModule } from "./receipts/receipts.module";
import { SplitHistoryModule } from "./split-history/split-history.module";
import { ActivitiesModule } from "./modules/activities/activities.module";
import { SearchModule } from "./search/search.module";
import { AnalyticsModule } from "./analytics/analytics.module";
// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
      load: [appConfig, databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get("database");
        return {
          type: "postgres",
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.name,
          entities: [path.join(__dirname, "**/*.entity{.ts,.js}")],
          synchronize: dbConfig.synchronize,
          logging: dbConfig.logging,
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get("REDIS_HOST", "localhost"),
          port: configService.get("REDIS_PORT", 6379),
        },
      }),
    }),
    HealthModule,
    StellarModule,
    PaymentsModule,
    CurrencyModule,
    SplitsModule,
    ItemsModule,
    EmailModule,
    RecurringSplitsModule,
    ReceiptsModule,
    SplitHistoryModule,
    ActivitiesModule,
    SearchModule,
    // Analytics module for user spending & reports
    AnalyticsModule,
  ],
})
export class AppModule {}
