import { Injectable, Logger } from "@nestjs/common";
import { createWorker, Worker } from "tesseract.js";
import sharp from "sharp";
import { ReceiptParser, ParsedReceipt } from "./parsers/receipt-parser";

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private worker: Worker | null = null;
  private isInitialized = false;

  constructor(private readonly receiptParser: ReceiptParser) {}

  /**
   * Initialize Tesseract worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      this.logger.log("Initializing Tesseract.js worker...");
      this.worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            this.logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      this.isInitialized = true;
      this.logger.log("Tesseract.js worker initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize Tesseract.js worker", error);
      throw error;
    }
  }

  /**
   * Process receipt image and extract structured data
   */
  async scanReceipt(imageBuffer: Buffer): Promise<ParsedReceipt> {
    if (!this.isInitialized || !this.worker) {
      await this.initialize();
    }

    try {
      // Preprocess image
      const processedImage = await this.preprocessImage(imageBuffer);

      // Perform OCR
      const { data } = await this.worker!.recognize(processedImage);
      const ocrText = data.text;
      const ocrConfidence = data.confidence / 100; // Convert to 0-1 scale

      this.logger.debug(
        `OCR extracted text (confidence: ${ocrConfidence.toFixed(2)})`
      );
      this.logger.debug(`OCR text preview: ${ocrText.substring(0, 200)}...`);

      // Parse receipt text
      const parsedReceipt = this.receiptParser.parseReceiptText(
        ocrText,
        ocrConfidence
      );

      this.logger.log(
        `Receipt parsed: ${
          parsedReceipt.items.length
        } items, total: $${parsedReceipt.total.toFixed(
          2
        )}, confidence: ${parsedReceipt.confidence.toFixed(2)}`
      );

      return parsedReceipt;
    } catch (error) {
      this.logger.error("Failed to scan receipt", error);
      throw new Error(`OCR processing failed: ${error}`);
    }
  }

  /**
   * Preprocess image to improve OCR accuracy
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      let image = sharp(imageBuffer);

      // Get image metadata
      const metadata = await image.metadata();
      this.logger.debug(
        `Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`
      );

      // Convert to grayscale (improves OCR accuracy)
      image = image.greyscale();

      // Enhance contrast
      image = image.normalise();

      // Resize if too large (OCR works better on reasonable sizes)
      if (metadata.width && metadata.width > 2000) {
        image = image.resize(2000, null, {
          withoutEnlargement: true,
          fit: "inside",
        });
      }

      // Apply sharpening
      image = image.sharpen();

      // Convert to PNG buffer for Tesseract
      const processedBuffer = await image.png().toBuffer();

      this.logger.debug(`Image preprocessing completed`);
      return processedBuffer;
    } catch (error) {
      this.logger.error("Image preprocessing failed", error);
      // Return original buffer if preprocessing fails
      return imageBuffer;
    }
  }

  /**
   * Cleanup worker resources
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.logger.log("Tesseract.js worker terminated");
    }
  }
}
