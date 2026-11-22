-- CreateTable
CREATE TABLE "QuestionRepeat" (
    "questionId" TEXT NOT NULL,
    "otherId" TEXT NOT NULL,
    "sameParts" INTEGER NOT NULL,
    "totalParts" INTEGER NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "QuestionRepeat_pkey" PRIMARY KEY ("questionId","otherId")
);

-- AddForeignKey
ALTER TABLE "QuestionRepeat" ADD CONSTRAINT "QuestionRepeat_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionRepeat" ADD CONSTRAINT "QuestionRepeat_otherId_fkey" FOREIGN KEY ("otherId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes "public" through the Data API
ALTER TABLE "QuestionRepeat" ENABLE ROW LEVEL SECURITY;
