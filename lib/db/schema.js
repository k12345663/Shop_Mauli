const { pgTable, serial, text, numeric, timestamp, boolean, pgEnum, uuid, date, integer, unique } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const { relations } = require('drizzle-orm');

const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    email: text('email').unique(),
    password: text('password'), // Hashed
    fullName: text('full_name').notNull().default(''),
    role: text('role').notNull().default('collector'),
    isApproved: boolean('is_approved').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
});

const complexes = pgTable('complexes', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
});

const shops = pgTable('shops', {
    id: serial('id').primaryKey(),
    shopNo: text('shop_no').notNull(),
    complexId: integer('complex_id').references(() => complexes.id),
    category: text('category').default('Numeric'),
    rentAmount: numeric('rent_amount', { precision: 10, scale: 2 }).notNull().default('0'),
    rentCollectionDay: integer('rent_collection_day').notNull().default(1),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
    unqShopComplex: unique().on(t.shopNo, t.complexId),
}));

const settings = pgTable('settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

const renters = pgTable('renters', {
    id: serial('id').primaryKey(),
    renterCode: text('renter_code').unique().notNull(),
    name: text('name').notNull(),
    phone: text('phone').default(''),
    createdAt: timestamp('created_at').defaultNow(),
});

const renterShops = pgTable('renter_shops', {
    id: serial('id').primaryKey(),
    renterId: integer('renter_id').notNull().references(() => renters.id, { onDelete: 'cascade' }),
    shopId: integer('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    expectedDeposit: numeric('expected_deposit', { precision: 10, scale: 2 }).default('0'),
    depositAmount: numeric('deposit_amount', { precision: 10, scale: 2 }).default('0'), // Collected deposit
    depositDate: date('deposit_date'),
    depositRemarks: text('deposit_remarks').default(''),
}, (t) => ({
    unq: unique().on(t.renterId, t.shopId),
}));

const rentPayments = pgTable('rent_payments', {
    id: serial('id').primaryKey(),
    renterId: integer('renter_id').notNull().references(() => renters.id, { onDelete: 'cascade' }),
    collectorUserId: uuid('collector_user_id'),
    periodMonth: text('period_month').notNull(),
    expectedAmount: numeric('expected_amount', { precision: 10, scale: 2 }).notNull().default('0'),
    receivedAmount: numeric('received_amount', { precision: 10, scale: 2 }).notNull().default('0'),
    status: text('status').notNull(),
    paymentMode: text('payment_mode').default('cash'),
    notes: text('notes').default(''),
    collectionDate: date('collection_date').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
    unq: unique().on(t.renterId, t.periodMonth),
}));

// NextAuth Tables
const users = pgTable('user', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: text('name'),
    email: text('email').notNull().unique(),
    emailVerified: timestamp('emailVerified', { mode: 'date' }),
    image: text('image'),
});

const accounts = pgTable('account', {
    userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
}, (account) => ({
    compoundKey: unique().on(account.provider, account.providerAccountId),
}));

const sessions = pgTable('session', {
    sessionToken: text('sessionToken').notNull().primaryKey(),
    userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// --- Drizzle Relations (needed for db.query API) ---

const profilesRelations = relations(profiles, ({ many }) => ({
}));

const rentersRelations = relations(renters, ({ many }) => ({
    renterShops: many(renterShops),
    rentPayments: many(rentPayments),
}));

const shopsRelations = relations(shops, ({ one, many }) => ({
    complexes: one(complexes, { fields: [shops.complexId], references: [complexes.id] }),
    renterShops: many(renterShops),
}));

const complexesRelations = relations(complexes, ({ many }) => ({
    shops: many(shops),
}));

const renterShopsRelations = relations(renterShops, ({ one }) => ({
    renters: one(renters, { fields: [renterShops.renterId], references: [renters.id] }),
    shops: one(shops, { fields: [renterShops.shopId], references: [shops.id] }),
}));

const rentPaymentsRelations = relations(rentPayments, ({ one }) => ({
    renters: one(renters, { fields: [rentPayments.renterId], references: [renters.id] }),
    collector: one(profiles, { fields: [rentPayments.collectorUserId], references: [profiles.id] }),
}));

module.exports = {
    profiles, shops, complexes, settings, renters, renterShops, rentPayments, users, accounts, sessions,
    profilesRelations, rentersRelations, shopsRelations, complexesRelations, renterShopsRelations, rentPaymentsRelations,
};
