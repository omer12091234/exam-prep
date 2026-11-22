-- CreateEnum
CREATE TYPE "ExamKind" AS ENUM ('EXAM', 'SHEET');

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "kind" "ExamKind" NOT NULL DEFAULT 'EXAM',
ADD COLUMN     "sheetNumber" INTEGER;

