-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "githubClientId" TEXT,
ADD COLUMN     "githubClientSecret" TEXT,
ADD COLUMN     "googleClientId" TEXT,
ADD COLUMN     "googleClientSecret" TEXT,
ADD COLUMN     "googleRedirectUri" TEXT;
