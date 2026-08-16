-- CreateTable
CREATE TABLE "WorkplaceLocation" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 150,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkplaceLocation_pkey" PRIMARY KEY ("id")
);
