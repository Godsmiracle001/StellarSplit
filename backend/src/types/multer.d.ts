// src/types/multer.d.ts
export interface MulterFile {
  /** Field name specified in the form */
  fieldname: string;
  /** Name of the file on the user's computer */
  originalname: string;
  /** Encoding type */
  encoding: string;
  /** Mime type of the file */
  mimetype: string;
  /** Size of the file in bytes */
  size: number;
  /** A Buffer of the entire file (MemoryStorage) */
  buffer?: Buffer;
  /** Path to the uploaded file (DiskStorage) */
  path?: string;
}
