import { pgTable, foreignKey, unique, pgPolicy, uuid, text, timestamp, index, check, numeric, date, boolean, integer, AnyPgColumn } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const profiles = pgTable("profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	displayName: text("display_name"),
	avatarUrl: text("avatar_url"),
	email: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isShadow: boolean("is_shadow").default(false).notNull(),
	shadowCreatedBy: uuid("shadow_created_by").references((): AnyPgColumn => profiles.userId),
}, (table) => [
	unique("profiles_user_id_key").on(table.userId),
	pgPolicy("Users can view their own profile", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can view profiles of group members", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Users can insert their own profile", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Users can update their own profile", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("Users can view shadow profiles they created", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(is_shadow = true AND shadow_created_by = auth.uid())` }),
	pgPolicy("Users can insert shadow profiles", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(is_shadow = true AND shadow_created_by = auth.uid())` }),
]);

export const expenses = pgTable("expenses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	category: text().notNull(),
	note: text(),
	expenseDate: date("expense_date").default(sql`CURRENT_DATE`).notNull(),
	groupId: uuid("group_id"),
	paidBy: uuid("paid_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	editedAt: timestamp("edited_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_expenses_user_category").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.category.asc().nullsLast().op("uuid_ops")),
	index("idx_expenses_user_date").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.expenseDate.desc().nullsFirst().op("date_ops")),
	pgPolicy("Group members can create group expenses", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`((group_id IS NOT NULL) AND (user_id = auth.uid()) AND public.is_group_member(group_id, auth.uid()))`  }),
	pgPolicy("Users can update their own expenses", { as: "permissive", for: "update", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can delete their own expenses", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can view their own expenses", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Group members can view group expenses", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Users involved in splits can view non-group expenses", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(group_id IS NULL AND public.is_involved_in_expense(id, auth.uid()))` }),
	pgPolicy("Users can create their own expenses", { as: "permissive", for: "insert", to: ["authenticated"] }),
	check("expenses_amount_check", sql`amount > (0)::numeric`),
]);

export const groups = pgTable("groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	type: text().default('day_to_day').notNull(),
	monthlyRent: numeric("monthly_rent", { precision: 10, scale: 2 }).default('0.00'),
}, (table) => [
	pgPolicy("Members can view their groups", { as: "permissive", for: "select", to: ["authenticated"], using: sql`public.is_group_member(id, auth.uid())` }),
	pgPolicy("Authenticated users can create groups", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Creator can update their groups", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("Creator can delete their groups", { as: "permissive", for: "delete", to: ["authenticated"] }),
]);

export const groupMembers = pgTable("group_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupId: uuid("group_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: text().default('member').notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "group_members_group_id_fkey"
		}).onDelete("cascade"),
	unique("group_members_group_id_user_id_key").on(table.groupId, table.userId),
	pgPolicy("Members can view group members", { as: "permissive", for: "select", to: ["authenticated"], using: sql`public.is_group_member(group_id, auth.uid())` }),
	pgPolicy("Group admin can add members", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Group admin can remove members", { as: "permissive", for: "delete", to: ["authenticated"] }),
]);

