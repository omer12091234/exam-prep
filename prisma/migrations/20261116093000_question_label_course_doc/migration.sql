-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "label" TEXT;

-- CreateTable
CREATE TABLE "CourseDoc" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "sourceUrl" TEXT,
    "html" TEXT NOT NULL,

    CONSTRAINT "CourseDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseDoc_courseId_key_key" ON "CourseDoc"("courseId", "key");

-- AddForeignKey
ALTER TABLE "CourseDoc" ADD CONSTRAINT "CourseDoc_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseDoc" ENABLE ROW LEVEL SECURITY;
