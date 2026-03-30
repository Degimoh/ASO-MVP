-- CreateTable
CREATE TABLE "ProjectScreenshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenshotCreative" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "screenshotId" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "headline" TEXT,
    "subheadline" TEXT,
    "storagePath" TEXT,
    "width" INTEGER NOT NULL DEFAULT 1284,
    "height" INTEGER NOT NULL DEFAULT 2778,
    "creditsCharged" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreenshotCreative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectScreenshot_projectId_createdAt_idx" ON "ProjectScreenshot"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ScreenshotCreative_projectId_generatedAt_idx" ON "ScreenshotCreative"("projectId", "generatedAt");

-- CreateIndex
CREATE INDEX "ScreenshotCreative_screenshotId_generatedAt_idx" ON "ScreenshotCreative"("screenshotId", "generatedAt");

-- AddForeignKey
ALTER TABLE "ProjectScreenshot" ADD CONSTRAINT "ProjectScreenshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenshotCreative" ADD CONSTRAINT "ScreenshotCreative_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenshotCreative" ADD CONSTRAINT "ScreenshotCreative_screenshotId_fkey" FOREIGN KEY ("screenshotId") REFERENCES "ProjectScreenshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
