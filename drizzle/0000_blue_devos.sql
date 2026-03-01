CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"password" text,
	"full_name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'collector' NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_no" text NOT NULL,
	"complex_id" integer,
	"category" text DEFAULT 'Numeric',
	"rent_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"rent_collection_day" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "shops_shop_no_complex_id_unique" UNIQUE("shop_no","complex_id")
);
--> statement-breakpoint
CREATE TABLE "complexes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "renters" (
	"id" serial PRIMARY KEY NOT NULL,
	"renter_code" text NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "renters_renter_code_unique" UNIQUE("renter_code")
);
--> statement-breakpoint
CREATE TABLE "renter_shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"renter_id" integer NOT NULL,
	"shop_id" integer NOT NULL,
	"expected_deposit" numeric(10, 2) DEFAULT '0',
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"deposit_date" date,
	"deposit_remarks" text DEFAULT '',
	CONSTRAINT "renter_shops_renter_id_shop_id_unique" UNIQUE("renter_id","shop_id")
);
--> statement-breakpoint
CREATE TABLE "rent_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"renter_id" integer NOT NULL,
	"collector_user_id" uuid,
	"period_month" text NOT NULL,
	"expected_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"received_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text NOT NULL,
	"payment_mode" text DEFAULT 'cash',
	"notes" text DEFAULT '',
	"collection_date" date DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "rent_payments_renter_id_period_month_unique" UNIQUE("renter_id","period_month")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_unique" UNIQUE("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_complex_id_complexes_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renter_shops" ADD CONSTRAINT "renter_shops_renter_id_renters_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."renters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renter_shops" ADD CONSTRAINT "renter_shops_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_payments" ADD CONSTRAINT "rent_payments_renter_id_renters_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."renters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;