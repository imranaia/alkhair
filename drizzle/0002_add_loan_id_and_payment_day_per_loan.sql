CREATE TABLE "client_loan_sequences" (
	"client_id" integer PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_weekday_sequences" (
	"branch_id" integer NOT NULL,
	"weekday" smallint NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "client_weekday_sequences_branch_id_weekday_pk" PRIMARY KEY("branch_id","weekday")
);
--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD COLUMN "loan_id" varchar(40);--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD COLUMN "payment_day" smallint;--> statement-breakpoint
ALTER TABLE "client_loan_sequences" ADD CONSTRAINT "client_loan_sequences_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_weekday_sequences" ADD CONSTRAINT "client_weekday_sequences_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;