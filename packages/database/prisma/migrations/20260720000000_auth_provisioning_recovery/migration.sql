-- Distinguishes incomplete Auth.js user provisioning from active users so a
-- failed provider-account link can be recovered without deleting existing users.
ALTER TABLE "User"
ADD COLUMN "authProvisioning" BOOLEAN NOT NULL DEFAULT false;
