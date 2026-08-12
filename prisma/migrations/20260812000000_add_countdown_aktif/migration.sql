-- Add countdownAktif flag: gates the public "Coming Soon" landing page.
-- Defaults to false so the site stays on Coming Soon until an admin
-- explicitly activates the launch countdown from Pengaturan.
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "countdownAktif" BOOLEAN NOT NULL DEFAULT false;
