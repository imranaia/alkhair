CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"branch_id" integer,
	"action" varchar(60) NOT NULL,
	"entity_type" varchar(60),
	"entity_id" integer,
	"before" jsonb,
	"after" jsonb,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_cash_reconciliation" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"recon_date" date NOT NULL,
	"account_name" varchar(60) DEFAULT '' NOT NULL,
	"bank_balance" numeric(14, 2) NOT NULL,
	"cash_balance" numeric(14, 2) NOT NULL,
	"book_balance" numeric(14, 2) NOT NULL,
	"variance" numeric(14, 2) NOT NULL,
	"notes" text,
	"recorded_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(120) NOT NULL,
	"address" text,
	"phone" varchar(30),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "cash_book_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"entry_date" date NOT NULL,
	"code" varchar(20),
	"account_name" varchar(60),
	"details" text,
	"ref_type" varchar(10),
	"ref_number" varchar(30),
	"debit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"running_balance" numeric(14, 2) NOT NULL,
	"recorded_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_defaults" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"defaulted_amount" numeric(14, 2) NOT NULL,
	"defaulted_at" date NOT NULL,
	"reason" text,
	"resolved_at" date,
	"resolution_type" varchar(20),
	"recorded_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_month_sequences" (
	"branch_id" integer NOT NULL,
	"year" smallint NOT NULL,
	"month" smallint NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "client_month_sequences_branch_id_year_month_pk" PRIMARY KEY("branch_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "client_notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"branch_id" integer NOT NULL,
	"message" text NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_sequences" (
	"branch_id" integer PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" varchar(20),
	"client_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"transaction_date" date NOT NULL,
	"loan_disbursement" numeric(14, 2) DEFAULT '0' NOT NULL,
	"loan_recovery" numeric(14, 2) DEFAULT '0' NOT NULL,
	"profit_interest" numeric(14, 2) DEFAULT '0' NOT NULL,
	"service_charge" numeric(14, 2) DEFAULT '0' NOT NULL,
	"new_savings" numeric(14, 2) DEFAULT '0' NOT NULL,
	"savings_recall" numeric(14, 2) DEFAULT '0' NOT NULL,
	"collateral_transfer_in" numeric(14, 2) DEFAULT '0' NOT NULL,
	"collateral_transfer_out" numeric(14, 2) DEFAULT '0' NOT NULL,
	"savings_balance_bf" numeric(14, 2) DEFAULT '0' NOT NULL,
	"savings_balance_cf" numeric(14, 2) DEFAULT '0' NOT NULL,
	"supplementary_override" varchar(20),
	"notes" text,
	"recorded_by" integer NOT NULL,
	"import_row_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_transactions_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_code" varchar(20) NOT NULL,
	"branch_id" integer NOT NULL,
	"group_name" varchar(80),
	"full_name" varchar(150) NOT NULL,
	"phone" varchar(30),
	"address" text,
	"enrollment_week" smallint NOT NULL,
	"enrollment_day" smallint NOT NULL,
	"enrollment_date" date NOT NULL,
	"payment_day" smallint NOT NULL,
	"loan_collector_id" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"business_type" varchar(80),
	"business_location" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_client_code_unique" UNIQUE("client_code")
);
--> statement-breakpoint
CREATE TABLE "duty_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"assignment_date" date NOT NULL,
	"duty_post" varchar(30) NOT NULL,
	"user_id" integer NOT NULL,
	"assigned_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"receipt_ref" varchar(60),
	"expense_date" date NOT NULL,
	"recorded_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"uploaded_by" integer NOT NULL,
	"file_name" varchar(200) NOT NULL,
	"import_type" varchar(20) DEFAULT 'clients' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"success_rows" integer DEFAULT 0 NOT NULL,
	"error_rows" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_batch_id" integer NOT NULL,
	"row_number" integer NOT NULL,
	"raw_data" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_client_id" integer,
	"created_txn_id" integer,
	"created_expense_id" integer,
	"created_cash_book_entry_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"section" varchar(30) NOT NULL,
	"label" varchar(120) NOT NULL,
	"entry_date" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"notes" text,
	"recorded_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"principal_amount" numeric(14, 2) NOT NULL,
	"profit_amount" numeric(14, 2) NOT NULL,
	"total_repayable" numeric(14, 2) NOT NULL,
	"tenure_weeks" integer NOT NULL,
	"installment_amount" numeric(14, 2) NOT NULL,
	"start_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"purpose" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_maturity_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"matured_at" date NOT NULL,
	"renewed" boolean DEFAULT false NOT NULL,
	"amount_with_client" numeric(14, 2),
	"notes" text,
	"recorded_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(40) NOT NULL,
	"label" varchar(80) NOT NULL,
	"icon" varchar(40),
	"route_prefix" varchar(80) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "modules_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "payment_sequences" (
	"branch_id" integer PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"entity_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"proposed_changes" jsonb NOT NULL,
	"requested_by" integer NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"review_note" text
);
--> statement-breakpoint
CREATE TABLE "pre_disbursement_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"nickname" varchar(120),
	"nin" varchar(20),
	"neighbor_relative_phone" varchar(30),
	"shop_owner" boolean DEFAULT false NOT NULL,
	"renting_shop" boolean DEFAULT false NOT NULL,
	"gps_photo_verified" boolean DEFAULT false NOT NULL,
	"gps_time_verified" boolean DEFAULT false NOT NULL,
	"amount_applied" numeric(14, 2),
	"recommended_amount" numeric(14, 2),
	"amount_approved" numeric(14, 2),
	"client_type" varchar(20) DEFAULT 'new' NOT NULL,
	"preferred_tenure_months" integer,
	"type_of_business" varchar(80),
	"experience_years" integer,
	"application_form_filled" boolean DEFAULT false NOT NULL,
	"customer_type" varchar(20),
	"appraisal_report_attached" boolean DEFAULT false NOT NULL,
	"supervision_report_attached" boolean,
	"loan_amount_reviewed" boolean,
	"stock_availability_checked" boolean DEFAULT false NOT NULL,
	"bank_details" text,
	"officer_name" varchar(120) NOT NULL,
	"recorded_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(40) NOT NULL,
	"name" varchar(80) NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(60) NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"phone" varchar(30),
	"role_id" integer NOT NULL,
	"branch_id" integer,
	"client_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"failed_login_attempts" smallint DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_by" integer,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_cash_reconciliation" ADD CONSTRAINT "bank_cash_reconciliation_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_cash_reconciliation" ADD CONSTRAINT "bank_cash_reconciliation_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_book_entries" ADD CONSTRAINT "cash_book_entries_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_book_entries" ADD CONSTRAINT "cash_book_entries_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_defaults" ADD CONSTRAINT "client_defaults_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_defaults" ADD CONSTRAINT "client_defaults_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_defaults" ADD CONSTRAINT "client_defaults_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_month_sequences" ADD CONSTRAINT "client_month_sequences_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notices" ADD CONSTRAINT "client_notices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notices" ADD CONSTRAINT "client_notices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notices" ADD CONSTRAINT "client_notices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_sequences" ADD CONSTRAINT "client_sequences_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_transactions" ADD CONSTRAINT "client_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_transactions" ADD CONSTRAINT "client_transactions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_transactions" ADD CONSTRAINT "client_transactions_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_transactions" ADD CONSTRAINT "client_transactions_import_row_id_import_rows_id_fk" FOREIGN KEY ("import_row_id") REFERENCES "public"."import_rows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_loan_collector_id_users_id_fk" FOREIGN KEY ("loan_collector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duty_assignments" ADD CONSTRAINT "duty_assignments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duty_assignments" ADD CONSTRAINT "duty_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duty_assignments" ADD CONSTRAINT "duty_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_created_client_id_clients_id_fk" FOREIGN KEY ("created_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD CONSTRAINT "loan_agreements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD CONSTRAINT "loan_agreements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_agreements" ADD CONSTRAINT "loan_agreements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_maturity_events" ADD CONSTRAINT "loan_maturity_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_maturity_events" ADD CONSTRAINT "loan_maturity_events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_maturity_events" ADD CONSTRAINT "loan_maturity_events_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_sequences" ADD CONSTRAINT "payment_sequences_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_changes" ADD CONSTRAINT "pending_changes_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_changes" ADD CONSTRAINT "pending_changes_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_changes" ADD CONSTRAINT "pending_changes_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_disbursement_checklists" ADD CONSTRAINT "pre_disbursement_checklists_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_disbursement_checklists" ADD CONSTRAINT "pre_disbursement_checklists_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_disbursement_checklists" ADD CONSTRAINT "pre_disbursement_checklists_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branch_recon_date_unique" ON "bank_cash_reconciliation" USING btree ("branch_id","recon_date","account_name");--> statement-breakpoint
CREATE INDEX "idx_client_notices_client" ON "client_notices" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_txn_date_unique" ON "client_transactions" USING btree ("client_id","transaction_date");--> statement-breakpoint
CREATE INDEX "idx_txn_branch_date" ON "client_transactions" USING btree ("branch_id","transaction_date");--> statement-breakpoint
CREATE INDEX "idx_clients_branch" ON "clients" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "duty_branch_date_post_unique" ON "duty_assignments" USING btree ("branch_id","assignment_date","duty_post");--> statement-breakpoint
CREATE INDEX "idx_expenses_branch_date" ON "expenses" USING btree ("branch_id","expense_date");--> statement-breakpoint
CREATE INDEX "idx_ledger_branch_date" ON "ledger_entries" USING btree ("branch_id","entry_date");--> statement-breakpoint
CREATE INDEX "idx_loan_agreements_client" ON "loan_agreements" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_pending_changes_status" ON "pending_changes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_checklists_client" ON "pre_disbursement_checklists" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_module_unique" ON "role_permissions" USING btree ("role_id","module_id");