-- CreateTable
CREATE TABLE "daily_reflections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "mood" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reflections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_reflections_user_id_date_idx" ON "daily_reflections"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reflections_user_id_date_key" ON "daily_reflections"("user_id", "date");

-- AddForeignKey
ALTER TABLE "daily_reflections" ADD CONSTRAINT "daily_reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
