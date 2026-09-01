ALTER TABLE "loan_agreements" ALTER COLUMN "loan_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_agreements" ALTER COLUMN "payment_day" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "payment_day";--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD CONSTRAINT "loan_agreements_loan_id_unique" UNIQUE("loan_id");