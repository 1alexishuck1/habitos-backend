-- AlterTable
ALTER TABLE "habits" ADD COLUMN     "category" TEXT;

-- CreateTable
CREATE TABLE "friend_messages" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friend_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "friend_messages_receiver_id_created_at_idx" ON "friend_messages"("receiver_id", "created_at");

-- CreateIndex
CREATE INDEX "friend_messages_sender_id_receiver_id_idx" ON "friend_messages"("sender_id", "receiver_id");

-- AddForeignKey
ALTER TABLE "friend_messages" ADD CONSTRAINT "friend_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_messages" ADD CONSTRAINT "friend_messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
