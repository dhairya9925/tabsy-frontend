import { apiClient } from "@/lib/apiClient";
import { splitEqual } from './money';

const CATCHY_EXPENSES = [
  { note: "Dinner at Luigi's", category: "food", amount: 145.5 },
  { note: "Weekend Groceries", category: "food", amount: 89.2 },
  { note: "Movie Tickets", category: "other", amount: 45.0 },
  { note: "Uber to Airport", category: "transport", amount: 35.0 },
  { note: "AirBnb Split", category: "transport", amount: 450.0 },
  { note: "Monthly Internet", category: "bills", amount: 60.0 },
  { note: "Concert Tickets", category: "other", amount: 120.0 },
  { note: "Coffee Runs", category: "food", amount: 24.5 },
];

const GROUP_NAMES = [
  "Roommates 🏠",
  "Trip to Bali 🌴",
  "Weekend Getaway 🚗",
  "Office Lunch Gang 🍱",
];

export const generateSampleData = async (userId: string, groupId: string) => {
  try {
    // Fetch group members to create meaningful splits
    const res = await apiClient.get<Array<{ user_id: string }>>(`/api/v1/groups/${groupId}/members`);
    const members = res.data ?? [];

    const groupMembers = members && members.length > 0 ? members : [{ user_id: userId }];
    let successCount = 0;

    // Generate Expenses for this specific group via FastAPI
    for (let i = 0; i < 6; i++) {
      const expenseTemplate = CATCHY_EXPENSES[Math.floor(Math.random() * CATCHY_EXPENSES.length)];
      
      // Random date within the last 30 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));

      // Create equal splits for all group members
      const amounts = splitEqual(expenseTemplate.amount, groupMembers.length);
      const splits = groupMembers.map((member, idx) => ({
        user_id: member.user_id,
        amount: amounts[idx],
      }));

      const { error: expenseError } = await apiClient.post(
        `/api/v1/groups/${groupId}/expenses`,
        {
          amount: expenseTemplate.amount,
          category: expenseTemplate.category,
          note: expenseTemplate.note,
          expense_date: date.toISOString().split('T')[0],
          splits,
        }
      );

      if (expenseError) {
        console.error(`Expense insert failed (iteration ${i}):`, expenseError);
        continue; // Skip this one instead of failing entirely
      }

      successCount++;
    }

    return { success: successCount > 0 };
  } catch (error) {
    console.error("Error generating sample data:", error);
    return { success: false, error };
  }
};
