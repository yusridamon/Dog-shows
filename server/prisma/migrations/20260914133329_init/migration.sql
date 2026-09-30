-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'COMPLETED');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dogs" (
    "id" SERIAL NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "microchip" TEXT,
    "tattoo" TEXT,
    "dnaIdNo" TEXT,
    "dnaProfileNo" TEXT,
    "preQualifications" TEXT,
    "fullName" TEXT NOT NULL,
    "postQualifications" TEXT,
    "group" TEXT,
    "breed" TEXT,
    "type" TEXT,
    "sex" TEXT,
    "colour" TEXT,
    "status" TEXT,
    "country" TEXT,
    "restriction" TEXT,
    "birthDate" TIMESTAMP(3),
    "registerDate" TIMESTAMP(3),
    "transferDate" TIMESTAMP(3),
    "sireRegNo" TEXT,
    "sireFullName" TEXT,
    "damRegNo" TEXT,
    "damFullName" TEXT,
    "breederMemberNo" TEXT,
    "breederName" TEXT,
    "breederPostalAddr" TEXT,
    "breederPostAddr1" TEXT,
    "breederPostAddr2" TEXT,
    "breederPostAddr3" TEXT,
    "breederPostCode" TEXT,
    "breederHomePhone" TEXT,
    "breederEmail" TEXT,
    "ownerMemberNo" TEXT,
    "ownerName" TEXT,
    "ownerPostalAddr" TEXT,
    "ownerPostAddr1" TEXT,
    "ownerPostAddr2" TEXT,
    "ownerPostAddr3" TEXT,
    "ownerPostCode" TEXT,
    "ownerHomePhone" TEXT,
    "ownerEmail" TEXT,
    "externalId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'REGISTRY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shows" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "showDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "show_classes" (
    "id" SERIAL NOT NULL,
    "showId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "minAgeMonths" INTEGER NOT NULL,
    "maxAgeMonths" INTEGER,
    "ccEligible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "rules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "show_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "show_entries" (
    "id" SERIAL NOT NULL,
    "showId" INTEGER NOT NULL,
    "dogId" INTEGER,
    "registrationNumber" TEXT NOT NULL,
    "dogName" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "breed" TEXT,
    "colour" TEXT,
    "qualifications" TEXT,
    "microchip" TEXT,
    "tattoo" TEXT,
    "sireName" TEXT,
    "damName" TEXT,
    "breederName" TEXT,
    "ownerName" TEXT,
    "ownerKusaNo" TEXT,
    "exhibitorName" TEXT NOT NULL,
    "exhibitorEmail" TEXT,
    "exhibitorPhone" TEXT,
    "telNotForPublication" BOOLEAN NOT NULL DEFAULT false,
    "emailNotForPublication" BOOLEAN NOT NULL DEFAULT false,
    "isManualEntry" BOOLEAN NOT NULL DEFAULT false,
    "pedigreeDocPath" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "correctionNote" TEXT,
    "duplicateOverride" BOOLEAN NOT NULL DEFAULT false,
    "classId" INTEGER,
    "catalogueNumber" INTEGER,
    "catalogueCode" TEXT,
    "gradeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "show_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "critiques" (
    "id" SERIAL NOT NULL,
    "showEntryId" INTEGER NOT NULL,
    "judgeName" TEXT NOT NULL,
    "critiqueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "critiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "dogs_registrationNumber_key" ON "dogs"("registrationNumber");

-- CreateIndex
CREATE INDEX "dogs_fullName_idx" ON "dogs"("fullName");

-- CreateIndex
CREATE INDEX "dogs_breed_idx" ON "dogs"("breed");

-- CreateIndex
CREATE UNIQUE INDEX "grades_name_key" ON "grades"("name");

-- CreateIndex
CREATE INDEX "show_entries_showId_status_idx" ON "show_entries"("showId", "status");

-- CreateIndex
CREATE INDEX "show_entries_registrationNumber_idx" ON "show_entries"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "show_entries_showId_sex_catalogueNumber_key" ON "show_entries"("showId", "sex", "catalogueNumber");

-- CreateIndex
CREATE UNIQUE INDEX "critiques_showEntryId_key" ON "critiques"("showEntryId");

-- AddForeignKey
ALTER TABLE "show_classes" ADD CONSTRAINT "show_classes_showId_fkey" FOREIGN KEY ("showId") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_entries" ADD CONSTRAINT "show_entries_showId_fkey" FOREIGN KEY ("showId") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_entries" ADD CONSTRAINT "show_entries_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "dogs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_entries" ADD CONSTRAINT "show_entries_classId_fkey" FOREIGN KEY ("classId") REFERENCES "show_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_entries" ADD CONSTRAINT "show_entries_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "critiques" ADD CONSTRAINT "critiques_showEntryId_fkey" FOREIGN KEY ("showEntryId") REFERENCES "show_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
