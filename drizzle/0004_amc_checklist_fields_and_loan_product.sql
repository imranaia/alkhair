ALTER TABLE "clients" ADD COLUMN "nickname" varchar(120);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "nin" varchar(20);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "neighbor_relative_phone" varchar(30);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "shop_owner" boolean;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "renting_shop" boolean;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "gps_photo_verified" boolean;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "gps_time_verified" boolean;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "experience_years" integer;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "customer_type" varchar(20);--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD COLUMN "product" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD COLUMN "amount_applied" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD COLUMN "recommended_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD COLUMN "application_form_filled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD COLUMN "appraisal_report_attached" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD COLUMN "supervision_report_attached" boolean;--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD COLUMN "loan_amount_reviewed" boolean;--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD COLUMN "stock_availability_checked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD COLUMN "bank_details" text;