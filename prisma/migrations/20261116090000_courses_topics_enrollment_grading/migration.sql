-- CreateEnum
CREATE TYPE "GradingStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- AlterEnum
ALTER TYPE "ProgressStatus" ADD VALUE 'FAILED';

-- DropIndex
DROP INDEX "Exam_courseId_year_semester_moed_origin_key";

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "hasSolution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "importKey" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "formulas" TEXT[],
ADD COLUMN     "key" TEXT,
ADD COLUMN     "pitfalls" TEXT[],
ADD COLUMN     "summaryHtml" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboarded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Enrollment" (
    "userId" UUID NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("userId","courseId")
);

-- CreateTable
CREATE TABLE "SubQuestionTopic" (
    "subQuestionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "SubQuestionTopic_pkey" PRIMARY KEY ("subQuestionId","topicId")
);

-- CreateTable
CREATE TABLE "PracticeQuestion" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "question" TEXT NOT NULL,
    "hint" TEXT,
    "solution" TEXT,

    CONSTRAINT "PracticeQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionTime" (
    "userId" UUID NOT NULL,
    "questionId" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionTime_pkey" PRIMARY KEY ("userId","questionId")
);

-- CreateTable
CREATE TABLE "Grading" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "examId" TEXT NOT NULL,
    "questionId" TEXT,
    "fileNames" TEXT[],
    "status" "GradingStatus" NOT NULL DEFAULT 'PENDING',
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "reportMd" TEXT,
    "error" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubQuestionTopic_topicId_idx" ON "SubQuestionTopic"("topicId");

-- CreateIndex
CREATE INDEX "Grading_userId_examId_idx" ON "Grading"("userId", "examId");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_importKey_key" ON "Exam"("importKey");

-- CreateIndex
CREATE INDEX "Exam_courseId_idx" ON "Exam"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_courseId_key_key" ON "Topic"("courseId", "key");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubQuestionTopic" ADD CONSTRAINT "SubQuestionTopic_subQuestionId_fkey" FOREIGN KEY ("subQuestionId") REFERENCES "SubQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubQuestionTopic" ADD CONSTRAINT "SubQuestionTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionTime" ADD CONSTRAINT "QuestionTime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionTime" ADD CONSTRAINT "QuestionTime_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grading" ADD CONSTRAINT "Grading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grading" ADD CONSTRAINT "Grading_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grading" ADD CONSTRAINT "Grading_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS on the new tables (Supabase exposes "public" through the Data API)
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubQuestionTopic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PracticeQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuestionTime" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Grading" ENABLE ROW LEVEL SECURITY;
