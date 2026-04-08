// NOTE: This project relies on the generated Prisma client in `node_modules/.prisma/client`.
// Importing from there avoids mismatches when `@prisma/client` is missing its `.prisma` folder
// (a common issue on Windows when the query engine file is locked).
import { PrismaClient } from "../../node_modules/.prisma/client/index.js";
import type { PrismaClient as PrismaClientType } from "../../node_modules/.prisma/client/index.d.ts";

export const prisma = new PrismaClient() as PrismaClientType;
