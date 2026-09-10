import { relations } from "drizzle-orm/relations";
import { profiles, expenses, groups, groupMembers, expenseSplits, monthlySettlements, memberMonthlyStatus, memberMonthlyExclusions, friends } from "./schema";

export const profilesRelations = relations(profiles, ({many}) => ({
	shadowProfiles: many(profiles, { relationName: 'shadowCreator' }),
	sentFriendRequests: many(friends, { relationName: 'friendUser' }),
	receivedFriendRequests: many(friends, { relationName: 'friendTarget' }),
}));

export const expensesRelations = relations(expenses, ({many}) => ({
	expenseSplits: many(expenseSplits),
}));

export const groupsRelations = relations(groups, ({many}) => ({
	groupMembers: many(groupMembers),
	monthlySettlements: many(monthlySettlements),
	memberMonthlyExclusions: many(memberMonthlyExclusions),
}));

export const groupMembersRelations = relations(groupMembers, ({one}) => ({
	group: one(groups, {
		fields: [groupMembers.groupId],
		references: [groups.id]
	}),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({one}) => ({
	expense: one(expenses, {
		fields: [expenseSplits.expenseId],
		references: [expenses.id]
	}),
}));

export const monthlySettlementsRelations = relations(monthlySettlements, ({one, many}) => ({
	group: one(groups, {
		fields: [monthlySettlements.groupId],
		references: [groups.id]
	}),
	memberStatuses: many(memberMonthlyStatus),
}));

export const memberMonthlyStatusRelations = relations(memberMonthlyStatus, ({one}) => ({
	settlement: one(monthlySettlements, {
		fields: [memberMonthlyStatus.settlementId],
		references: [monthlySettlements.id]
	}),
}));

export const memberMonthlyExclusionsRelations = relations(memberMonthlyExclusions, ({one}) => ({
	group: one(groups, {
		fields: [memberMonthlyExclusions.groupId],
		references: [groups.id]
	}),
}));

export const friendsRelations = relations(friends, ({one}) => ({
	user: one(profiles, {
		fields: [friends.userId],
		references: [profiles.userId],
		relationName: 'friendUser',
	}),
	friend: one(profiles, {
		fields: [friends.friendId],
		references: [profiles.userId],
		relationName: 'friendTarget',
	}),
}));