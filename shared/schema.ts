import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  password: varchar("password").notNull(),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("student"), // "admin" or "student"
  studentId: varchar("student_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contests = pgTable("contests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  duration: integer("duration_minutes").notNull(),
  isActive: boolean("is_active").default(false),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const problems = pgTable("problems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contestId: varchar("contest_id").notNull().references(() => contests.id),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  difficulty: varchar("difficulty").notNull(), // "easy", "medium", "hard"
  points: integer("points").notNull(),
  timeLimit: integer("time_limit_ms").notNull().default(5000),
  memoryLimit: integer("memory_limit_mb").notNull().default(256),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const testCases = pgTable("test_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  problemId: varchar("problem_id").notNull().references(() => problems.id),
  input: text("input").notNull(),
  expectedOutput: text("expected_output").notNull(),
  isVisible: boolean("is_visible").notNull().default(false),
  points: integer("points").notNull().default(0),
  orderIndex: integer("order_index").notNull(),
});

export const mcqQuestions = pgTable("mcq_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contestId: varchar("contest_id").notNull().references(() => contests.id),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // Array of option objects
  correctAnswers: jsonb("correct_answers").notNull(), // Array of correct option indices
  isMultipleChoice: boolean("is_multiple_choice").default(false),
  points: integer("points").notNull(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  problemId: varchar("problem_id").references(() => problems.id),
  mcqQuestionId: varchar("mcq_question_id").references(() => mcqQuestions.id),
  contestId: varchar("contest_id").notNull().references(() => contests.id),
  code: text("code"), // For coding problems
  language: varchar("language"), // For coding problems
  selectedAnswers: jsonb("selected_answers"), // For MCQ questions
  status: varchar("status").notNull(), // "pending", "accepted", "wrong_answer", "time_limit_exceeded", etc.
  score: integer("score").default(0),
  executionTime: integer("execution_time_ms"),
  memoryUsage: integer("memory_usage_mb"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const contestParticipants = pgTable("contest_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contestId: varchar("contest_id").notNull().references(() => contests.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  totalScore: integer("total_score").default(0),
  tabSwitches: integer("tab_switches").default(0),
  isDisqualified: boolean("is_disqualified").default(false),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  contests: many(contests),
  submissions: many(submissions),
  participations: many(contestParticipants),
}));

export const contestsRelations = relations(contests, ({ one, many }) => ({
  creator: one(users, {
    fields: [contests.createdBy],
    references: [users.id],
  }),
  problems: many(problems),
  mcqQuestions: many(mcqQuestions),
  participants: many(contestParticipants),
  submissions: many(submissions),
}));

export const problemsRelations = relations(problems, ({ one, many }) => ({
  contest: one(contests, {
    fields: [problems.contestId],
    references: [contests.id],
  }),
  testCases: many(testCases),
  submissions: many(submissions),
}));

export const testCasesRelations = relations(testCases, ({ one }) => ({
  problem: one(problems, {
    fields: [testCases.problemId],
    references: [problems.id],
  }),
}));

export const mcqQuestionsRelations = relations(mcqQuestions, ({ one, many }) => ({
  contest: one(contests, {
    fields: [mcqQuestions.contestId],
    references: [contests.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
  problem: one(problems, {
    fields: [submissions.problemId],
    references: [problems.id],
  }),
  mcqQuestion: one(mcqQuestions, {
    fields: [submissions.mcqQuestionId],
    references: [mcqQuestions.id],
  }),
  contest: one(contests, {
    fields: [submissions.contestId],
    references: [contests.id],
  }),
}));

export const contestParticipantsRelations = relations(contestParticipants, ({ one }) => ({
  contest: one(contests, {
    fields: [contestParticipants.contestId],
    references: [contests.id],
  }),
  user: one(users, {
    fields: [contestParticipants.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContestSchema = createInsertSchema(contests).omit({
  id: true,
  createdAt: true,
});

export const insertProblemSchema = createInsertSchema(problems).omit({
  id: true,
  createdAt: true,
});

export const insertTestCaseSchema = createInsertSchema(testCases).omit({
  id: true,
});

export const insertMcqQuestionSchema = createInsertSchema(mcqQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
});

export const insertContestParticipantSchema = createInsertSchema(contestParticipants).omit({
  id: true,
  joinedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Contest = typeof contests.$inferSelect;
export type InsertContest = z.infer<typeof insertContestSchema>;
export type Problem = typeof problems.$inferSelect;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type TestCase = typeof testCases.$inferSelect;
export type InsertTestCase = z.infer<typeof insertTestCaseSchema>;
export type McqQuestion = typeof mcqQuestions.$inferSelect;
export type InsertMcqQuestion = z.infer<typeof insertMcqQuestionSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type ContestParticipant = typeof contestParticipants.$inferSelect;
export type InsertContestParticipant = z.infer<typeof insertContestParticipantSchema>;
