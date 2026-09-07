-- CreateTable
CREATE TABLE "AdminPushToken" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminPushToken_token_key" ON "AdminPushToken"("token");

-- CreateIndex
CREATE INDEX "AdminPushToken_adminId_idx" ON "AdminPushToken"("adminId");

-- AddForeignKey
ALTER TABLE "AdminPushToken" ADD CONSTRAINT "AdminPushToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
