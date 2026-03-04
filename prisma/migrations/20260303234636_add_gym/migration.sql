-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateTable
CREATE TABLE "workout_days" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "id" TEXT NOT NULL,
    "workout_day_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "reps" TEXT NOT NULL DEFAULT '10',
    "weight" DOUBLE PRECISION,
    "notes" TEXT DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workout_days_user_id_day_of_week_key" ON "workout_days"("user_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "workout_days" ADD CONSTRAINT "workout_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_day_id_fkey" FOREIGN KEY ("workout_day_id") REFERENCES "workout_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