export const expenseSplits = pgTable("expense_splits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	expenseId: uuid("expense_id").notNull(),
	userId: uuid("user_id").notNull(),
	amount: numeric().notNull(),
	isSettled: boolean("is_settled").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.expenseId],
			foreignColumns: [expenses.id],
			name: "expense_splits_expense_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Group members can view expense splits", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM expenses e
  WHERE ((e.id = expense_splits.expense_id) AND (e.group_id IS NOT NULL) AND public.is_group_member(e.group_id, auth.uid()))))` }),
	pgPolicy("Users can view non-group expense splits", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(EXISTS (
		SELECT 1 FROM expenses e
		WHERE e.id = expense_splits.expense_id
		  AND e.group_id IS NULL
	  ) AND public.is_involved_in_expense(expense_id, auth.uid()))` }),
	pgPolicy("Expense creator can insert splits", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Expense creator can delete splits", { as: "permissive", for: "delete", to: ["authenticated"] }),
	pgPolicy("Group members can update their splits", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const monthlySettlements = pgTable("monthly_settlements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupId: uuid("group_id").notNull(),
	month: integer().notNull(),
	year: integer().notNull(),
	status: text().default('open').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "monthly_settlements_group_id_fkey"
		}).onDelete("cascade"),
	unique("monthly_settlements_group_id_month_year_key").on(table.groupId, table.month, table.year),
	check("monthly_settlements_month_check", sql`month >= 1 AND month <= 12`),
	check("monthly_settlements_status_check", sql`status IN ('open', 'locked')`),
	pgPolicy("Users can view monthly settlements for their groups", { as: "permissive", for: "select", to: ["authenticated"], using: sql`public.is_group_member(group_id, auth.uid())` }),
	pgPolicy("Users can insert monthly settlements for their groups", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`public.is_group_member(group_id, auth.uid())` }),
	pgPolicy("Users can update monthly settlements for their groups", { as: "permissive", for: "update", to: ["authenticated"], using: sql`public.is_group_member(group_id, auth.uid())` }),
]);

export const memberMonthlyStatus = pgTable("member_monthly_status", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	settlementId: uuid("settlement_id").notNull(),
	userId: uuid("user_id").notNull(),
	status: text().default('complete').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.settlementId],
			foreignColumns: [monthlySettlements.id],
			name: "member_monthly_status_settlement_id_fkey"
		}).onDelete("cascade"),
	unique("member_monthly_status_settlement_id_user_id_key").on(table.settlementId, table.userId),
	check("member_monthly_status_status_check", sql`status IN ('complete')`),
	pgPolicy("Users can view member status for their groups", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Users can insert their own member status", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Users can delete their own member status", { as: "permissive", for: "delete", to: ["authenticated"] }),
]);

export const memberMonthlyExclusions = pgTable("member_monthly_exclusions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupId: uuid("group_id").notNull(),
	userId: uuid("user_id").notNull(),
	month: integer().notNull(),
	year: integer().notNull(),
	exclusionType: text("exclusion_type").default('partial').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "member_monthly_exclusions_group_id_fkey"
		}).onDelete("cascade"),
	unique("member_monthly_exclusions_group_id_user_id_month_year_key").on(table.groupId, table.userId, table.month, table.year),
	check("member_monthly_exclusions_month_check", sql`month >= 1 AND month <= 12`),
	check("member_monthly_exclusions_year_check", sql`year >= 2020`),
	check("member_monthly_exclusions_type_check", sql`exclusion_type IN ('partial', 'full')`),
	pgPolicy("Group members can view exclusions", { as: "permissive", for: "select", to: ["authenticated"], using: sql`EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = member_monthly_exclusions.group_id AND gm.user_id = auth.uid())` }),
	pgPolicy("Group members can insert exclusions", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())` }),
	pgPolicy("Group members can update exclusions", { as: "permissive", for: "update", to: ["authenticated"], using: sql`EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())` }),
	pgPolicy("Group members can delete exclusions", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())` }),
]);


export const friends = pgTable("friends", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	friendId: uuid("friend_id").notNull(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("friends_user_id_friend_id_key").on(table.userId, table.friendId),
	check("friends_status_check", sql`status IN ('pending', 'accepted', 'rejected')`),
	check("friends_no_self_add_check", sql`user_id <> friend_id`),
	pgPolicy("Users can view their own friend records", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid() OR friend_id = auth.uid())` }),
	pgPolicy("Users can insert friend requests", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can update friend requests sent to them", { as: "permissive", for: "update", to: ["authenticated"], using: sql`(friend_id = auth.uid())` }),
	pgPolicy("Users can delete their own friend records", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(user_id = auth.uid() OR friend_id = auth.uid())` }),
]);

export const userCategories = pgTable("user_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	colorIndex: integer("color_index").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("user_categories_user_id_slug_key").on(table.userId, table.slug),
	pgPolicy("Users can view own categories", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own categories", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can delete own categories", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
]);
