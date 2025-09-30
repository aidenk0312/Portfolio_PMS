-- DropForeignKey
ALTER TABLE "public"."Issue" DROP CONSTRAINT "Issue_columnId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Issue" ADD CONSTRAINT "Issue_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "public"."BoardColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
